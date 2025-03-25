-- מיגרציה לתיקון מפתח זר בטבלת משימות של פרויקט
-- תאריך: 02-04-2025

-- הבעיה: בעת יצירת טבלת משימות לפרויקט, המפתח הזר stage_id מפנה לטבלת stages הכללית
-- במקום לטבלת השלבים הספציפית לפרויקט. לכן נכשלת הכנסת משימות ברירת מחדל.

-- עדכון הפונקציה create_project_tables כך שתיצור מפתח זר מתאים
CREATE OR REPLACE FUNCTION create_project_tables(project_id uuid)
RETURNS void AS $$
DECLARE
  project_id_safe text := replace(project_id::text, '-', '_');
  
  -- שמות הטבלאות
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  stages_table_name text := 'project_' || project_id::text || '_stages';
  
  -- שמות אילוצים
  tasks_constraint_name text := 'proj_' || project_id_safe || '_tasks_pid_check';
  stages_constraint_name text := 'proj_' || project_id_safe || '_stages_pid_check';
  stage_fk_constraint_name text := 'project_' || project_id_safe || '_task_stage_id_fkey';
  
  -- שמות אינדקסים
  idx_hierarchical text := 'proj_' || project_id_safe || '_hier_idx';
  idx_parent text := 'proj_' || project_id_safe || '_parent_idx';
  idx_status text := 'proj_' || project_id_safe || '_status_idx';
  idx_order text := 'proj_' || project_id_safe || '_order_idx';
BEGIN
  -- יצירת טבלת שלבים ספציפית לפרויקט אם לא קיימת
  IF NOT check_table_exists(stages_table_name) THEN
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    
    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (order_num)', idx_order, stages_table_name);
    
    -- ביטול RLS על הטבלה החדשה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    
    -- הענקת הרשאות גישה מלאות לכל המשתמשים
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
  END IF;
  
  -- יצירת טבלת משימות ספציפית לפרויקט אם לא קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid,  -- מפתח זר יוגדר בהמשך
        parent_task_id uuid,
        title text NOT NULL,
        description text,
        status text DEFAULT ''todo'',
        priority text DEFAULT ''medium'',
        category text,
        due_date date,
        responsible uuid,
        hierarchical_number text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        
        -- שדות נוספים שחסרים בהגדרה המקורית
        estimated_hours numeric,
        actual_hours numeric, 
        start_date date,
        completed_date date,
        budget numeric,
        dependencies text[],
        assignees text[],
        watchers text[],
        labels text[],
        is_template boolean DEFAULT false,
        original_task_id uuid,
        dropbox_folder text,
        
        CONSTRAINT %I CHECK (project_id = %L)
      )', tasks_table_name, tasks_constraint_name, project_id);
    
    -- הוספת אילוץ מפתח זר לטבלת השלבים הספציפית לפרויקט
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (stage_id) 
      REFERENCES %I(id) 
      ON DELETE SET NULL
    ', tasks_table_name, stage_fk_constraint_name, stages_table_name);
    
    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', idx_hierarchical, tasks_table_name);
    EXECUTE format('CREATE INDEX %I ON %I (parent_task_id)', idx_parent, tasks_table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', idx_status, tasks_table_name);
    
    -- ביטול RLS על הטבלה החדשה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    
    -- הענקת הרשאות גישה מלאות לכל המשתמשים
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
  END IF;
  
  RAISE NOTICE 'טבלאות הפרויקט % נוצרו בהצלחה', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- אם יש טבלאות קיימות שכבר נוצרו עם הבעיה, נוסיף פונקציה לתיקון עבורן
CREATE OR REPLACE FUNCTION fix_existing_project_tables()
RETURNS void AS $$
DECLARE
  r record;
  table_rec record;
  project_id uuid;
  tasks_table_name text;
  stages_table_name text;
  stage_fk_constraint_name text;
  project_id_safe text;
BEGIN
  -- עוברים על כל הפרויקטים הקיימים
  FOR r IN SELECT id FROM projects LOOP
    project_id := r.id;
    project_id_safe := replace(project_id::text, '-', '_');
    tasks_table_name := 'project_' || project_id::text || '_tasks';
    stages_table_name := 'project_' || project_id::text || '_stages';
    stage_fk_constraint_name := 'project_' || project_id_safe || '_task_stage_id_fkey';
    
    -- בדיקה אם הטבלאות קיימות
    IF check_table_exists(tasks_table_name) AND check_table_exists(stages_table_name) THEN
      -- בדיקה אם קיים מפתח זר לטבלת stages
      FOR table_rec IN 
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = tasks_table_name
        AND con.contype = 'f'
        AND con.confrelid = (SELECT oid FROM pg_class WHERE relname = 'stages')
      LOOP
        -- מחיקת האילוץ הישן שמפנה לטבלת stages הכללית
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tasks_table_name, table_rec.conname);
        
        -- הוספת אילוץ חדש שמפנה לטבלת השלבים הספציפית
        EXECUTE format('
          ALTER TABLE %I 
          ADD CONSTRAINT %I 
          FOREIGN KEY (stage_id) 
          REFERENCES %I(id) 
          ON DELETE SET NULL
        ', tasks_table_name, stage_fk_constraint_name, stages_table_name);
        
        RAISE NOTICE 'תוקן מפתח זר בטבלה % לפרויקט %', tasks_table_name, project_id;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הרצת הפונקציה לתיקון טבלאות קיימות
SELECT fix_existing_project_tables();

-- הענקת הרשאות לפונקציות המעודכנות
GRANT EXECUTE ON FUNCTION create_project_tables(uuid) TO anon, authenticated, service_role; 