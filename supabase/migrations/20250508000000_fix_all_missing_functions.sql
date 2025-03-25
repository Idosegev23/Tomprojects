-- migration_name: 20250508000000_fix_all_missing_functions
-- description: תיקון כל הפונקציות החסרות שגורמות לשגיאות 404

-- פונקציה לבדיקה אם טבלה קיימת
DROP FUNCTION IF EXISTS check_table_exists(text);
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית בדיקת קיום טבלה
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role;

-- פונקציה ליצירת טבלת משימות ייחודית לפרויקט
DROP FUNCTION IF EXISTS create_project_tasks_table(uuid);
CREATE OR REPLACE FUNCTION create_project_tasks_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name
  ) THEN
    RAISE NOTICE 'טבלת המשימות % כבר קיימת', table_name;
    RETURN;
  END IF;
  
  -- יצירת טבלת המשימות הייחודית לפרויקט
  EXECUTE format('
    CREATE TABLE %I (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      title text NOT NULL,
      description text,
      project_id uuid NOT NULL,
      stage_id uuid,
      parent_task_id uuid,
      hierarchical_number text,
      due_date date,
      status text DEFAULT ''todo'',
      priority text DEFAULT ''medium'',
      category text,
      responsible text,
      dropbox_folder text,
      start_date date,
      completed_date date,
      budget numeric,
      estimated_hours numeric,
      actual_hours numeric,
      dependencies jsonb,
      assignees text[],
      watchers text[],
      labels text[],
      is_template boolean DEFAULT false,
      original_task_id uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT %I FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )',
    table_name,
    table_name || '_project_id_fkey'
  );
  
  -- הענקת הרשאות גישה לטבלה
  EXECUTE format('
    GRANT ALL ON TABLE %I TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO authenticated;
    GRANT SELECT ON TABLE %I TO anon;
  ', 
    table_name, table_name, table_name
  );
  
  -- ביטול RLS על הטבלה לאפשר גישה לכולם
  EXECUTE format('
    ALTER TABLE %I DISABLE ROW LEVEL SECURITY;
  ', table_name);
  
  -- יצירת אינדקס על שדה project_id
  EXECUTE format('
    CREATE INDEX %I ON %I (project_id);
  ', 
    table_name || '_project_id_idx',
    table_name
  );
  
  -- יצירת אינדקס על שדה parent_task_id
  EXECUTE format('
    CREATE INDEX %I ON %I (parent_task_id);
  ', 
    table_name || '_parent_task_id_idx',
    table_name
  );
  
  -- יצירת אינדקס על שדה stage_id
  EXECUTE format('
    CREATE INDEX %I ON %I (stage_id);
  ', 
    table_name || '_stage_id_idx',
    table_name
  );
  
  RAISE NOTICE 'טבלת המשימות % נוצרה בהצלחה', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית יצירת טבלת משימות
GRANT EXECUTE ON FUNCTION create_project_tasks_table(uuid) TO anon, authenticated, service_role;

-- פונקציה משולבת ליצירת כל טבלאות הפרויקט
DROP FUNCTION IF EXISTS create_project_table(uuid);
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
BEGIN
  -- יצירת טבלת המשימות
  PERFORM create_project_tasks_table(project_id);
  
  -- יצירת טבלת השלבים
  PERFORM create_project_stages_table(project_id);
  
  RAISE NOTICE 'כל טבלאות הפרויקט % נוצרו בהצלחה', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית יצירת טבלאות הפרויקט
GRANT EXECUTE ON FUNCTION create_project_table(uuid) TO anon, authenticated, service_role;

-- פונקציה להעתקת משימה לטבלת המשימות הייחודית של הפרויקט
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid);
CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id uuid, project_id uuid)
RETURNS uuid AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  task_rec record;
  new_task_id uuid;
