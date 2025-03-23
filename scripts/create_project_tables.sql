-- סקריפט ליצירת טבלאות ספציפיות לפרויקט
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

-- שים לב: החלף את ה-ID בפרמטר למטה עם מזהה הפרויקט שלך
-- פונקציה ליצירת טבלאות ספציפיות לפרויקט
DO $$
DECLARE
  project_id uuid := '53d81c5a-4a86-4548-99f1-807efaf709df'; -- החלף בID של הפרויקט הספציפי
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
        project_id uuid NOT NULL REFERENCES projects(id),
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
        project_id uuid NOT NULL REFERENCES projects(id),
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
$$;

-- יצירת טבלאות לפרויקט הקודם
DO $$
DECLARE
  previous_project_id uuid := '5d08c5ee-1ba3-4e70-96c5-e488745f2519';
  previous_project_id_safe text;
BEGIN
  -- המרה למזהה בטוח ללא מקפים
  previous_project_id_safe := replace(previous_project_id::text, '-', '_');
  
  -- קריאה לפונקציה שיוצרת את הטבלאות אם הן לא קיימות
  PERFORM create_project_tables(previous_project_id);
  
  -- הענקת הרשאות גישה מפורשות לטבלאות הפרויקט
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE project_%s_tasks TO anon, authenticated, service_role', previous_project_id_safe);
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE project_%s_stages TO anon, authenticated, service_role', previous_project_id_safe);
  
  RAISE NOTICE 'הטבלאות לפרויקט % נוצרו/עודכנו והרשאות הוענקו בהצלחה', previous_project_id;
END $$;

-- יצירת טבלאות לפרויקט החדש
DO $$
DECLARE
  project_id uuid := '5b291208-e165-4e7c-abaf-b26e41a8d31d';
  project_id_safe text;
  task_table_name text;
  stage_table_name text;
BEGIN
  -- המרה למזהה בטוח ללא מקפים
  project_id_safe := replace(project_id::text, '-', '_');
  task_table_name := 'project_' || project_id_safe || '_tasks';
  stage_table_name := 'project_' || project_id_safe || '_stages';
  
  -- מחיקת טבלאות אם קיימות ויש להן בעיות
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', task_table_name);
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', stage_table_name);
  
  -- קריאה לפונקציה שיוצרת את הטבלאות
  PERFORM create_project_tables(project_id);
  
  -- הענקת הרשאות גישה מפורשות לטבלאות הפרויקט
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', task_table_name);
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stage_table_name);
  
  -- ביטול RLS
  EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', task_table_name);
  EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stage_table_name);
  
  RAISE NOTICE 'הטבלאות לפרויקט % נוצרו/עודכנו, הרשאות הוענקו ו-RLS בוטל בהצלחה', project_id;
END $$; 