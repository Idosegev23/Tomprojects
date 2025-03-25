-- migration_name: 20250510000000_override_all_problematic_functions
-- description: דריסת כל הפונקציות הבעייתיות ותיקון כל הבעיות שזיהינו.

-- פונקציה ליצירת טבלאות ייחודיות לפרויקט 
DROP FUNCTION IF EXISTS create_project_table(uuid);
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
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
    CREATE TABLE IF NOT EXISTS %I (
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
  
  RAISE NOTICE 'טבלת המשימות % נוצרה בהצלחה', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית יצירת טבלת משימות
GRANT EXECUTE ON FUNCTION create_project_table(uuid) TO anon, authenticated, service_role;

-- פונקציה ליצירת טבלת שלבים ייחודית לפרויקט
DROP FUNCTION IF EXISTS create_project_stages_table(uuid);
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_stages';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name
  ) THEN
    RAISE NOTICE 'טבלת השלבים % כבר קיימת', table_name;
    RETURN;
  END IF;
  
  -- יצירת טבלת השלבים הייחודית לפרויקט
  EXECUTE format('
    CREATE TABLE %I (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      title text NOT NULL,
      project_id uuid NOT NULL,
      hierarchical_number text,
      due_date date,
      status text DEFAULT ''pending'',
      progress integer DEFAULT 0,
      color text,
      parent_stage_id uuid,
      dependencies jsonb,
      sort_order integer,
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
  
  -- יצירת אינדקס על שדה parent_stage_id
  EXECUTE format('
    CREATE INDEX %I ON %I (parent_stage_id);
  ', 
    table_name || '_parent_stage_id_idx',
    table_name
  );
  
  RAISE NOTICE 'טבלת השלבים % נוצרה בהצלחה', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית יצירת טבלת שלבים
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;

-- פונקציה לבדיקת קיום טבלה - יצירת פונקציה שתומכת בשתי הגרסאות של שם הפרמטר
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

-- פונקציה לבדיקת קיום טבלת שלבים - מוחקים ויוצרים מחדש
DROP FUNCTION IF EXISTS check_stages_table_exists(text);
CREATE FUNCTION check_stages_table_exists(stages_table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = stages_table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות בדיקת קיום טבלה
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_stages_table_exists(text) TO anon, authenticated, service_role;

-- פונקציה להעתקת שלבים מטבלת stages הכללית לטבלת השלבים הייחודית של הפרויקט
DROP FUNCTION IF EXISTS copy_stages_to_project_table(uuid);
CREATE OR REPLACE FUNCTION copy_stages_to_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
  stage_rec record;
BEGIN
  -- בדיקה אם טבלת השלבים הייחודית קיימת
  IF check_stages_table_exists(stages_table_name) THEN
    -- מעבר על כל השלבים בטבלה הכללית שמשויכים לפרויקט זה או שאינם משויכים לפרויקט כלל (שלבים כלליים)
    FOR stage_rec IN SELECT * FROM stages WHERE project_id IS NULL OR project_id = copy_stages_to_project_table.project_id
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
        copy_stages_to_project_table.project_id
      );
    END LOOP;
    
    RAISE NOTICE 'שלבים הועתקו בהצלחה לטבלה %', stages_table_name;
  ELSE
    RAISE EXCEPTION 'טבלת השלבים % לא קיימת', stages_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית העתקת שלבים
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table(uuid) TO anon, authenticated, service_role;

-- פונקציה להעתקת משימה מטבלת tasks הכללית לטבלה הייחודית של הפרויקט
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid);
CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  task_rec record;
BEGIN
  -- בדיקה אם טבלת המשימות הייחודית קיימת
  IF check_table_exists(tasks_table_name) THEN
    -- שליפת המשימה מהטבלה הכללית
    SELECT * INTO task_rec FROM tasks WHERE id = task_id;
    
    IF task_rec IS NULL THEN
      RAISE EXCEPTION 'המשימה עם המזהה % לא קיימת', task_id;
    END IF;
    
    -- הוספת המשימה לטבלה הייחודית
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
        original_task_id = EXCLUDED.original_task_id,
        updated_at = EXCLUDED.updated_at',
      tasks_table_name,
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
      task_rec.original_task_id,
      task_rec.created_at,
      task_rec.updated_at
    );
    
    RAISE NOTICE 'המשימה % הועתקה בהצלחה לטבלה %', task_id, tasks_table_name;
  ELSE
    RAISE EXCEPTION 'טבלת המשימות % לא קיימת', tasks_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית העתקת משימה
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role;

