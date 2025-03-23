-- מיגרציה לתיקון העמודות בטבלאות פרויקט
-- תאריך: 29-03-2025

-- מחיקת הפונקציה הקיימת ליצירת טבלת משימות לפרויקט
DROP FUNCTION IF EXISTS create_project_table(uuid);

-- יצירת הפונקציה המתוקנת ליצירת טבלת משימות לפרויקט
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם המבנה הנכון
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title text NOT NULL,
        description text,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
        parent_task_id uuid,
        hierarchical_number text,
        due_date date,
        status text DEFAULT ''todo'',
        priority text DEFAULT ''medium'',
        category text,
        responsible uuid,
        dropbox_folder text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד (עם שם אילוץ מקוצר ובטוח יותר)
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הענקת הרשאות גישה מלאות לכל התפקידים
    EXECUTE format('
      GRANT ALL PRIVILEGES ON TABLE %I TO anon;
      GRANT ALL PRIVILEGES ON TABLE %I TO authenticated;
      GRANT ALL PRIVILEGES ON TABLE %I TO service_role;
    ', table_name, table_name, table_name);

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

-- מחיקת הפונקציה הקיימת ליצירת טבלת שלבים לפרויקט אם קיימת
DROP FUNCTION IF EXISTS create_project_stages_table(uuid);

-- יצירת פונקציה מעודכנת ליצירת טבלת שלבים לפרויקט
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_stages';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_stages_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_stages_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם המבנה הנכון של שלבים
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title text NOT NULL,
        hierarchical_number text,
        due_date date,
        status text DEFAULT ''in_progress'',
        progress integer DEFAULT 0,
        color text,
        parent_stage_id uuid,
        dependencies text[],
        sort_order integer,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הענקת הרשאות גישה מלאות לכל התפקידים
    EXECUTE format('
      GRANT ALL PRIVILEGES ON TABLE %I TO anon;
      GRANT ALL PRIVILEGES ON TABLE %I TO authenticated;
      GRANT ALL PRIVILEGES ON TABLE %I TO service_role;
    ', table_name, table_name, table_name);

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (project_id)', table_name || '_project_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (parent_stage_id)', table_name || '_parent_stage_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', table_name || '_status_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (sort_order)', table_name || '_sort_order_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', table_name || '_hierarchical_number_idx', table_name);
  END IF;

  RAISE NOTICE 'Stages table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לבדיקה אם טבלת שלבים קיימת
CREATE OR REPLACE FUNCTION check_stages_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = check_stages_table_exists.table_name
  );
END;
$$ LANGUAGE plpgsql; 