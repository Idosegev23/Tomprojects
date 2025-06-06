-- כל הפונקציות הדרושות ליצירת טבלאות פרויקט ואתחול הנתונים במקום אחד

-- בדיקה אם טבלה קיימת
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

-- פונקציה ליצירת טבלת שלבים לפרויקט
CREATE OR REPLACE FUNCTION create_project_stages_table(project_id_param uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_stages';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת stages המקורית
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title text NOT NULL,
        hierarchical_number text,
        due_date date,
        status text DEFAULT ''pending'',
        progress integer DEFAULT 0,
        color text,
        parent_stage_id uuid,
        dependencies text[],
        sort_order integer,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
      )', table_name);
    
    -- הענקת הרשאות לטבלה החדשה
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', table_name);
    
    -- ביטול RLS
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    
    RAISE NOTICE 'Stages table % created successfully', table_name;
  ELSE
    RAISE NOTICE 'Stages table % already exists', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה ליצירת טבלת משימות לפרויקט
CREATE OR REPLACE FUNCTION create_project_table(project_id_param uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks המקורית
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
    
    -- יצירת אינדקס על hierarchical_number
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (hierarchical_number)',
                  table_name || '_hierarchical_idx', table_name);
    
    -- הענקת הרשאות לטבלה החדשה
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', table_name);
    
    -- ביטול RLS
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
    
    RAISE NOTICE 'Tasks table % created successfully', table_name;
  ELSE
    RAISE NOTICE 'Tasks table % already exists', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להעתקת שלבים לטבלת פרויקט
CREATE OR REPLACE FUNCTION copy_stages_to_project_table(project_id_param uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(stages_table_name) THEN
    -- יצירת טבלת שלבים חדשה
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- שלב 1: העתקת שלבים בצורה בסיסית עם שדות מינימליים בלבד
  EXECUTE format('
    INSERT INTO %I (id, project_id, title, created_at, updated_at)
    SELECT id, %L, title, now(), now()
    FROM stages
    WHERE project_id = %L OR project_id IS NULL
    ON CONFLICT (id) DO NOTHING
  ', stages_table_name, project_id_param, project_id_param);
  
  -- שלב 2: עדכון עמודות נוספות
  BEGIN
    EXECUTE format('
      UPDATE %I t
      SET 
        status = s.status,
        color = s.color,
        hierarchical_number = s.hierarchical_number,
        progress = s.progress
      FROM stages s
      WHERE t.id = s.id AND (s.project_id = %L OR s.project_id IS NULL)
    ', stages_table_name, project_id_param);
  EXCEPTION WHEN OTHERS THEN
    -- מעדכנים רק את העמודות שקיימות בטבלה
    RAISE NOTICE 'לא ניתן לעדכן את כל העמודות, מתעלם משגיאה: %', SQLERRM;
  END;
  
  -- יוצרים שלבים ברירת מחדל אם אין כאלה
  EXECUTE format('
    INSERT INTO %I (id, project_id, title, created_at, updated_at, status, color)
    SELECT 
      uuid_generate_v4(), %L, ''שלב ברירת מחדל'', now(), now(), ''pending'', ''#3182CE''
    WHERE NOT EXISTS (SELECT 1 FROM %I)
  ', stages_table_name, project_id_param, stages_table_name);
  
  RAISE NOTICE 'Stages copied to project table % successfully', stages_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להעתקת משימה לטבלת פרויקט
CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id_param uuid, project_id_param uuid)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_rec record;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id_param);
  END IF;
  
  -- בדיקה אם המשימה קיימת
  SELECT * INTO task_rec FROM tasks WHERE id = task_id_param;
  
  IF task_rec.id IS NOT NULL THEN
    -- העתקת המשימה לטבלה הייעודית
    BEGIN
      EXECUTE format('
        INSERT INTO %I (
          id, title, description, project_id, stage_id, 
          parent_task_id, hierarchical_number, due_date,
          status, priority, category, responsible, 
          dropbox_folder, created_at, updated_at
        ) VALUES (
          %L, %L, %L, %L, %L, 
          %L, %L, %L, 
          %L, %L, %L, %L, 
          %L, %L, %L
        )
        ON CONFLICT (id) DO NOTHING
      ', 
        tasks_table_name,
        task_rec.id, 
        task_rec.title, 
        task_rec.description, 
        project_id_param, 
        task_rec.stage_id,
        task_rec.parent_task_id, 
        task_rec.hierarchical_number, 
        task_rec.due_date,
        task_rec.status, 
        task_rec.priority, 
        task_rec.category, 
        task_rec.responsible,
        task_rec.dropbox_folder, 
        task_rec.created_at, 
        task_rec.updated_at
      );
      
      RAISE NOTICE 'Task % copied to project table %', task_id_param, project_id_param;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error copying task % to project table %: %', task_id_param, project_id_param, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Task % not found', task_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה ראשית לאתחול טבלאות ונתוני פרויקט
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_id uuid;
BEGIN
  -- 1. וודא שטבלאות הפרויקט קיימות
  PERFORM create_project_table(project_id_param);
  PERFORM create_project_stages_table(project_id_param);
  
  -- 2. העתק שלבים (אם ביקשו)
  IF create_default_stages THEN
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. טיפול במשימות (אם ביקשו)
  IF create_default_tasks THEN
    -- טיפול במשימות נבחרות (אם יש)
    IF selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0 THEN
      -- העתקת משימות נבחרות
      FOREACH task_id IN ARRAY selected_task_ids
      LOOP
        BEGIN
          PERFORM copy_task_to_project_table(task_id, project_id_param);
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error copying task % to project %: %', task_id, project_id_param, SQLERRM;
        END;
      END LOOP;
    ELSE
      -- צור משימות ברירת מחדל בטבלה הייעודית
      EXECUTE format('
        INSERT INTO %I (id, project_id, title, status, created_at, updated_at)
        VALUES 
          (uuid_generate_v4(), %L, ''משימה ראשונה'', ''todo'', now(), now()),
          (uuid_generate_v4(), %L, ''משימה שנייה'', ''todo'', now(), now())
        ON CONFLICT DO NOTHING
      ', tasks_table_name, project_id_param, project_id_param);
    END IF;
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציית טריגר ליצירה אוטומטית של טבלאות פרויקט
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט
  PERFORM init_project_tables_and_data(NEW.id, true, true, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לכל הפונקציות
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role;

-- יצירת הטריגר על טבלת הפרויקטים
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- הודעה על סיום
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'הפונקציות והטריגר הותקנו בהצלחה!';
  RAISE NOTICE 'כעת בכל פעם שנוצר פרויקט חדש, ייווצרו עבורו טבלאות משימות ושלבים';
  RAISE NOTICE '================================================';
END $$; 