BEGIN
  -- בדיקה אם טבלת המשימות הייחודית קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    -- אם הטבלה לא קיימת, ניצור אותה
    PERFORM create_project_tasks_table(project_id);
  END IF;
  
  -- שליפת פרטי המשימה מהטבלה הראשית
  SELECT * INTO task_rec FROM tasks WHERE id = task_id;
  
  IF task_rec IS NULL THEN
    RAISE EXCEPTION 'המשימה עם המזהה % לא נמצאה', task_id;
  END IF;
  
  -- יצירת מזהה חדש למשימה המועתקת
  SELECT uuid_generate_v4() INTO new_task_id;
  
  -- הוספת המשימה לטבלה הייחודית עם המזהה החדש
  EXECUTE format('
    INSERT INTO %I (
      id, title, description, project_id, stage_id, parent_task_id,
      hierarchical_number, due_date, status, priority, category,
      responsible, dropbox_folder, start_date, completed_date,
      budget, estimated_hours, actual_hours, dependencies,
      assignees, watchers, labels, is_template, original_task_id,
      created_at, updated_at
    ) VALUES (
      %L, %L, %L, %L, %L, %L,
      %L, %L, %L, %L, %L,
      %L, %L, %L, %L,
      %L, %L, %L, %L,
      %L, %L, %L, %L, %L,
      %L, %L
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      stage_id = EXCLUDED.stage_id,
      parent_task_id = EXCLUDED.parent_task_id,
      hierarchical_number = EXCLUDED.hierarchical_number,
      due_date = EXCLUDED.due_date,
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      category = EXCLUDED.category,
      responsible = EXCLUDED.responsible,
      dropbox_folder = EXCLUDED.dropbox_folder,
      start_date = EXCLUDED.start_date,
      completed_date = EXCLUDED.completed_date,
      budget = EXCLUDED.budget,
      estimated_hours = EXCLUDED.estimated_hours,
      actual_hours = EXCLUDED.actual_hours,
      dependencies = EXCLUDED.dependencies,
      assignees = EXCLUDED.assignees,
      watchers = EXCLUDED.watchers,
      labels = EXCLUDED.labels,
      is_template = EXCLUDED.is_template,
      updated_at = EXCLUDED.updated_at
    RETURNING id',
    tasks_table_name,
    new_task_id,
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
    task_rec.start_date,
    task_rec.completed_date,
    task_rec.budget,
    task_rec.estimated_hours,
    task_rec.actual_hours,
    task_rec.dependencies,
    task_rec.assignees,
    task_rec.watchers,
    task_rec.labels,
    task_rec.is_template,
    task_id,
    task_rec.created_at,
    task_rec.updated_at
  ) INTO new_task_id;
  
  RETURN new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית העתקת משימה
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role;

-- פונקציה לסנכרון משימות מתבנית
DROP FUNCTION IF EXISTS sync_tasks_from_templates(uuid);
CREATE OR REPLACE FUNCTION sync_tasks_from_templates(project_id uuid)
RETURNS void AS $$
DECLARE
  task_rec record;
BEGIN
  -- מעבר על כל המשימות שמוגדרות כתבניות
  FOR task_rec IN 
    SELECT * FROM tasks 
    WHERE is_template = true 
    AND (project_id IS NULL OR project_id = sync_tasks_from_templates.project_id)
  LOOP
    -- העתקת המשימה לטבלת הפרויקט
    PERFORM copy_task_to_project_table(task_rec.id, sync_tasks_from_templates.project_id);
  END LOOP;
  
  RAISE NOTICE 'משימות סונכרנו בהצלחה מתבניות לפרויקט %', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית סנכרון משימות מתבנית
GRANT EXECUTE ON FUNCTION sync_tasks_from_templates(uuid) TO anon, authenticated, service_role;

-- פונקציה לאתחול כל טבלאות ונתוני הפרויקט
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

-- עדכון פונקציית קבלת משימות פרויקט
DROP FUNCTION IF EXISTS get_project_tasks(uuid);
CREATE OR REPLACE FUNCTION get_project_tasks(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 ORDER BY hierarchical_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית קבלת משימות פרויקט
GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role;

-- עדכון פונקציית קבלת עץ משימות
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
        FROM %I
        WHERE parent_task_id IS NULL
          AND project_id = %L
        
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
        AND project_id = get_tasks_tree.project_id
      
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

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. תוקנו כל הפונקציות החסרות.';
END $$; 