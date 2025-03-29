-- migration_name: 20251001000000_update_functions_after_stages_removal
-- description: עדכון פונקציות רלוונטיות לאחר הסרת טבלאות שלבים ספציפיות לפרויקטים

DO $$ 
BEGIN
  RAISE NOTICE '----- עדכון פונקציות לאחר הסרת טבלאות שלבים ספציפיות -----';
END $$;

-- ========================================================
-- 1. עדכון פונקציית init_project_tables_and_data כך שלא תיצור טבלאות שלבים
-- ========================================================
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
  
  -- 3. יצירת שלב ברירת מחדל בטבלת השלבים הכללית (אם נדרש)
  IF create_default_stages THEN
    -- בדיקה אם יש כבר שלב לפרויקט זה
    IF NOT EXISTS (SELECT 1 FROM stages WHERE project_id = project_id_param) THEN
      -- יצירת שלב ברירת מחדל בטבלת השלבים הכללית
      INSERT INTO stages (
        id, title, project_id, status, hierarchical_number, progress, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), 'משימה ראשית', project_id_param, 'active', '1', 0, now(), now()
      );
      
      RAISE NOTICE 'נוצר שלב ברירת מחדל בטבלת השלבים הכללית עבור פרויקט %', project_id_param;
    END IF;
  END IF;
  
  RAISE NOTICE 'Project tables and data initialized successfully for project %', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 2. עדכון פונקציית sync_stages_and_tasks_by_project כך שתעבוד ישירות מול טבלת השלבים הכללית
-- ========================================================
CREATE OR REPLACE FUNCTION sync_stages_and_tasks_by_project(project_id_param uuid)
RETURNS json AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  task_rec record;
  updated_count integer := 0;
  stage_id uuid;
  result json;
  tasks_table_exists boolean;
