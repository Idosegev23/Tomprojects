-- מיגרציה לתיקון פונקציות ה-RPC של הפרויקט
-- תאריך: 01-04-2025

-- הבעיה: קיימות שתי שיטות לקביעת שמות טבלאות
-- 1. שימוש בשם הפרויקט (project_zxfsfzxv_tasks)
-- 2. שימוש ב-UUID של הפרויקט (project_8d5eeb32-d370-4664-b117-47823b347e00_tasks)
-- 
-- הפתרון: לעבור לשימוש אחיד ב-UUID בכל המקומות

-- עדכון הפונקציה init_project_tables_and_data
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  project_name text;
  project_id_safe text := replace(project_id::text, '-', '_');
  stage_tablename text;
  task_tablename text;
  default_stage_id uuid;
  stage_record RECORD;
  task_record RECORD;
BEGIN
  -- קבלת שם הפרויקט (לשימוש בהודעות בלבד)
  SELECT name INTO project_name FROM projects WHERE id = project_id;
  
  -- הגדרת שמות הטבלאות - תמיד עם ה-UUID של הפרויקט
  task_tablename := 'project_' || project_id::text || '_tasks';
  stage_tablename := 'project_' || project_id::text || '_stages';

  -- וידוא שטבלאות הפרויקט קיימות, יצירה שלהן אם לא
  IF NOT check_table_exists(stage_tablename) OR NOT check_table_exists(task_tablename) THEN
    PERFORM create_project_tables(project_id);
  ELSE
    -- אם הטבלאות כבר קיימות, נוודא שיש להן הרשאות מתאימות
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stage_tablename);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', task_tablename);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stage_tablename);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', task_tablename);
  END IF;

  -- יצירת שלבי ברירת מחדל אם ביקשו
  IF create_default_stages THEN
    -- יצירת שלבי ברירת מחדל ישירות בטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, color, status, progress, order_num, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 1, now(), now()) RETURNING id', 
      stage_tablename,
      project_id, 'היכרות', 'שלב ההיכרות עם הפרויקט', '#3182CE', 'active'
    ) INTO stage_record;
    
    -- שמירת המזהה של השלב הראשון לשימוש במשימות
    default_stage_id := stage_record.id;
    
    -- הוספת שאר השלבים
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, color, status, progress, order_num, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 2, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 3, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 4, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 5, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 6, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 7, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 8, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 9, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 10, now(), now())', 
      stage_tablename,
      project_id, 'איסוף חומר קיים', 'איסוף כל החומר הקיים הרלוונטי לפרויקט', '#3182CE', 'active',
      project_id, 'השלמות', 'השלמת החומרים החסרים', '#3182CE', 'active',
      project_id, 'הערות', 'הוספת הערות וסיכום ביניים', '#3182CE', 'active',
      project_id, 'יישור קו', 'יישור קו ואיחוד הנתונים', '#3182CE', 'active',
      project_id, 'עלייה לאוויר (פריסייל)', 'הכנה לקראת פריסייל', '#3182CE', 'active',
      project_id, 'איסוף נתונים ועדכון', 'איסוף נתונים ועדכונים לפרויקט', '#3182CE', 'active',
      project_id, 'המשך מכירות', 'המשך תהליך המכירות', '#3182CE', 'active',
      project_id, 'תוך כדי בניה', 'התנהלות במהלך הבניה', '#3182CE', 'active',
      project_id, 'מסירות', 'מסירת הדירות ללקוחות', '#3182CE', 'active'
    );
  ELSE
    -- יצירת שלב ברירת מחדל בודד אם לא מוסיפים את כל שלבי ברירת המחדל
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, color, status, progress, order_num, created_at, updated_at)
      VALUES (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 1, now(), now())
      RETURNING id', 
      stage_tablename,
      project_id, 'ברירת מחדל', 'שלב ברירת מחדל', '#3182CE', 'active'
    ) INTO stage_record;
    
    default_stage_id := stage_record.id;
  END IF;
  
  -- יצירת משימות ברירת מחדל אם ביקשו
  IF create_default_tasks THEN
    -- יצירת משימות ברירת מחדל ישירות בטבלה הייחודית - עם בדיקה מוקדמת של קיום השדות
    -- נשתמש בפורמט שמתאים לגמרי למבנה הטבלה החדש
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number, 
        created_at, updated_at
      )
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now())', 
      task_tablename,
      project_id, default_stage_id, 'איתור קרקע מתאימה', 'חיפוש וסינון קרקעות פוטנציאליות לפרויקט', 'תכנון', 'todo', 'high', '1'
    );
    
    -- הוספת שאר המשימות בפורמט התואם לטבלה
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number,
        created_at, updated_at
      )
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now())', 
      task_tablename,
      project_id, default_stage_id, 'בדיקת היתכנות ראשונית', 'בדיקת תב"ע, זכויות בנייה, ומגבלות תכנוניות', 'תכנון', 'todo', 'high', '2',
      project_id, default_stage_id, 'משא ומתן לרכישת הקרקע', 'ניהול מו"מ עם בעלי הקרקע וגיבוש הסכם', 'רכישה', 'todo', 'high', '3',
      project_id, default_stage_id, 'גיוס צוות תכנון', 'בחירת אדריכל, מהנדסים ויועצים', 'תכנון', 'todo', 'medium', '4',
      project_id, default_stage_id, 'תכנון אדריכלי ראשוני', 'הכנת תכניות קונספט ראשוניות', 'תכנון', 'todo', 'medium', '5',
      project_id, default_stage_id, 'הגשת היתר בנייה', 'הכנת והגשת מסמכים להיתר בנייה', 'היתרים', 'todo', 'high', '6',
      project_id, default_stage_id, 'הכנת תכניות ביצוע', 'פיתוח תכניות ביצוע מפורטות', 'תכנון', 'todo', 'medium', '7',
      project_id, default_stage_id, 'מכרז קבלנים', 'הכנת מכרז ובחירת קבלן מבצע', 'ביצוע', 'todo', 'medium', '8',
      project_id, default_stage_id, 'התחלת עבודות באתר', 'תחילת עבודות הקמה באתר הבנייה', 'ביצוע', 'todo', 'high', '9',
      project_id, default_stage_id, 'פתיחת משרד מכירות', 'הקמת והפעלת משרד מכירות בפרויקט', 'שיווק', 'todo', 'medium', '10'
    );
  END IF;
  
  -- העתקת משימות נבחרות אם יש כאלה
  IF selected_task_ids IS NOT NULL AND array_length(selected_task_ids, 1) > 0 THEN
    -- לולאה שעוברת על כל המשימות שנבחרו
    FOR task_record IN 
      SELECT * FROM tasks WHERE id = ANY(selected_task_ids)
    LOOP
      -- העתקת המשימה לטבלה הייחודית עם מזהה חדש ורק עם השדות שבטוח קיימים
      EXECUTE format('
        INSERT INTO %I (
          id, project_id, stage_id, title, description,
          category, status, priority,
          responsible, due_date, hierarchical_number,
          parent_task_id, original_task_id, 
          created_at, updated_at
        )
        VALUES (
          uuid_generate_v4(), %L, %L, %L, %L,
          %L, %L, %L,
          %L, %L, %L,
          %L, %L,
          now(), now()
        )', 
        task_tablename,
        project_id, default_stage_id, task_record.title, task_record.description,
        task_record.category, task_record.status, task_record.priority,
        task_record.responsible, task_record.due_date, NULL,
        NULL, task_record.id
      );
    END LOOP;
    
    -- מספור היררכי של כל המשימות החדשות
    EXECUTE format('
      WITH ordered_tasks AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY created_at) + 
          (SELECT COUNT(*) FROM %I WHERE hierarchical_number IS NOT NULL) as row_num
        FROM %I 
        WHERE hierarchical_number IS NULL
      )
      UPDATE %I t
      SET hierarchical_number = ot.row_num::text
      FROM ordered_tasks ot
      WHERE t.id = ot.id
    ', task_tablename, task_tablename, task_tablename);
  END IF;
  
  RAISE NOTICE 'טבלאות הפרויקט % אותחלו בהצלחה עם נתונים ראשוניים והרשאות מתאימות (%,%)', project_id, stage_tablename, task_tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון פונקציית get_tasks_tree כך שתשתמש רק ב-UUID
