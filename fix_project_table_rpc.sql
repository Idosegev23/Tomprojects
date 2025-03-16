-- עדכון הפונקציה create_project_table
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND information_schema.tables.table_name = table_name
  ) THEN
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