BEGIN
  -- 1. וידוא שטבלת המשימות קיימת
  SELECT check_table_exists(tasks_table_name) INTO tasks_table_exists;
  
  IF NOT tasks_table_exists THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'טבלת המשימות לא קיימת',
      'tasks_updated', 0
    );
  END IF;
  
  -- 2. בחירת שלב ברירת מחדל מטבלת השלבים הכללית
  SELECT id INTO stage_id FROM stages WHERE project_id = project_id_param ORDER BY created_at LIMIT 1;
  
  -- אם אין שלב מתאים בטבלת השלבים הכללית, ניצור אחד
  IF stage_id IS NULL THEN
    INSERT INTO stages (
      id, title, project_id, status, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), 'משימה ראשית', project_id_param, 'active', now(), now()
    ) RETURNING id INTO stage_id;
  END IF;
  
  -- 3. עדכון משימות שאין להן שלב
  EXECUTE format('
    UPDATE %I
    SET stage_id = %L
    WHERE stage_id IS NULL
    RETURNING id',
    tasks_table_name, stage_id
  ) INTO task_rec;
  
  IF task_rec.id IS NOT NULL THEN
    -- ספירת מספר המשימות שעודכנו
    EXECUTE format('
      SELECT COUNT(*) FROM %I WHERE stage_id = %L',
      tasks_table_name, stage_id
    ) INTO updated_count;
  END IF;
  
  -- 4. החזרת תוצאות הסנכרון
  RETURN json_build_object(
    'success', true,
    'message', 'סנכרון משימות הושלם בהצלחה',
    'project_id', project_id_param,
    'tasks_count', (SELECT COUNT(*) FROM tasks WHERE project_id = project_id_param),
    'tasks_updated', updated_count
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', project_id_param,
    'tasks_updated', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 3. עדכון פונקציית project_after_insert_trigger כך שלא תיצור טבלאות שלבים
-- ========================================================
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט (ללא טבלאות שלבים)
  PERFORM init_project_tables_and_data(NEW.id, true, true, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 4. עדכון פונקציית cleanup_duplicate_project_tables כך שלא תתייחס לטבלאות שלבים
-- ========================================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_project_tables(project_id_param uuid)
RETURNS json AS $$
DECLARE
  base_tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  table_list text[];
  table_name text;
  duplicate_tasks_tables text[] := '{}';
  tasks_dropped integer := 0;
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
    END IF;
  END LOOP;
  
  -- עוד בדיקה אם אין טבלאות כפולות
  IF array_length(duplicate_tasks_tables, 1) IS NULL THEN
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
  
  -- עדכון תוצאה
  RETURN json_build_object(
    'success', true,
    'message', 'ניקוי טבלאות כפולות הושלם בהצלחה',
    'project_id', project_id_param,
    'tables_found', array_length(table_list, 1),
    'duplicate_tasks_tables', duplicate_tasks_tables,
    'tasks_tables_dropped', tasks_dropped
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', project_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 5. עדכון פונקציית update_tasks_stage_by_hierarchical_prefix שתעבוד ישירות מול טבלת המשימות הייחודית לפרויקט
-- ========================================================
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
  
  -- וידוא שהשלב קיים בטבלת השלבים הכללית
  IF NOT EXISTS (SELECT 1 FROM stages WHERE id = stage_id_param) THEN
    RAISE EXCEPTION 'השלב % אינו קיים בטבלת השלבים הכללית', stage_id_param;
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

-- ========================================================
-- 6. עדכון פונקציית build_stages_from_selected_tasks להשתמש בטבלת השלבים הכללית
-- ========================================================
CREATE OR REPLACE FUNCTION build_stages_from_selected_tasks(project_id_param uuid)
RETURNS void AS $$
DECLARE
  tasks_table_name text := 'project_' || project_id_param::text || '_tasks';
  stage_ids text[];
  stage_id uuid;
  rec record;
  i integer := 0;
BEGIN
  -- בדיקה אם יש משימות בטבלת המשימות של הפרויקט
  EXECUTE format('
    SELECT COUNT(*) = 0 FROM %I
  ', tasks_table_name) INTO rec;
  
  -- אם אין משימות, ניצור שלב ברירת מחדל בטבלת השלבים הכללית
  IF rec.count THEN
    IF NOT EXISTS (SELECT 1 FROM stages WHERE project_id = project_id_param) THEN
      INSERT INTO stages (
        id, title, hierarchical_number, status, project_id, progress,
        created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), 'שלב ברירת מחדל', '1', 'pending', 
        project_id_param, 0, now(), now()
      );
    END IF;
    
    RETURN;
  END IF;
  
  -- בדיקה אם יש קטגוריות בטבלת המשימות
  EXECUTE format('
    SELECT COUNT(DISTINCT category) > 0 FROM %I WHERE category IS NOT NULL
  ', tasks_table_name) INTO rec;
  
  IF rec.count THEN
    -- יצירת שלבים לפי קטגוריות בטבלת השלבים הכללית
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
      
      INSERT INTO stages (
        id, title, hierarchical_number, status, project_id, 
        progress, color, created_at, updated_at, sort_order
      ) VALUES (
        uuid_generate_v4(), 
        COALESCE(rec.category, 'שלב כללי'), 
        i::text, 
        'pending', 
        project_id_param,
        0, 
        '#3182CE', 
        COALESCE(rec.created_at, now()),
        now(),
        i
      )
      RETURNING id INTO stage_id;
      
      -- עדכון ה-stage_id במשימות המתאימות
      EXECUTE format('
        UPDATE %I
        SET stage_id = %L
        WHERE category = %L
      ', tasks_table_name, stage_id, rec.category);
    END LOOP;
  ELSE
    -- אם אין קטגוריות, ניצור שלב ברירת מחדל בטבלת השלבים הכללית
    IF NOT EXISTS (SELECT 1 FROM stages WHERE project_id = project_id_param) THEN
      INSERT INTO stages (
        id, title, hierarchical_number, status, project_id,
        progress, color, created_at, updated_at, sort_order
      ) VALUES (
        uuid_generate_v4(), 'שלב ברירת מחדל', '1', 'pending', 
        project_id_param, 0, '#3182CE', now(), now(), 1
      )
      RETURNING id INTO stage_id;
      
      -- עדכון כל המשימות לשלב ברירת המחדל
      EXECUTE format('
        UPDATE %I
        SET stage_id = %L
        WHERE stage_id IS NULL
      ', tasks_table_name, stage_id);
    END IF;
  END IF;
  
  RAISE NOTICE 'Stages built in main stages table for project % successfully', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- הענקת הרשאות לפונקציות המעודכנות
-- ========================================================
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_stages_and_tasks_by_project(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION project_after_insert_trigger() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_project_tables(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_tasks_stage_by_hierarchical_prefix(uuid, text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION build_stages_from_selected_tasks(uuid) TO anon, authenticated, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '----- עדכון פונקציות לאחר הסרת טבלאות שלבים ספציפיות הושלם בהצלחה -----';
END $$;
