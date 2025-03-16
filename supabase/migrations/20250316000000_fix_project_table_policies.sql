-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS create_project_table(text, uuid);
DROP FUNCTION IF EXISTS create_project_table(uuid);

-- יצירת הפונקציה create_project_table מחדש עם מדיניות אבטחה מתוקנת
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_fkey';
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
        status text DEFAULT ''todo'',
        priority text DEFAULT ''medium'',
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
        original_task_id uuid
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד (עם שם אילוץ מקוצר ובטוח יותר)
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הגדרת הרשאות עם שמות קצרים יותר
    EXECUTE format('
      ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY select_policy
      ON %I
      FOR SELECT
      USING (true);
      
      CREATE POLICY insert_policy
      ON %I
      FOR INSERT
      WITH CHECK (project_id = %L);
      
      CREATE POLICY update_policy
      ON %I
      FOR UPDATE
      USING (project_id = %L)
      WITH CHECK (project_id = %L);
      
      CREATE POLICY delete_policy
      ON %I
      FOR DELETE
      USING (project_id = %L);
    ', 
      table_name, 
      table_name, 
      table_name, project_id,
      table_name, project_id, project_id,
      table_name, project_id
    );

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (project_id)', table_name || '_project_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (stage_id)', table_name || '_stage_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', table_name || '_status_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (priority)', table_name || '_priority_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', table_name || '_hierarchical_number_idx', table_name);
  END IF;

  RAISE NOTICE 'Table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 