-- migration_name: 20250402000011_fix_indices
-- description: תיקון בעיית סינטקס באינדקסים של טבלת השלבים

-- מחיקת הפונקציה הקיימת
DROP FUNCTION IF EXISTS create_project_stages_table(uuid);

-- יצירה מחדש של הפונקציה עם תיקון באינדקסים
CREATE FUNCTION create_project_stages_table(project_id uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_stages_table_exists(stages_table_name) THEN
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
      )', stages_table_name);

    -- הענקת הרשאות גישה מלאות לכל התפקידים
    EXECUTE format('
      GRANT ALL PRIVILEGES ON TABLE %I TO anon;
      GRANT ALL PRIVILEGES ON TABLE %I TO authenticated;
      GRANT ALL PRIVILEGES ON TABLE %I TO service_role;
    ', stages_table_name, stages_table_name, stages_table_name);

    -- יצירת אינדקסים עם שמות מוגדרים לחלוטין
    EXECUTE format('CREATE INDEX %I ON %I (parent_stage_id)', 
        stages_table_name || '_parent_idx', stages_table_name);
    
    EXECUTE format('CREATE INDEX %I ON %I (status)', 
        stages_table_name || '_status_idx', stages_table_name);
    
    EXECUTE format('CREATE INDEX %I ON %I (sort_order)', 
        stages_table_name || '_sort_idx', stages_table_name);
    
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', 
        stages_table_name || '_hier_idx', stages_table_name);
  END IF;

  RAISE NOTICE 'Stages table % created successfully', stages_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role; 