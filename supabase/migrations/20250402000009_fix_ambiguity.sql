-- migration_name: 20250402000009_fix_ambiguity
-- description: תיקון שגיאת עמודה דו-משמעית בפונקציות טריגר

-- עדכון הפונקציה create_project_stages_table כדי להימנע מדו-משמעות בשם table_name
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id uuid)
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

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I_parent_stage_id_idx ON %I (parent_stage_id)', stages_table_name, stages_table_name);
    EXECUTE format('CREATE INDEX %I_status_idx ON %I (status)', stages_table_name, stages_table_name);
    EXECUTE format('CREATE INDEX %I_sort_order_idx ON %I (sort_order)', stages_table_name, stages_table_name);
    EXECUTE format('CREATE INDEX %I_hierarchical_number_idx ON %I (hierarchical_number)', stages_table_name, stages_table_name);
  END IF;

  RAISE NOTICE 'Stages table % created successfully', stages_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון הפונקציות הטריגר לוודא שאין דו-משמעות בשמות המשתנים
CREATE OR REPLACE FUNCTION sync_all_project_tables_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יצירת טבלאות ספציפיות לפרויקט עם פונקציה חיצונית
  PERFORM create_project_tables(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- עדכון הענקת הרשאות
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_all_project_tables_on_insert() TO anon, authenticated, service_role; 