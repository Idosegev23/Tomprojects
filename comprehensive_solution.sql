-- פתרון מקיף לבעיית אתחול טבלאות פרויקט ומשימות נבחרות
-- השינויים העיקריים:
-- 1. תיקון פונקציית init_project_tables_and_data לטיפול נכון בהעדפות משימות
-- 2. תיקון טריגר project_after_insert_trigger לא ליצור משימות ברירת מחדל, רק שלבים
-- 3. הוספת פונקציה חדשה שמאפשרת קריאה נוחה להעתקת משימות נבחרות לפרויקט
-- 4. שינוי פונקציית copy_tasks_to_project_table לתמיכה טובה יותר במערכים

-- ======= 1. תיקון פונקציית init_project_tables_and_data =======
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- יומן מפורט יותר לצורכי דיבוג
  RAISE NOTICE 'Starting init_project_tables_and_data for project %', project_id_param;
  RAISE NOTICE 'Parameters: create_default_stages=%, create_default_tasks=%, has_selected_tasks=%', 
               create_default_stages, create_default_tasks, has_selected_tasks;
  
  -- 1. וודא שטבלאות הפרויקט קיימות
  PERFORM create_project_table(project_id_param);
  PERFORM create_project_stages_table(project_id_param);
  
  -- 2. העתק שלבים (אם ביקשו)
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. טיפול במשימות
  IF has_selected_tasks THEN
    -- יש משימות נבחרות - נעתיק רק אותן
    RAISE NOTICE 'העתקת % משימות נבחרות לפרויקט %', array_length(selected_task_ids, 1), project_id_param;
    
    -- נשתמש בפונקציה שמטפלת במערך שלם של משימות ביעילות
    PERFORM copy_tasks_to_project_table(selected_task_ids, project_id_param);
    
  ELSIF create_default_tasks THEN
    -- אין משימות נבחרות ומותר ליצור משימות ברירת מחדל
    RAISE NOTICE 'יצירת משימות ברירת מחדל לפרויקט %', project_id_param;
    
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, status, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, ''משימה ראשונה'', ''משימת ברירת מחדל'', ''todo'', now(), now()),
        (uuid_generate_v4(), %L, ''משימה שנייה'', ''משימת ברירת מחדל'', ''todo'', now(), now())
      ON CONFLICT DO NOTHING
    ', tasks_table_name, project_id_param, project_id_param);
  ELSE
    RAISE NOTICE 'לא נבחרו משימות ולא מאפשרים יצירת משימות ברירת מחדל - לא יוצרים משימות';
  END IF;
  
  -- 4. נבנה שלבים בהתאם למשימות שנבחרו
  IF (has_selected_tasks OR create_default_tasks) AND create_default_stages THEN
    PERFORM build_stages_from_selected_tasks(project_id_param);
  END IF;
  
  RAISE NOTICE 'אתחול טבלאות ונתונים לפרויקט % הושלם בהצלחה', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======= 2. שיפור פונקציית copy_tasks_to_project_table =======
