-- הגדרת פונקציות לטיפול במשימות נבחרות בעת יצירת פרויקט
-- מותאם במיוחד לסביבת Supabase
-- שימוש: להעתיק ולהדביק קובץ זה במלואו בעורך ה-SQL של סופאבייס ולהריץ

-- ======================================================================================
-- קבוצה 1: תיקון פונקציות קיימות כדי לתמוך בהעברת משימות נבחרות בצורה נכונה
-- ======================================================================================

-- פונקציה 1: תיקון הפונקציה המרכזית שאחראית על אתחול טבלאות פרויקט
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- 1. וודא שטבלאות הפרויקט קיימות
  IF NOT check_table_exists(tasks_table_name) THEN
    PERFORM create_project_table(project_id_param);
  END IF;
  
  IF NOT check_table_exists(stages_table_name) THEN
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- 2. העתק שלבים (אם ביקשו)
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. טיפול במשימות
  IF has_selected_tasks THEN
    -- יש משימות נבחרות - נעתיק רק אותן
    FOREACH task_id IN ARRAY selected_task_ids
    LOOP
      BEGIN
        PERFORM copy_task_to_project_table(task_id, project_id_param);
      EXCEPTION WHEN OTHERS THEN
        -- המשך לעבוד גם אם יש שגיאה
        NULL;
      END;
    END LOOP;
  ELSIF create_default_tasks THEN
    -- אין משימות נבחרות ומותר ליצור משימות ברירת מחדל
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, status, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, ''משימה ראשונה'', ''משימת ברירת מחדל'', ''todo'', now(), now()),
        (uuid_generate_v4(), %L, ''משימה שנייה'', ''משימת ברירת מחדל'', ''todo'', now(), now())
      ON CONFLICT DO NOTHING
    ', tasks_table_name, project_id_param, project_id_param);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה 2: עדכון פונקציית הטריגר כך שלא תיצור משימות ברירת מחדל באופן אוטומטי
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט וליצור רק שלבים
  -- create_default_tasks=false מונע יצירת משימות ברירת מחדל
  PERFORM init_project_tables_and_data(NEW.id, true, false, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון הטריגר: מחיקת הטריגר אם הוא כבר קיים ויצירתו מחדש
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- ======================================================================================
-- קבוצה 2: פונקציות חדשות להקלה על השימוש
-- ======================================================================================

-- פונקציה 3: פונקציה נוחה להעתקת משימות נבחרות לפרויקט קיים
CREATE OR REPLACE FUNCTION init_project_with_selected_tasks(
  project_id_param uuid,
  selected_task_ids uuid[]
)
RETURNS void AS $$
BEGIN
  -- בדיקה שהפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_param) THEN
    RETURN; -- לא זורק שגיאה, פשוט מסיים בשקט
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

-- ======================================================================================
-- קבוצה 3: הענקת הרשאות לכל הפונקציות
-- ======================================================================================

-- הענקת הרשאות לפונקציות
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION init_project_with_selected_tasks(uuid, uuid[]) TO anon, authenticated, service_role;

-- ======================================================================================
-- קבוצה 4: דוגמאות שימוש (ב-SQL ג'אווהסקריפט)
-- ======================================================================================

-- הערה: דוגמאות אלו הן עבור הבנה בלבד - אין צורך להריץ אותן:

/*
-- דוגמה 1: יצירת פרויקט חדש (עם טריגר, כך שנוצרות רק טבלאות ושלבים, ללא משימות)
INSERT INTO projects (name, description, status, priority, progress)
VALUES (
  'פרויקט חדש', 
  'תיאור הפרויקט', 
  'planning', 
  'medium', 
  0
) RETURNING id;

-- דוגמה 2: הוספת משימות נבחרות לפרויקט שזה עתה נוצר
SELECT init_project_with_selected_tasks(
  '12345678-1234-1234-1234-123456789abc',  -- מזהה הפרויקט שנוצר
  ARRAY[                                    -- מערך של מזהי משימות נבחרות 
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222'
  ]
);

-- דוגמה 3: באמצעות Supabase JavaScript Client:
/*
// 1. יצירת פרויקט חדש
const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert([{
    name: 'פרויקט חדש',
    description: 'תיאור הפרויקט',
    status: 'planning',
    priority: 'medium',
    progress: 0,
    owner: { name: 'המשתמש', id: 'מזהה המשתמש' }
  }])
  .select()
  .single();

// 2. הוספת המשימות הנבחרות
const { error } = await supabase.rpc('init_project_with_selected_tasks', {
  project_id_param: project.id,
  selected_task_ids: [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  ]
});
*/ 