-- סקריפט גנרי ליצירת טבלאות ספציפיות לפרויקט
-- העתק והדבק קוד זה לממשק SQL של סופאבייס

-- יצירת פונקציית עזר לבדיקה אם טבלה קיימת
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

-- פונקציה ליצירת טבלאות ספציפיות לפרויקט
CREATE OR REPLACE FUNCTION create_project_tables(project_id uuid)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  stages_table_name text := 'project_' || project_id::text || '_stages';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '_') || '_tasks_pid_check';
  stages_constraint_name text := 'proj_' || replace(project_id::text, '-', '_') || '_stages_pid_check';
  
  -- שמות אינדקסים נקיים ממקפים
  clean_table_name text := replace(project_id::text, '-', '_');
  idx_hierarchical text := 'proj_' || clean_table_name || '_hier_idx';
  idx_parent text := 'proj_' || clean_table_name || '_parent_idx';
  idx_status text := 'proj_' || clean_table_name || '_status_idx';
  idx_order text := 'proj_' || clean_table_name || '_order_idx';
BEGIN
  -- יצירת טבלת משימות ספציפית לפרויקט אם לא קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL,
        stage_id uuid,
        title text NOT NULL,
        description text,
        category text,
        status text NOT NULL DEFAULT ''todo'',
        priority text NOT NULL DEFAULT ''medium'',
        responsible text,
        estimated_hours numeric,
        actual_hours numeric,
        start_date date,
        due_date date,
        completed_date date,
        budget numeric,
        dependencies uuid[],
        assignees uuid[],
        watchers uuid[],
        labels text[],
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        hierarchical_number text,
        parent_task_id uuid,
        is_template boolean DEFAULT false,
        original_task_id uuid,
        CONSTRAINT %I CHECK (project_id = %L)
      )', tasks_table_name, constraint_name, project_id);
    
    -- יצירת אינדקסים עם שמות מותאמים ללא מקפים
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', idx_hierarchical, tasks_table_name);
    EXECUTE format('CREATE INDEX %I ON %I (parent_task_id)', idx_parent, tasks_table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', idx_status, tasks_table_name);
    
    -- ביטול RLS על הטבלה החדשה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    
    -- הענקת הרשאות גישה
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO authenticated', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO service_role', tasks_table_name);
    
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % נוצרה בהצלחה', project_id;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % כבר קיימת', project_id;
  END IF;
  
  -- יצירת טבלת שלבים ספציפית לפרויקט אם לא קיימת
  IF NOT check_table_exists(stages_table_name) THEN
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL,
        title text NOT NULL,
        description text,
        color text DEFAULT ''#3182CE'',
        status text DEFAULT ''active'',
        progress int DEFAULT 0,
        order_num int,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT %I CHECK (project_id = %L)
      )', stages_table_name, stages_constraint_name, project_id);
    
    -- יצירת אינדקסים עם שם מותאם ללא מקפים
    EXECUTE format('CREATE INDEX %I ON %I (order_num)', idx_order, stages_table_name);
    
    -- ביטול RLS על הטבלה החדשה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    
    -- הענקת הרשאות גישה
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO authenticated', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO service_role', stages_table_name);
    
    RAISE NOTICE 'טבלת שלבים ספציפית לפרויקט % נוצרה בהצלחה', project_id;
  ELSE
    RAISE NOTICE 'טבלת שלבים ספציפית לפרויקט % כבר קיימת', project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- שימוש בפונקציה עם פרמטר UUID (דוגמה בלבד)
-- SELECT create_project_tables('00000000-0000-0000-0000-000000000000'); 