-- לא ניגע בפונקציית copy_task_to_project_table (משימה יחידה) אבל נשפר את גרסת המערך
DROP FUNCTION IF EXISTS copy_tasks_to_project_table(uuid[], uuid);
CREATE OR REPLACE FUNCTION copy_tasks_to_project_table(
  task_ids uuid[],
  project_id_param uuid
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_id uuid;
  copied_count integer := 0;
  error_count integer := 0;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id_param);
  END IF;
  
  -- העתקת כל המשימות בלולאה
  IF task_ids IS NOT NULL AND array_length(task_ids, 1) > 0 THEN
    FOREACH task_id IN ARRAY task_ids
    LOOP
      BEGIN
        -- העתקת המשימה לטבלה הייעודית
        INSERT INTO (SELECT * FROM tasks WHERE id = task_id) as source_tasks
        (
          id, title, description, parent_task_id, 
          hierarchical_number, due_date, status, priority, 
          category, responsible, dropbox_folder, created_at, updated_at
        )
        INTO tasks_table_name
        (
          id, title, description, parent_task_id, 
          hierarchical_number, due_date, status, priority, 
          category, responsible, dropbox_folder, created_at, updated_at
        )
        VALUES
        (
          source_tasks.id, source_tasks.title, source_tasks.description, source_tasks.parent_task_id,
          source_tasks.hierarchical_number, source_tasks.due_date, source_tasks.status, 
          source_tasks.priority, source_tasks.category, source_tasks.responsible,
          source_tasks.dropbox_folder, source_tasks.created_at, source_tasks.updated_at
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- ברירת מחדל: קריאה לפונקציה הקיימת לטיפול במשימה יחידה
        PERFORM copy_task_to_project_table(task_id, project_id_param);
        copied_count := copied_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה בהעתקת משימה % לפרויקט %: %', task_id, project_id_param, SQLERRM;
        error_count := error_count + 1;
      END;
    END LOOP;
    
    RAISE NOTICE 'סיכום העתקת משימות לפרויקט %: % הועתקו בהצלחה, % נכשלו', 
                 project_id_param, copied_count, error_count;
  ELSE
    RAISE NOTICE 'לא הועברו משימות להעתקה';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======= 3. פונקציה נוחה חדשה להעתקת משימות נבחרות לפרויקט קיים =======
CREATE OR REPLACE FUNCTION init_project_with_selected_tasks(
  project_id_param uuid,
  selected_task_ids uuid[]
)
RETURNS void AS $$
BEGIN
  -- בדיקה שהפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_param) THEN
    RAISE EXCEPTION 'פרויקט עם מזהה % לא קיים', project_id_param;
  END IF;
  
  -- קריאה לפונקציית האתחול עם המשימות הנבחרות
  PERFORM init_project_tables_and_data(
    project_id_param,
    true,    -- ליצור שלבים ברירת מחדל
    true,    -- לאפשר יצירת משימות ברירת מחדל (לא ישפיע כי יש משימות נבחרות)
    selected_task_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION init_project_with_selected_tasks(uuid, uuid[]) TO anon, authenticated, service_role;

-- ======= 4. תיקון טריגר כך שלא ייצור משימות ברירת מחדל (רק שלבים) =======
DROP FUNCTION IF EXISTS project_after_insert_trigger() CASCADE;
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט וליצור רק שלבים
  -- create_default_tasks=false מונע יצירת משימות ברירת מחדל
  PERFORM init_project_tables_and_data(NEW.id, true, false, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגר מחדש
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- הענקת הרשאה לפונקציית הטריגר
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role;

-- ======= 5. דוגמת שימוש בקוד JavaScript =======
-- הערות אלו מסבירות כיצד להשתמש בפתרון:
/*
// דוגמה לשימוש בג'אווהסקריפט עם Supabase

// יצירת פרויקט חדש ואתחול עם משימות נבחרות
async function createProjectWithSelectedTasks(projectData, selectedTaskIds) {
  try {
    // יצירת פרויקט חדש
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (projectError) throw projectError;
    
    console.log('פרויקט נוצר בהצלחה:', project);
    
    // הטריגר כבר יצר את הטבלאות והשלבים אבל לא יצר משימות
    // כעת נעתיק את המשימות הנבחרות
    const { error } = await supabase.rpc('init_project_with_selected_tasks', {
      project_id_param: project.id,
      selected_task_ids: selectedTaskIds
    });
    
    if (error) throw error;
    
    console.log('אתחול הפרויקט עם המשימות הנבחרות הושלם בהצלחה');
    return project;
    
  } catch (error) {
    console.error('שגיאה ביצירת הפרויקט:', error);
    throw error;
  }
}

// שימוש:
const projectData = {
  name: 'פרויקט חדש',
  description: 'תיאור הפרויקט',
  owner: { name: 'שם המשתמש', id: 'מזהה המשתמש' },
  status: 'planning',
  priority: 'medium',
  progress: 0
};

const selectedTaskIds = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
];

createProjectWithSelectedTasks(projectData, selectedTaskIds)
  .then(project => console.log('מזהה הפרויקט החדש:', project.id))
  .catch(error => console.error('שגיאה:', error));
*/

-- ======= 6. הודעת סיום =======
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'הפתרון המקיף הותקן בהצלחה!';
  RAISE NOTICE '';
  RAISE NOTICE 'כיצד זה עובד:';
  RAISE NOTICE '1. בעת יצירת פרויקט חדש, רק טבלאות ושלבים נוצרים אוטומטית';
  RAISE NOTICE '2. כדי להעתיק משימות נבחרות, השתמש בפונקציה init_project_with_selected_tasks';
  RAISE NOTICE '   עם מזהה הפרויקט ומערך המזהים של המשימות הנבחרות';
  RAISE NOTICE '';
  RAISE NOTICE 'לדוגמה:';
  RAISE NOTICE 'SELECT init_project_with_selected_tasks(';
  RAISE NOTICE '  ''12345678-1234-1234-1234-123456789abc'',';
  RAISE NOTICE '  ARRAY[''id-1'', ''id-2'', ''id-3'']';
  RAISE NOTICE ');';
  RAISE NOTICE '================================================';
END $$; 