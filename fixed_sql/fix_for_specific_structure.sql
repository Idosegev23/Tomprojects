-- תיקון לפונקציית copy_stages_to_project_table להתאמה למבנה הטבלה הקיים

-- מחיקת הפונקציה הקיימת (אם קיימת)
DROP FUNCTION IF EXISTS copy_stages_to_project_table(uuid);

-- יצירת פונקציית copy_stages_to_project_table בגרסה מינימלית שתעבוד עם כל מבנה טבלה
CREATE OR REPLACE FUNCTION copy_stages_to_project_table(project_id_param uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  stage_rec record;
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
  
  -- שלב 2: עדכון עמודות נוספות תוך שימוש באופרטור IS NOT NULL כדי לוודא קיום העמודות
  BEGIN
    EXECUTE format('
      UPDATE %I t
      SET 
        status = s.status,
        color = s.color
      FROM stages s
      WHERE t.id = s.id AND (s.project_id = %L OR s.project_id IS NULL)
    ', stages_table_name, project_id_param);
  EXCEPTION WHEN OTHERS THEN
    -- מעדכנים רק את העמודות שקיימות בטבלה
    RAISE NOTICE 'לא ניתן לעדכן את כל העמודות, מתעלם משגיאה: %', SQLERRM;
  END;
  
  -- יוצרים שלבים ברירת מחדל אם אין כאלה
  EXECUTE format('
    INSERT INTO %I (id, project_id, title, created_at, updated_at)
    SELECT 
      uuid_generate_v4(), %L, ''שלב ברירת מחדל'', now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM %I)
  ', stages_table_name, project_id_param, stages_table_name);
  
  RAISE NOTICE 'Stages copied to project table % successfully', stages_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table(uuid) TO anon, authenticated, service_role;

-- עדכון פונקציית init_project_tables_and_data כדי להשתמש בשמות משתנים לא אמביגואליים
DROP FUNCTION IF EXISTS init_project_tables_and_data(uuid, boolean, boolean, uuid[]);
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

-- הענקת הרשאות לפונקציית אתחול
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role; 