-- פונקציה לסנכרון משימות מתבניות
DROP FUNCTION IF EXISTS sync_tasks_from_templates(uuid);
CREATE OR REPLACE FUNCTION sync_tasks_from_templates(project_id uuid)
RETURNS void AS $$
DECLARE
  task_rec record;
  children_count integer;
BEGIN
  -- בדיקה אם הפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id) THEN
    RAISE EXCEPTION 'הפרויקט עם המזהה % לא קיים', project_id;
  END IF;

  -- מעבר על כל משימות התבנית שאינן משויכות לפרויקט ואינן תת-משימות (שורשי העץ)
  FOR task_rec IN 
    SELECT * FROM tasks 
    WHERE project_id IS NULL 
      AND is_template = true
      AND parent_task_id IS NULL
  LOOP
    -- העתקת המשימה לטבלת המשימות הייחודית של הפרויקט
    PERFORM copy_task_to_project_table(task_rec.id, project_id);
    
    -- בדיקה אם יש תת-משימות
    SELECT COUNT(*) INTO children_count 
    FROM tasks 
    WHERE parent_task_id = task_rec.id;
    
    -- אם יש תת-משימות, יש לקרוא לפונקציה רקורסיבית להעתקת כל העץ
    IF children_count > 0 THEN
      PERFORM sync_task_children(task_rec.id, project_id);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'כל משימות התבנית סונכרנו בהצלחה לפרויקט %', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה רקורסיבית להעתקת תת-משימות
DROP FUNCTION IF EXISTS sync_task_children(uuid, uuid);
CREATE OR REPLACE FUNCTION sync_task_children(parent_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  task_rec record;
  children_count integer;
BEGIN
  -- מעבר על כל תת-המשימות של המשימה הנוכחית
  FOR task_rec IN 
    SELECT * FROM tasks 
    WHERE parent_task_id = parent_id
  LOOP
    -- העתקת תת-המשימה לטבלת המשימות הייחודית של הפרויקט
    PERFORM copy_task_to_project_table(task_rec.id, project_id);
    
    -- בדיקה אם יש תת-משימות נוספות
    SELECT COUNT(*) INTO children_count 
    FROM tasks 
    WHERE parent_task_id = task_rec.id;
    
    -- אם יש תת-משימות נוספות, קריאה רקורסיבית
    IF children_count > 0 THEN
      PERFORM sync_task_children(task_rec.id, project_id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות סנכרון משימות
GRANT EXECUTE ON FUNCTION sync_tasks_from_templates(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_task_children(uuid, uuid) TO anon, authenticated, service_role;

-- פונקציה לאתחול טבלאות ונתוני הפרויקט
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);
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
BEGIN
  -- 1. וודא שהטבלאות הייחודיות של הפרויקט קיימות
  PERFORM create_project_table(project_id);
  PERFORM create_project_stages_table(project_id);
  
  -- 2. העתק שלבים מטבלת stages הכללית
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id);
  END IF;
  
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

-- פונקציה לקבלת משימות הפרויקט
DROP FUNCTION IF EXISTS get_project_tasks(uuid);
CREATE OR REPLACE FUNCTION get_project_tasks(project_id uuid)
RETURNS jsonb AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  result jsonb;
BEGIN
  -- בדיקה אם הטבלה הייחודית קיימת
  IF check_table_exists(table_name) THEN
    -- שליפת המשימות מהטבלה הייחודית
    EXECUTE format('
      SELECT jsonb_agg(t.*)
      FROM %I t
      WHERE t.project_id = %L
    ', table_name, project_id) INTO result;
  ELSE
    -- אם הטבלה הייחודית לא קיימת, שליפת המשימות מהטבלה הכללית
    SELECT jsonb_agg(t.*)
    FROM tasks t
    WHERE t.project_id = get_project_tasks.project_id
    INTO result;
  END IF;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית קבלת משימות הפרויקט
GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role;

-- פונקציה לקבלת עץ המשימות
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

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. כל הפונקציות הוגדרו מחדש כדי לפתור את כל הבעיות שזוהו.';
END $$; 