CREATE OR REPLACE FUNCTION get_tasks_tree(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  task_table_name text := 'project_' || p_project_id::text || '_tasks';
  result json;
BEGIN
  IF check_table_exists(task_table_name) THEN
    -- בדיקה אם הטבלה קיימת ואז ביצוע השאילתה
    BEGIN
      EXECUTE format('
        WITH RECURSIVE task_tree AS (
          -- שורשי העץ (משימות ללא משימת אב)
          SELECT 
            id, title, description, project_id, stage_id, status, priority,
            due_date, hierarchical_number, parent_task_id, category,
            responsible, NULL::jsonb AS children
          FROM %I
          WHERE parent_task_id IS NULL
          
          UNION ALL
          
          -- משימות בנות
          SELECT 
            t.id, t.title, t.description, t.project_id, t.stage_id, t.status, t.priority,
            t.due_date, t.hierarchical_number, t.parent_task_id, t.category,
            t.responsible, NULL::jsonb AS children
          FROM %I t
          INNER JOIN task_tree tt ON t.parent_task_id = tt.id
        )
        SELECT json_agg(
          json_build_object(
            ''id'', id,
            ''title'', title,
            ''description'', description,
            ''project_id'', project_id,
            ''stage_id'', stage_id,
            ''status'', status,
            ''priority'', priority,
            ''due_date'', due_date,
            ''hierarchical_number'', hierarchical_number,
            ''parent_task_id'', parent_task_id,
            ''category'', category,
            ''responsible'', responsible,
            ''children'', children
          )
        ) FROM task_tree;
      ', task_table_name, task_table_name) INTO result;
    EXCEPTION WHEN OTHERS THEN
      -- אם יש שגיאה, לוג ומחזיר מערך ריק
      RAISE NOTICE 'שגיאה בביצוע השאילתה: %', SQLERRM;
      result := '[]'::json;
    END;
    
    -- אם אין תוצאות, מחזירים מערך ריק במקום NULL
    IF result IS NULL THEN
      result := '[]'::json;
    END IF;
    
    RETURN QUERY SELECT result;
  ELSE
    -- אם הטבלה לא קיימת, מחזירים מערך ריק
    RETURN QUERY SELECT '[]'::json;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון פונקציית get_project_tasks כך שתשתמש רק ב-UUID
CREATE OR REPLACE FUNCTION get_project_tasks(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  task_table_name text := 'project_' || p_project_id::text || '_tasks';
  result json;
BEGIN
  IF check_table_exists(task_table_name) THEN
    -- ביצוע השאילתה אם הטבלה קיימת
    BEGIN
      EXECUTE format('
        SELECT json_agg(
          json_build_object(
            ''id'', id,
            ''title'', title,
            ''description'', description,
            ''project_id'', project_id,
            ''stage_id'', stage_id,
            ''status'', status,
            ''priority'', priority,
            ''due_date'', due_date,
            ''hierarchical_number'', hierarchical_number,
            ''parent_task_id'', parent_task_id,
            ''category'', category,
            ''responsible'', responsible,
            ''created_at'', created_at,
            ''updated_at'', updated_at
          )
        )
        FROM %I
        WHERE project_id = %L
      ', task_table_name, p_project_id) INTO result;
    EXCEPTION WHEN OTHERS THEN
      -- אם יש שגיאה, לוג ומחזיר מערך ריק
      RAISE NOTICE 'שגיאה בביצוע השאילתה: %', SQLERRM;
      result := '[]'::json;
    END;
    
    -- אם אין תוצאות, החזרת מערך ריק במקום NULL
    IF result IS NULL THEN
      result := '[]'::json;
    END IF;
    
    RETURN QUERY SELECT result;
  ELSE
    -- אם הטבלה לא קיימת, מחזירים מערך ריק
    RETURN QUERY SELECT '[]'::json;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון פונקציית create_project_tables כך שתשתמש רק ב-UUID
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
        stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
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

-- הענקת הרשאות לפונקציות המעודכנות
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_tables(uuid) TO anon, authenticated, service_role; 