-- migration_name: 20250509000000_fix_ambiguous_column_reference
-- description: תיקון שגיאת עמודה לא חד משמעית (column reference "project_id" is ambiguous)

-- תיקון פונקציית init_project_tables_and_data כדי לפתור את בעיית reference במזהה הפרויקט
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  task_id uuid;
BEGIN
  -- 1. וודא שהטבלאות הייחודיות של הפרויקט קיימות
  PERFORM create_project_table(project_id);
  
  -- 2. העתק שלבים מטבלת stages הכללית
  PERFORM copy_stages_to_project_table(project_id);
  
  -- 3. סנכרן משימות אם צריך
  IF create_default_tasks THEN
    -- אם נבחרו משימות ספציפיות
    IF selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0 THEN
      -- העתק רק את המשימות שנבחרו
      FOREACH task_id IN ARRAY selected_task_ids
      LOOP
        PERFORM copy_task_to_project_table(task_id, project_id);
      END LOOP;
    ELSE
      -- העתק את כל המשימות מתבניות ברירת המחדל
      PERFORM sync_tasks_from_templates(project_id);
    END IF;
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית אתחול טבלאות ונתוני הפרויקט
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

-- תיקון פונקציית get_tasks_tree כדי לטפל בבעיית ההפניה הלא חד משמעית
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id uuid)
RETURNS jsonb AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
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
    ', table_name, project_id, table_name, project_id) INTO result;
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
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
      FROM tasks t
      WHERE t.parent_task_id IS NULL
        AND t.project_id = get_tasks_tree.project_id
      
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
      WHERE t.project_id = get_tasks_tree.project_id
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
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית קבלת עץ משימות
GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;

-- תיקון פונקציית check_table_exists כדי לתקן את שגיאת "function does not exist"
-- במקרה שהפונקציה נקראת עם פרמטר בשם table_name_param
DROP FUNCTION IF EXISTS check_table_exists(text);
CREATE OR REPLACE FUNCTION check_table_exists(table_name_param text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = table_name_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית בדיקת קיום טבלה
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role;

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. תוקנו שגיאות project_id ambiguous ובעיית שם פרמטר בפונקציית check_table_exists.';
END $$; 