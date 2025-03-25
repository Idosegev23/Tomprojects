-- מיגרציה לתיקון פונקציית get_tasks_tree
-- פותרת שגיאת 404 בקריאה ל-get_tasks_tree

-- תחילה מחיקת הפונקציה הקיימת אם היא קיימת
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);

-- יצירת פונקציה חדשה שמחזירה עץ משימות בפורמט JSON
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_tasks';
  result jsonb;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת עץ המשימות מהטבלה הספציפית באמצעות רקורסיה
    EXECUTE format('
      WITH RECURSIVE task_tree AS (
        -- שורשי העץ (משימות ללא הורה)
        SELECT 
          t.id, 
          t.title,
          t.description,
          t.project_id,
          t.stage_id,
          t.parent_task_id,
          t.hierarchical_number,
          t.due_date,
          t.status,
          t.priority,
          t.category,
          t.responsible,
          t.dropbox_folder,
          t.created_at,
          t.updated_at,
          0 AS level,
          ARRAY[t.id]::uuid[] AS path
        FROM %I t
        WHERE t.parent_task_id IS NULL
          AND t.project_id = %L
        
        UNION ALL
        
        -- תת-משימות
        SELECT 
          t.id, 
          t.title,
          t.description,
          t.project_id,
          t.stage_id,
          t.parent_task_id,
          t.hierarchical_number,
          t.due_date,
          t.status,
          t.priority,
          t.category,
          t.responsible,
          t.dropbox_folder,
          t.created_at,
          t.updated_at,
          tt.level + 1,
          tt.path || t.id
        FROM %I t
        JOIN task_tree tt ON t.parent_task_id = tt.id
        WHERE t.project_id = %L
      )
      SELECT jsonb_agg(jsonb_build_object(
        ''id'', id,
        ''title'', title,
        ''description'', description,
        ''project_id'', project_id,
        ''stage_id'', stage_id,
        ''parent_task_id'', parent_task_id,
        ''hierarchical_number'', hierarchical_number,
        ''due_date'', due_date,
        ''status'', status,
        ''priority'', priority,
        ''category'', category,
        ''responsible'', responsible,
        ''dropbox_folder'', dropbox_folder,
        ''created_at'', created_at,
        ''updated_at'', updated_at,
        ''level'', level,
        ''path'', path
      ) ORDER BY path)
      FROM task_tree
    ', table_name, project_id_param, table_name, project_id_param) INTO result;
    
    -- אם אין משימות, החזר מערך ריק במקום NULL
    IF result IS NULL THEN
      result := '[]'::jsonb;
    END IF;
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    WITH RECURSIVE task_tree AS (
      -- שורשי העץ (משימות ללא הורה)
      SELECT 
        id, 
        title,
        description,
        project_id,
        stage_id,
        parent_task_id,
        hierarchical_number,
        due_date,
        status,
        priority,
        category,
        responsible,
        dropbox_folder,
        created_at,
        updated_at,
        0 AS level,
        ARRAY[id]::uuid[] AS path
      FROM tasks
      WHERE parent_task_id IS NULL
        AND project_id = project_id_param
      
      UNION ALL
      
      -- תת-משימות
      SELECT 
        t.id, 
        t.title,
        t.description,
        t.project_id,
        t.stage_id,
        t.parent_task_id,
        t.hierarchical_number,
        t.due_date,
        t.status,
        t.priority,
        t.category,
        t.responsible,
        t.dropbox_folder,
        t.created_at,
        t.updated_at,
        tt.level + 1,
        tt.path || t.id
      FROM tasks t
      JOIN task_tree tt ON t.parent_task_id = tt.id
      WHERE t.project_id = project_id_param
    )
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'description', description,
      'project_id', project_id,
      'stage_id', stage_id,
      'parent_task_id', parent_task_id,
      'hierarchical_number', hierarchical_number,
      'due_date', due_date,
      'status', status,
      'priority', priority,
      'category', category,
      'responsible', responsible,
      'dropbox_folder', dropbox_folder,
      'created_at', created_at,
      'updated_at', updated_at,
      'level', level,
      'path', path
    ) ORDER BY path)
    FROM task_tree INTO result;
    
    -- אם אין משימות, החזר מערך ריק במקום NULL
    IF result IS NULL THEN
      result := '[]'::jsonb;
    END IF;
  END IF;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in get_tasks_tree: %', SQLERRM;
  RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציה
GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;

-- בדיקת פונקציה נוספת שעלולה להיות חסרה
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_exists boolean;
  task_rec record;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- בדיקה אם המשימה קיימת בטבלה הראשית
  SELECT * INTO task_rec FROM tasks WHERE id = task_id;
  
  IF task_rec.id IS NULL THEN
    RAISE NOTICE 'משימה % לא קיימת בטבלה הראשית', task_id;
    RETURN;
  END IF;
  
  -- בדיקה אם המשימה כבר קיימת בטבלה הספציפית
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I WHERE id = %L
    )', table_name, task_id) INTO task_exists;
  
  IF task_exists THEN
    RAISE NOTICE 'משימה % כבר קיימת בטבלה הספציפית של פרויקט %', task_id, project_id;
    RETURN;
  END IF;
  
  -- העתקת המשימה מהטבלה הראשית לטבלה הספציפית
  BEGIN
    EXECUTE format('
      INSERT INTO %I (
        id, title, description, project_id, stage_id, 
        parent_task_id, hierarchical_number, due_date,
        status, priority, category, responsible, 
        dropbox_folder, created_at, updated_at
      ) VALUES (
        %L, %L, %L, %L, %L, 
        %L, %L, %L,
        %L, %L, %L, %L,
        %L, %L, %L
      )', 
      table_name,
      task_rec.id, 
      task_rec.title, 
      task_rec.description, 
      project_id, 
      task_rec.stage_id,
      task_rec.parent_task_id, 
      task_rec.hierarchical_number, 
      task_rec.due_date,
      task_rec.status, 
      task_rec.priority, 
      task_rec.category, 
      task_rec.responsible,
      task_rec.dropbox_folder, 
      task_rec.created_at, 
      task_rec.updated_at
    );
    
    RAISE NOTICE 'משימה % הועתקה בהצלחה לטבלה הספציפית של פרויקט %', task_id, project_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'שגיאה בהעתקת משימה % לפרויקט %: %', task_id, project_id, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role;

-- עדכון פונקציית אתחול טבלאות ונתונים לפרויקט
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]) CASCADE;
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  task_id uuid;
  has_selected_tasks boolean := selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0;
BEGIN
  -- יומן מפורט יותר לצורכי דיבוג
  RAISE NOTICE 'Starting init_project_tables_and_data for project %', project_id;
  RAISE NOTICE 'Parameters: create_default_stages=%, create_default_tasks=%, has_selected_tasks=%', 
               create_default_stages, create_default_tasks, has_selected_tasks;
  
  -- 1. וודא שטבלאות הפרויקט קיימות
  PERFORM create_project_table(project_id);
  
  -- 2. טיפול במשימות
  IF has_selected_tasks THEN
    -- יש משימות נבחרות - נעתיק רק אותן
    RAISE NOTICE 'העתקת % משימות נבחרות לפרויקט %', array_length(selected_task_ids, 1), project_id;
    
    -- העתקת כל משימה נבחרת
    FOREACH task_id IN ARRAY selected_task_ids
    LOOP
      BEGIN
        PERFORM copy_task_to_project_table(task_id, project_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה בהעתקת משימה %: %', task_id, SQLERRM;
      END;
    END LOOP;
    
  ELSIF create_default_tasks THEN
    -- אין משימות נבחרות ומותר ליצור משימות ברירת מחדל
    RAISE NOTICE 'יצירת משימות ברירת מחדל לפרויקט %', project_id;
    
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, status, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, ''משימה ראשונה'', ''משימת ברירת מחדל'', ''todo'', now(), now()),
        (uuid_generate_v4(), %L, ''משימה שנייה'', ''משימת ברירת מחדל'', ''todo'', now(), now())
      ON CONFLICT DO NOTHING
    ', tasks_table_name, project_id, project_id);
  ELSE
    RAISE NOTICE 'לא נבחרו משימות ולא מאפשרים יצירת משימות ברירת מחדל - לא יוצרים משימות';
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית אתחול טבלאות ונתוני הפרויקט
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role; 