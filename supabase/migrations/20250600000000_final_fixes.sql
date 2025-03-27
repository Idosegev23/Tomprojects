-- פונקציות לאתחול טבלאות ונתוני פרויקט

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

-- פונקציה לבניית טבלת שלבים מהמשימות שנבחרו
CREATE OR REPLACE FUNCTION build_stages_from_selected_tasks(project_id_param uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stage_ids text[];
  stage_id uuid;
  rec record;
  i integer := 0;
BEGIN
  -- בדיקה אם טבלת השלבים קיימת
  IF NOT check_table_exists(stages_table_name) THEN
    -- יצירת טבלת שלבים חדשה
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- בדיקה אם יש משימות בטבלת המשימות של הפרויקט
  EXECUTE format('
    SELECT COUNT(*) = 0 FROM %I
  ', tasks_table_name) INTO rec;
  
  -- אם אין משימות, ניצור שלב ברירת מחדל
  IF rec.count THEN
    EXECUTE format('
      INSERT INTO %I (
        id, title, hierarchical_number, status, progress, color, 
        created_at, updated_at, project_id
      )
      VALUES 
        (uuid_generate_v4(), ''שלב ברירת מחדל'', ''1'', ''pending'', 0, ''#3182CE'',
        now(), now(), %L)
      ON CONFLICT DO NOTHING
    ', stages_table_name, project_id_param);
    
    RETURN;
  END IF;
  
  -- איסוף stage_ids מהמשימות שהועתקו
  EXECUTE format('
    SELECT ARRAY_AGG(DISTINCT stage_id) FROM %I WHERE stage_id IS NOT NULL
  ', tasks_table_name) INTO stage_ids;
  
  -- אם יש stage_ids במשימות, נעתיק אותם מטבלת השלבים הראשית
  IF stage_ids IS NOT NULL AND array_length(stage_ids, 1) > 0 THEN
    FOREACH stage_id IN ARRAY stage_ids
    LOOP
      i := i + 1;
      BEGIN
        -- העתקת השלב מהטבלה המרכזית
        EXECUTE format('
          INSERT INTO %I (
            id, title, hierarchical_number, due_date, status, progress, 
            color, parent_stage_id, dependencies, sort_order, 
            created_at, updated_at, project_id
          )
          SELECT 
            id, title, hierarchical_number, due_date, status, progress, 
            color, parent_stage_id, dependencies, %L, 
            now(), now(), %L
          FROM stages
          WHERE id = %L
          ON CONFLICT (id) DO NOTHING
        ', stages_table_name, i, project_id_param, stage_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error copying stage % to project stages table: %', stage_id, SQLERRM;
      END;
    END LOOP;
  ELSE
    -- אם אין stage_ids, נייצר שלבים לפי קטגוריות המשימות
    -- קודם נבדוק אם יש קטגוריות
    EXECUTE format('
      SELECT COUNT(DISTINCT category) > 0 FROM %I WHERE category IS NOT NULL
    ', tasks_table_name) INTO rec;
    
    IF rec.count THEN
      -- יצירת שלבים לפי קטגוריות
      i := 0;
      FOR rec IN EXECUTE format('
        SELECT DISTINCT category, MIN(created_at) as created_at
        FROM %I 
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY MIN(created_at)
      ', tasks_table_name)
      LOOP
        i := i + 1;
        EXECUTE format('
          INSERT INTO %I (
            id, title, hierarchical_number, status, progress, color, 
            created_at, updated_at, project_id, sort_order
          )
          VALUES 
            (uuid_generate_v4(), %L, %L, ''pending'', 0, 
             CASE 
               WHEN %L IS NULL THEN ''#3182CE'' 
               ELSE ''#3182CE'' 
             END,
             %L, now(), %L, %L)
          ON CONFLICT DO NOTHING
          RETURNING id
        ', stages_table_name, 
           COALESCE(rec.category, 'שלב כללי'), 
           i::text, 
           rec.category,
           COALESCE(rec.created_at, now()),
           project_id_param,
           i) INTO stage_id;
        
        -- עדכון ה-stage_id במשימות המתאימות
        EXECUTE format('
          UPDATE %I
          SET stage_id = %L
          WHERE category = %L
        ', tasks_table_name, stage_id, rec.category);
      END LOOP;
    ELSE
      -- אם אין קטגוריות, ניצור שלב ברירת מחדל
      EXECUTE format('
        INSERT INTO %I (
          id, title, hierarchical_number, status, progress, color, 
          created_at, updated_at, project_id, sort_order
        )
        VALUES 
          (uuid_generate_v4(), ''שלב ברירת מחדל'', ''1'', ''pending'', 0, ''#3182CE'',
          now(), now(), %L, 1)
        ON CONFLICT DO NOTHING
        RETURNING id
      ', stages_table_name, project_id_param) INTO stage_id;
      
      -- עדכון כל המשימות לשלב ברירת המחדל
      EXECUTE format('
        UPDATE %I
        SET stage_id = %L
        WHERE stage_id IS NULL
      ', tasks_table_name, stage_id);
    END IF;
  END IF;
  
  RAISE NOTICE 'Stages built for project % successfully', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לאתחול טבלאות הפרויקט
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id_param uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  task_id uuid;
  project_record record;
BEGIN
  -- בדיקה שהפרויקט קיים
  SELECT * INTO project_record FROM projects WHERE id = project_id_param;
  IF project_record.id IS NULL THEN
    RAISE EXCEPTION 'Project with ID % does not exist', project_id_param;
  END IF;

  -- 1. יצירת טבלת המשימות לפרויקט
  PERFORM create_project_table(project_id_param);
  
  -- 2. העתקת המשימות שנבחרו (אם יש)
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
  ELSIF create_default_tasks THEN
    -- יצירת משימות ברירת מחדל אם אין משימות נבחרות
    BEGIN
      EXECUTE format('
        INSERT INTO %I (
          id, title, description, project_id, status, priority, 
          hierarchical_number, created_at, updated_at
        )
        VALUES 
          (uuid_generate_v4(), ''משימה ראשונה'', ''תיאור משימה ראשונה'', %L, ''todo'', ''medium'', ''1'', now(), now()),
          (uuid_generate_v4(), ''משימה שנייה'', ''תיאור משימה שנייה'', %L, ''todo'', ''medium'', ''2'', now(), now())
        ON CONFLICT DO NOTHING
      ', tasks_table_name, project_id_param, project_id_param);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating default tasks for project %: %', project_id_param, SQLERRM;
    END;
  END IF;
  
  -- 3. בניית טבלת השלבים בהתאם למשימות שנבחרו
  IF create_default_stages THEN
    PERFORM build_stages_from_selected_tasks(project_id_param);
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לכל הפונקציות
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_stages_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_table(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION build_stages_from_selected_tasks(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;

-- פונקציה לקבלת רשימת טבלאות לפי תחילית
CREATE OR REPLACE FUNCTION list_tables_with_prefix(prefix_param text)
RETURNS text[] AS $$
DECLARE
  tables text[];
BEGIN
  SELECT ARRAY_AGG(tablename) INTO tables
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename LIKE prefix_param || '%';
  
  RETURN tables;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית רשימת טבלאות
GRANT EXECUTE ON FUNCTION list_tables_with_prefix(text) TO anon, authenticated, service_role;

-- טריגר שיקרא לפונקציה init_project_tables_and_data בזמן יצירת פרויקט
-- פונקציית הטריגר
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט
  PERFORM init_project_tables_and_data(NEW.id, true, true, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגר על טבלת הפרויקטים
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- ================================================================
-- פונקציה לסנכרון שלבים ומשימות עבור פרויקט ספציפי
-- ================================================================
CREATE OR REPLACE FUNCTION sync_stages_and_tasks_by_project(project_id_param uuid)
RETURNS json AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  task_rec record;
  stage_rec record;
  updated_count integer := 0;
  stage_ids uuid[];
  stage_id uuid;
  result json;
  tasks_table_exists boolean;
  stages_table_exists boolean;
  stage_count_check record;
  fix_result boolean;
BEGIN
  -- 0. תיקון מבנה טבלת השלבים אם קיימת
  fix_result := fix_project_stages_table(project_id_param);
  
  -- 1. וידוא שטבלאות הפרויקט קיימות
  tasks_table_exists := check_table_exists(tasks_table_name);
  stages_table_exists := check_table_exists(stages_table_name);
  
  IF NOT tasks_table_exists THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'טבלת המשימות לא קיימת',
      'tasks_updated', 0
    );
  END IF;
  
  IF NOT stages_table_exists THEN
    -- יצירת טבלת שלבים אם היא לא קיימת
    PERFORM create_project_stages_table(project_id_param);
    stages_table_exists := true;
  END IF;
  
  -- 2. וידוא שיש שלבים בטבלת השלבים הייחודית
  EXECUTE format('SELECT COUNT(*) FROM %I', stages_table_name) INTO stage_count_check;
  
  IF stage_count_check.count = 0 THEN
    -- אין שלבים בטבלה הייחודית, נעתיק שלבים מהטבלה הכללית
    PERFORM copy_stages_to_project_table(project_id_param);
  END IF;
  
  -- 3. איסוף כל מזהי השלבים מטבלת השלבים הייחודית
  EXECUTE format('SELECT array_agg(id) FROM %I', stages_table_name) INTO stage_ids;
  
  IF stage_ids IS NULL OR array_length(stage_ids, 1) = 0 THEN
    -- עדיין אין שלבים בטבלה הייחודית, ניצור שלב ברירת מחדל
    EXECUTE format('
      INSERT INTO %I (
        id, title, project_id, status, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), ''שלב ברירת מחדל'', %L, ''active'', now(), now()
      ) RETURNING id', 
      stages_table_name, project_id_param
    ) INTO stage_rec;
    
    -- עדכון מערך השלבים
    stage_ids := ARRAY[stage_rec.id];
  END IF;
  
  -- 4. מציאת כל המשימות שמצביעות לשלבים שלא קיימים בטבלת השלבים הייחודית
  -- או שיש להן שלב NULL ועדכון שלהן לשלב ברירת מחדל
  
  -- בחירת שלב ברירת מחדל (הראשון במערך)
  stage_id := stage_ids[1];
  
  -- עדכון משימות שאין להן שלב או שהשלב לא קיים בטבלת השלבים הייחודית
  EXECUTE format('
    UPDATE %I
    SET stage_id = %L
    WHERE stage_id IS NULL OR stage_id NOT IN (SELECT id FROM %I)
    RETURNING id',
    tasks_table_name, stage_id, stages_table_name
  ) INTO task_rec;
  
  IF task_rec.id IS NOT NULL THEN
    -- ספירת מספר המשימות שעודכנו
    EXECUTE format('
      SELECT COUNT(*) FROM %I WHERE stage_id = %L',
      tasks_table_name, stage_id
    ) INTO updated_count;
  END IF;
  
  -- 5. החזרת תוצאות הסנכרון
  EXECUTE format('
    SELECT 
      json_build_object(
        ''success'', true,
        ''message'', ''סנכרון שלבים ומשימות הושלם בהצלחה'',
        ''project_id'', %L,
        ''stages_count'', (SELECT COUNT(*) FROM %I),
        ''tasks_count'', (SELECT COUNT(*) FROM %I),
        ''tasks_updated'', %L
      )
  ', project_id_param, stages_table_name, tasks_table_name, updated_count) INTO result;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', project_id_param,
    'tasks_updated', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION sync_stages_and_tasks_by_project(uuid) TO anon, authenticated, service_role;

-- פונקציה לניקוי טבלאות כפולות
CREATE OR REPLACE FUNCTION cleanup_duplicate_project_tables(project_id_param uuid)
RETURNS json AS $$
DECLARE
  base_tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  base_stages_table_name text := 'project_' || project_id_param::text || '_stages';
  table_list text[];
  table_name text;
  duplicate_tasks_tables text[] := '{}';
  duplicate_stages_tables text[] := '{}';
  tasks_dropped integer := 0;
  stages_dropped integer := 0;
BEGIN
  -- קבלת רשימת הטבלאות שמתחילות בתחילית של המזהה
  table_list := list_tables_with_prefix('project_' || project_id_param::text);
  
  -- ברירת מחדל אם אין טבלאות
  IF table_list IS NULL OR array_length(table_list, 1) IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'לא נמצאו טבלאות לפרויקט',
      'project_id', project_id_param,
      'tables_found', 0
    );
  END IF;
  
  -- זיהוי טבלאות כפולות של משימות
  FOREACH table_name IN ARRAY table_list
  LOOP
    IF table_name LIKE '%\_tasks' AND table_name != base_tasks_table_name THEN
      duplicate_tasks_tables := array_append(duplicate_tasks_tables, table_name);
    ELSIF table_name LIKE '%\_stages' AND table_name != base_stages_table_name THEN
      duplicate_stages_tables := array_append(duplicate_stages_tables, table_name);
    END IF;
  END LOOP;
  
  -- עוד בדיקה אם אין טבלאות כפולות
  IF array_length(duplicate_tasks_tables, 1) IS NULL AND array_length(duplicate_stages_tables, 1) IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'לא נמצאו טבלאות כפולות',
      'project_id', project_id_param,
      'tables_found', array_length(table_list, 1)
    );
  END IF;
  
  -- טיפול בטבלאות משימות כפולות
  IF array_length(duplicate_tasks_tables, 1) > 0 THEN
    -- וידוא שטבלת המשימות העיקרית קיימת
    IF NOT check_table_exists(base_tasks_table_name) THEN
      PERFORM create_project_table(project_id_param);
    END IF;
    
    -- העברת נתונים מטבלאות הכפולות לטבלה העיקרית
    FOREACH table_name IN ARRAY duplicate_tasks_tables
    LOOP
      -- העתקת נתונים לטבלת המשימות העיקרית
      BEGIN
        EXECUTE format('
          INSERT INTO %I (
            id, title, description, project_id, stage_id, parent_task_id, 
            hierarchical_number, due_date, status, priority, category, 
            responsible, dropbox_folder, created_at, updated_at
          )
          SELECT 
            id, title, description, project_id, stage_id, parent_task_id, 
            hierarchical_number, due_date, status, priority, category, 
            responsible, dropbox_folder, created_at, updated_at
          FROM %I
          ON CONFLICT (id) DO NOTHING',
          base_tasks_table_name, table_name
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה בהעתקת נתונים מטבלה % לטבלה %: %', table_name, base_tasks_table_name, SQLERRM;
      END;
      
      -- מחיקת הטבלה הכפולה
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I', table_name);
        tasks_dropped := tasks_dropped + 1;
        
        RAISE NOTICE 'טבלת משימות כפולה % נמחקה', table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה במחיקת טבלה %: %', table_name, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  -- טיפול בטבלאות שלבים כפולות
  IF array_length(duplicate_stages_tables, 1) > 0 THEN
    -- וידוא שטבלת השלבים העיקרית קיימת
    IF NOT check_table_exists(base_stages_table_name) THEN
      PERFORM create_project_stages_table(project_id_param);
    END IF;
    
    -- העברת נתונים מטבלאות הכפולות לטבלה העיקרית
    FOREACH table_name IN ARRAY duplicate_stages_tables
    LOOP
      -- העתקת נתונים לטבלת השלבים העיקרית
      BEGIN
        EXECUTE format('
          INSERT INTO %I (
            id, title, hierarchical_number, due_date, status, progress, 
            color, parent_stage_id, dependencies, sort_order, 
            created_at, updated_at, project_id
          )
          SELECT 
            id, title, hierarchical_number, due_date, status, progress, 
            color, parent_stage_id, dependencies, sort_order, 
            created_at, updated_at, project_id
          FROM %I
          ON CONFLICT (id) DO NOTHING',
          base_stages_table_name, table_name
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה בהעתקת נתונים מטבלה % לטבלה %: %', table_name, base_stages_table_name, SQLERRM;
      END;
      
      -- מחיקת הטבלה הכפולה
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I', table_name);
        stages_dropped := stages_dropped + 1;
        
        RAISE NOTICE 'טבלת שלבים כפולה % נמחקה', table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'שגיאה במחיקת טבלה %: %', table_name, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  -- עדכון תוצאה
  RETURN json_build_object(
    'success', true,
    'message', 'ניקוי טבלאות כפולות הושלם בהצלחה',
    'project_id', project_id_param,
    'tables_found', array_length(table_list, 1),
    'duplicate_tasks_tables', duplicate_tasks_tables,
    'duplicate_stages_tables', duplicate_stages_tables,
    'tasks_tables_dropped', tasks_dropped,
    'stages_tables_dropped', stages_dropped
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', project_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית ניקוי טבלאות כפולות
GRANT EXECUTE ON FUNCTION cleanup_duplicate_project_tables(uuid) TO anon, authenticated, service_role;

-- פונקציה לעדכון מבנה טבלת השלבים של פרויקט ספציפי
CREATE OR REPLACE FUNCTION fix_project_stages_table(project_id_param uuid)
RETURNS boolean AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_stages';
  cols_info record;
  has_dependencies boolean := false;
  has_sort_order boolean := false;
  has_order_num boolean := false;
  dependencies_type text;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- הטבלה לא קיימת - ניצור אותה מחדש עם המבנה הנכון
    PERFORM create_project_stages_table(project_id_param);
    RETURN true;
  END IF;

  -- בדיקת קיום עמודות ספציפיות
  FOR cols_info IN 
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = table_name
  LOOP
    IF cols_info.column_name = 'dependencies' THEN
      has_dependencies := true;
      dependencies_type := cols_info.data_type;
    ELSIF cols_info.column_name = 'sort_order' THEN
      has_sort_order := true;
    ELSIF cols_info.column_name = 'order_num' THEN
      has_order_num := true;
    END IF;
  END LOOP;

  -- וידוא שיש עמודת dependencies מסוג מערך טקסט
  IF NOT has_dependencies THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN dependencies text[]', table_name);
    RAISE NOTICE 'הוספת עמודת dependencies לטבלה %', table_name;
  ELSIF dependencies_type <> 'ARRAY' THEN
    -- התאמת סוג הנתונים של dependencies
    EXECUTE format('ALTER TABLE %I ALTER COLUMN dependencies TYPE text[] USING NULL', table_name);
    RAISE NOTICE 'שינוי סוג עמודת dependencies ל-text[] בטבלה %', table_name;
  END IF;

  -- וידוא שיש עמודת sort_order
  IF NOT has_sort_order THEN
    IF has_order_num THEN
      -- שינוי שם העמודה מ-order_num ל-sort_order
      EXECUTE format('ALTER TABLE %I RENAME COLUMN order_num TO sort_order', table_name);
      RAISE NOTICE 'שינוי שם עמודה מ-order_num ל-sort_order בטבלה %', table_name;
    ELSE
      -- הוספת עמודת sort_order
      EXECUTE format('ALTER TABLE %I ADD COLUMN sort_order integer', table_name);
      RAISE NOTICE 'הוספת עמודת sort_order לטבלה %', table_name;
    END IF;
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'שגיאה בתיקון מבנה טבלת השלבים %: %', table_name, SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציית תיקון טבלת שלבים
GRANT EXECUTE ON FUNCTION fix_project_stages_table(uuid) TO anon, authenticated, service_role;

-- פונקציה לעדכון שלב למשימות לפי תחילית של מספר היררכי
CREATE OR REPLACE FUNCTION update_tasks_stage_by_hierarchical_prefix(
  project_id_param uuid,
  hierarchical_prefix_param text,
  stage_id_param uuid
)
RETURNS integer AS $$
DECLARE
  table_name text := 'project_' || project_id_param::text || '_tasks';
  update_count integer;
BEGIN
  -- וידוא שטבלת המשימות קיימת
  IF NOT check_table_exists(table_name) THEN
    RAISE EXCEPTION 'טבלת המשימות % אינה קיימת', table_name;
  END IF;
  
  -- עדכון כל המשימות שמתחילות במספר ההיררכי המבוקש
  EXECUTE format('
    UPDATE %I
    SET stage_id = %L, updated_at = now()
    WHERE hierarchical_number LIKE %L || ''%%''
    AND project_id = %L',
    table_name,
    stage_id_param,
    hierarchical_prefix_param,
    project_id_param
  );
  
  -- קבלת מספר השורות שעודכנו
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  RETURN update_count;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'שגיאה בעדכון שלב למשימות לפי מספר היררכי: %', SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION update_tasks_stage_by_hierarchical_prefix(uuid, text, uuid) TO anon, authenticated, service_role;

-- יצירת טבלת היסטוריית שלבים אם היא לא קיימת
CREATE OR REPLACE FUNCTION ensure_stages_history_table()
RETURNS boolean AS $$
BEGIN
  -- בדיקה האם הטבלה קיימת
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'stages_history'
  ) THEN
    -- יצירת הטבלה אם היא לא קיימת
    CREATE TABLE IF NOT EXISTS stages_history (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      stage_id uuid NOT NULL,
      operation text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
      changed_by text, -- מי ביצע את השינוי
      old_data jsonb, -- נתונים לפני השינוי
      new_data jsonb, -- נתונים אחרי השינוי
      changed_at timestamptz DEFAULT now() -- מתי בוצע השינוי
    );
    
    -- הענקת הרשאות לטבלה
    GRANT ALL ON TABLE stages_history TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stages_history TO authenticated;
    GRANT SELECT ON TABLE stages_history TO anon;
    
    -- ביטול RLS על הטבלה
    ALTER TABLE stages_history DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'טבלת היסטוריית שלבים נוצרה בהצלחה';
  ELSE
    -- הענקת הרשאות לטבלה הקיימת
    GRANT ALL ON TABLE stages_history TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stages_history TO authenticated;
    GRANT SELECT ON TABLE stages_history TO anon;
    
    -- ביטול RLS על הטבלה
    ALTER TABLE stages_history DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'הרשאות עודכנו לטבלת היסטוריית שלבים הקיימת';
  END IF;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'שגיאה ביצירת טבלת היסטוריית שלבים: %', SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הפעלת הפונקציה בעת טעינת המיגרציה
SELECT ensure_stages_history_table();

-- הענקת הרשאות לפונקציה
GRANT EXECUTE ON FUNCTION ensure_stages_history_table() TO anon, authenticated, service_role; 