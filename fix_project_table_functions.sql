-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS create_project_table(text, uuid);
DROP FUNCTION IF EXISTS create_project_table(uuid);
DROP FUNCTION IF EXISTS check_table_exists(text);
DROP FUNCTION IF EXISTS delete_project_table(uuid);

-- יצירת הפונקציה check_table_exists מחדש
CREATE OR REPLACE FUNCTION check_table_exists(table_name_param text)
RETURNS boolean AS $$
DECLARE
  exists_val boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = table_name_param
  ) INTO exists_val;
  
  RETURN exists_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הפונקציה create_project_table מחדש
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
        title text NOT NULL,
        description text,
        category text,
        status text DEFAULT ''todo''::text,
        priority text DEFAULT ''medium''::text,
        responsible uuid,
        estimated_hours numeric,
        actual_hours numeric,
        start_date date,
        due_date date,
        completed_date date,
        budget numeric,
        dependencies text[],
        assignees text[],
        watchers text[],
        labels text[],
        deleted boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        hierarchical_number text,
        parent_task_id uuid,
        is_template boolean DEFAULT false,
        original_task_id uuid,
        CONSTRAINT %I_project_id_fkey FOREIGN KEY (project_id) 
          REFERENCES projects(id) ON DELETE CASCADE
      )', table_name, table_name);

    -- הגדרת הרשאות
    EXECUTE format('
      ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "%I_select_policy"
      ON %I
      FOR SELECT
      USING (true);
      
      CREATE POLICY "%I_insert_policy"
      ON %I
      FOR INSERT
      WITH CHECK (project_id = %L);
      
      CREATE POLICY "%I_update_policy"
      ON %I
      FOR UPDATE
      USING (project_id = %L)
      WITH CHECK (project_id = %L);
      
      CREATE POLICY "%I_delete_policy"
      ON %I
      FOR DELETE
      USING (project_id = %L);
    ', 
      table_name, 
      table_name, table_name, 
      table_name, table_name, project_id,
      table_name, table_name, project_id, project_id,
      table_name, table_name, project_id
    );

    -- יצירת אינדקסים
    EXECUTE format('
      CREATE INDEX %I_project_id_idx ON %I (project_id);
      CREATE INDEX %I_stage_id_idx ON %I (stage_id);
      CREATE INDEX %I_status_idx ON %I (status);
      CREATE INDEX %I_priority_idx ON %I (priority);
      CREATE INDEX %I_hierarchical_number_idx ON %I (hierarchical_number);
    ', 
      table_name, table_name,
      table_name, table_name,
      table_name, table_name,
      table_name, table_name,
      table_name, table_name
    );
  END IF;

  RAISE NOTICE 'Table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הפונקציה delete_project_table מחדש
CREATE OR REPLACE FUNCTION delete_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- מחיקת הטבלה
    EXECUTE format('DROP TABLE %I', table_name);
    RAISE NOTICE 'Table % deleted successfully', table_name;
  ELSE
    RAISE NOTICE 'Table % does not exist', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 