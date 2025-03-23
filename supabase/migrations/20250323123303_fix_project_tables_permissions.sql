-- מיגרציה לתיקון פונקציות יצירת טבלאות הפרויקט עבור פרויקטים חדשים
-- פתרון קדימה: מיגרציה זו מעדכנת את הפונקציות כך שפרויקטים חדשים יקבלו הרשאות נכונות
-- שיפור נוסף: שימוש בשם הפרויקט במקום ב-UUID בשמות הטבלאות

-- פונקציה לקבלת שם בטוח לטבלה (הסרת תווים מיוחדים והמרה לאותיות קטנות)
CREATE OR REPLACE FUNCTION get_safe_table_name(input_text text)
RETURNS text AS $$
DECLARE
  safe_name text;
BEGIN
  -- מסיר תווים לא חוקיים ומחליף רווחים בקו תחתון
  safe_name := lower(regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g'));
  safe_name := regexp_replace(safe_name, '\s+', '_', 'g');
  
  -- אם השם ריק, נחזיר ערך ברירת מחדל
  IF length(safe_name) = 0 THEN
    safe_name := 'project';
  END IF;
  
  -- מקצר את השם אם הוא ארוך מדי
  IF length(safe_name) > 20 THEN
    safe_name := substring(safe_name FROM 1 FOR 20);
  END IF;
  
  RETURN safe_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- שיפור פונקציית create_project_tables כך שתעניק הרשאות נכונות ותשתמש בשם הפרויקט
CREATE OR REPLACE FUNCTION create_project_tables(project_id uuid)
RETURNS void AS $$
DECLARE
  -- קבלת מידע על הפרויקט
  project_name text;
  project_id_safe text := replace(project_id::text, '-', '_');
  table_prefix text;
  
  -- שמות הטבלאות
  tasks_table_name text;
  stages_table_name text;
  
  -- שמות אילוצים
  tasks_constraint_name text;
  stages_constraint_name text;
  
  -- שמות אינדקסים
  idx_hierarchical text;
  idx_parent text;
  idx_status text;
  idx_order text;
BEGIN
  -- קבלת שם הפרויקט
  SELECT name INTO project_name FROM projects WHERE id = project_id;
  
  -- יצירת תחילית בטוחה לשם הטבלה
  IF project_name IS NOT NULL AND length(project_name) > 0 THEN
    table_prefix := get_safe_table_name(project_name);
  ELSE
    table_prefix := 'project_' || project_id_safe;
  END IF;
  
  -- הגדרת שמות הטבלאות
  tasks_table_name := 'project_' || table_prefix || '_tasks';
  stages_table_name := 'project_' || table_prefix || '_stages';
  
  -- הגדרת שמות אילוצים
  tasks_constraint_name := 'proj_' || table_prefix || '_tasks_pid_check';
  stages_constraint_name := 'proj_' || table_prefix || '_stages_pid_check';
  
  -- הגדרת שמות אינדקסים
  idx_hierarchical := 'proj_' || table_prefix || '_hier_idx';
  idx_parent := 'proj_' || table_prefix || '_parent_idx';
  idx_status := 'proj_' || table_prefix || '_status_idx';
  idx_order := 'proj_' || table_prefix || '_order_idx';

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
    
    -- יצירת טריגר לעדכון שדה updated_at
    EXECUTE format('
      CREATE TRIGGER set_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()', stages_table_name, stages_table_name);
    
    RAISE NOTICE 'טבלת שלבים ספציפית לפרויקט % נוצרה בהצלחה (%)', project_id, stages_table_name;
  ELSE
    RAISE NOTICE 'טבלת שלבים ספציפית לפרויקט % כבר קיימת (%)', project_id, stages_table_name;
    
    -- ביטול RLS על הטבלה הקיימת והענקת הרשאות גישה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
  END IF;

  -- יצירת טבלת משימות ספציפית לפרויקט אם לא קיימת
  IF NOT check_table_exists(tasks_table_name) THEN
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid, -- נוסיף את המפתח זר אחר כך
        title text NOT NULL,
        description text,
        category text,
        status text DEFAULT ''todo''::text,
        priority text DEFAULT ''medium''::text,
        responsible uuid,
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
        hierarchical_number text,
        parent_task_id uuid,
        is_template boolean DEFAULT false,
        original_task_id uuid,
        dropbox_folder text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
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
    
    -- יצירת טריגר לעדכון שדה updated_at
    EXECUTE format('
      CREATE TRIGGER set_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()', tasks_table_name, tasks_table_name);
    
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % נוצרה בהצלחה (%)', project_id, tasks_table_name;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % כבר קיימת (%)', project_id, tasks_table_name;
    
    -- ביטול RLS על הטבלה הקיימת והענקת הרשאות גישה
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
  END IF;

  -- הוספת מפתח זר לשדה stage_id בטבלת המשימות אחרי שוידאנו שהטבלאות קיימות
  IF check_table_exists(tasks_table_name) AND check_table_exists(stages_table_name) THEN
    -- הסרת מפתח זר אם קיים כבר
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_stage_id_fkey', 
                   tasks_table_name, tasks_table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'לא נמצא אילוץ מפתח זר להסרה';
    END;
    
    -- הוספת מפתח זר חדש לטבלת השלבים הספציפית
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_stage_id_fkey 
                   FOREIGN KEY (stage_id) REFERENCES %I(id) ON DELETE SET NULL',
                  tasks_table_name, tasks_table_name, stages_table_name);
    
    RAISE NOTICE 'מפתח זר הוגדר בהצלחה בין טבלאות המשימות והשלבים של פרויקט %', project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- מעניקים הרשאות ריצה לפונקציית יצירת הטבלאות
GRANT EXECUTE ON FUNCTION create_project_tables(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_safe_table_name(text) TO anon, authenticated, service_role;

-- פונקציה לקבלת רשימת כל הטבלאות הספציפיות לפרויקטים
CREATE OR REPLACE FUNCTION get_all_project_tables()
RETURNS TABLE(table_name text, project_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::text,
    (regexp_match(t.table_name, 'project_(.+)_tasks'))[1]::uuid
  FROM
    information_schema.tables t
  WHERE
    t.table_schema = 'public'
    AND t.table_name LIKE 'project_%_tasks'
    AND t.table_type = 'BASE TABLE';
END;
$$;

-- עדכון פונקציית אתחול טבלאות פרויקט כך שתוודא שההרשאות הנכונות מוענקות
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
  table_prefix text;
  stage_tablename text;
  task_tablename text;
  default_stage_id uuid;
  stage_record RECORD;
  task_record RECORD;
BEGIN
  -- קבלת שם הפרויקט
  SELECT name INTO project_name FROM projects WHERE id = project_id;
  
  -- יצירת תחילית בטוחה לשם הטבלה
  IF project_name IS NOT NULL AND length(project_name) > 0 THEN
    table_prefix := get_safe_table_name(project_name);
  ELSE
    table_prefix := project_id_safe;
  END IF;
  
  -- הגדרת שמות הטבלאות
  task_tablename := 'project_' || table_prefix || '_tasks';
  stage_tablename := 'project_' || table_prefix || '_stages';

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
    -- יצירת משימות ברירת מחדל ישירות בטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number,
        estimated_hours, created_at, updated_at
      )
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 40, now(), now())', 
      task_tablename,
      project_id, default_stage_id, 'איתור קרקע מתאימה', 'חיפוש וסינון קרקעות פוטנציאליות לפרויקט', 'תכנון', 'todo', 'high', '1'
    );
    
    -- הוספת שאר המשימות
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number,
        estimated_hours, created_at, updated_at
      )
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 30, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 45, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 20, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 35, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 50, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 25, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 40, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 60, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, 30, now(), now())', 
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
      -- העתקת המשימה לטבלה הייחודית עם מזהה חדש
      EXECUTE format('
        INSERT INTO %I (
          id, project_id, stage_id, title, description,
          category, status, priority,
          responsible, estimated_hours, actual_hours,
          start_date, due_date, completed_date, budget,
          dependencies, assignees, watchers, labels,
          created_at, updated_at, 
          hierarchical_number, parent_task_id, original_task_id
        )
        VALUES (
          uuid_generate_v4(), %L, %L, %L, %L,
          %L, %L, %L,
          %L, %L, %L,
          %L, %L, %L, %L,
          %L::uuid[], %L::uuid[], %L::uuid[], %L::text[],
          now(), now(),
          NULL, NULL, %L
        )', 
        task_tablename,
        project_id, default_stage_id, task_record.title, task_record.description,
        task_record.category, task_record.status, task_record.priority,
        task_record.responsible, task_record.estimated_hours, task_record.actual_hours,
        task_record.start_date, task_record.due_date, task_record.completed_date, task_record.budget,
        task_record.dependencies, task_record.assignees, task_record.watchers, task_record.labels,
        task_record.id
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

-- עדכון הרשאות ריצה לפונקציית אתחול טבלאות
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_project_tables() TO anon, authenticated, service_role;
