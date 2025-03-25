-- migration_name: 20250511000000_fix_remaining_ambiguous_issues
-- description: תיקון בעיות "project_id is ambiguous" שנותרו בפונקציות מסוימות

-- פונקציה לאתחול טבלאות ונתוני הפרויקט - תיקון project_id ambiguous
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
BEGIN
  -- 1. וודא שהטבלאות הייחודיות של הפרויקט קיימות
  PERFORM create_project_table(project_id_param);
  PERFORM create_project_stages_table(project_id_param);
  
  -- 2. העתק שלבים מטבלת stages הכללית
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. סנכרן משימות אם צריך
  IF create_default_tasks THEN
    -- אם נבחרו משימות ספציפיות
    IF selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0 THEN
      -- העתק רק את המשימות שנבחרו
      FOREACH task_id IN ARRAY selected_task_ids
      LOOP
        PERFORM copy_task_to_project_table(task_id, project_id_param);
      END LOOP;
    ELSE
      -- העתק את כל המשימות מתבניות ברירת המחדל
      PERFORM sync_tasks_from_templates(project_id_param);
    END IF;
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית אתחול טבלאות ונתוני הפרויקט
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

-- פונקציה לקבלת עץ המשימות - תיקון project_id ambiguous
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
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
        AND t.project_id = project_id_param
      
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
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית קבלת עץ משימות
GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;

-- הוספת פונקציית copy_stages_to_project במקרה שלא קיימת
CREATE OR REPLACE FUNCTION copy_stages_to_project(project_id uuid)
RETURNS json AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
  stage_rec record;
  copied_count integer := 0;
  general_stages_count integer := 0;
  project_stages_count integer := 0;
  result json;
BEGIN
  -- בדיקה אם הפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id) THEN
    RAISE EXCEPTION 'הפרויקט עם המזהה % לא קיים', project_id;
  END IF;

  -- בדיקה אם טבלת השלבים הייחודית קיימת
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = stages_table_name
  ) THEN
    -- יצירת טבלת השלבים הייחודית אם אינה קיימת
    PERFORM create_project_stages_table(project_id);
  END IF;

  -- ספירת השלבים הכלליים
  SELECT COUNT(*) INTO general_stages_count 
  FROM stages 
  WHERE project_id IS NULL;

  -- ספירת השלבים של הפרויקט הספציפי
  SELECT COUNT(*) INTO project_stages_count 
  FROM stages 
  WHERE project_id = copy_stages_to_project.project_id;

  -- מעבר על כל השלבים בטבלה הכללית שאינם משויכים לפרויקט כלל (שלבים כלליים)
  FOR stage_rec IN SELECT * FROM stages WHERE project_id IS NULL
  LOOP
    -- הוספת השלב לטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (
        id, title, hierarchical_number, due_date, status, progress, 
        color, parent_stage_id, dependencies, sort_order, 
        created_at, updated_at, project_id
      ) VALUES (
        %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L,
        %L, %L, %L
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        hierarchical_number = EXCLUDED.hierarchical_number,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        color = EXCLUDED.color,
        parent_stage_id = EXCLUDED.parent_stage_id,
        dependencies = EXCLUDED.dependencies,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at',
      stages_table_name,
      stage_rec.id,
      stage_rec.title,
      stage_rec.hierarchical_number,
      stage_rec.due_date,
      stage_rec.status,
      stage_rec.progress,
      stage_rec.color,
      stage_rec.parent_stage_id,
      stage_rec.dependencies,
      stage_rec.sort_order,
      stage_rec.created_at,
      stage_rec.updated_at,
      copy_stages_to_project.project_id
    );
    
    copied_count := copied_count + 1;
  END LOOP;
  
  -- מעבר על כל השלבים בטבלה הכללית שמשויכים לפרויקט זה
  FOR stage_rec IN SELECT * FROM stages WHERE project_id = copy_stages_to_project.project_id
  LOOP
    -- הוספת השלב לטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (
        id, title, hierarchical_number, due_date, status, progress, 
        color, parent_stage_id, dependencies, sort_order, 
        created_at, updated_at, project_id
      ) VALUES (
        %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L,
        %L, %L, %L
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        hierarchical_number = EXCLUDED.hierarchical_number,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        color = EXCLUDED.color,
        parent_stage_id = EXCLUDED.parent_stage_id,
        dependencies = EXCLUDED.dependencies,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at',
      stages_table_name,
      stage_rec.id,
      stage_rec.title,
      stage_rec.hierarchical_number,
      stage_rec.due_date,
      stage_rec.status,
      stage_rec.progress,
      stage_rec.color,
      stage_rec.parent_stage_id,
      stage_rec.dependencies,
      stage_rec.sort_order,
      stage_rec.created_at,
      stage_rec.updated_at,
      stage_rec.project_id
    );
    
    copied_count := copied_count + 1;
  END LOOP;
  
  -- יצירת תוצאת החזרה
  SELECT json_build_object(
    'success', true,
    'project_id', project_id,
    'copied_count', copied_count,
    'general_stages_count', general_stages_count,
    'project_stages_count', project_stages_count,
    'stages_table_name', stages_table_name
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית העתקת שלבים
GRANT EXECUTE ON FUNCTION copy_stages_to_project(uuid) TO anon, authenticated, service_role;

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. פתרנו את בעיית project_id ambiguous הנותרת בפונקציות init_project_tables_and_data ו-get_tasks_tree.';
  RAISE NOTICE 'גם הוספנו את פונקציית copy_stages_to_project למקרה שהיא לא קיימת כדי שה-API endpoint יעבוד.';
END $$; 