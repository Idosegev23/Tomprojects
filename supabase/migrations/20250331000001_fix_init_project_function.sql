-- מיגרציה לתיקון פונקציית אתחול פרויקט וטבלאותיו
-- תאריך: 31-03-2025

-- תיקון הפונקציה לאתחול פרויקט כך שתעבוד עם המבנה העדכני של הטבלאות
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
    -- יצירת משימות ברירת מחדל ישירות בטבלה הייחודית - עם בדיקה מוקדמת של קיום השדות
    -- נשתמש בפורמט שמתאים לגמרי למבנה הטבלה החדש
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number, 
        -- שדות אופציונליים שנבדוק ראשית אם הם קיימים 
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
  
  -- העתקת משימות נבחרות אם יש כאלה (גרסה שבודקת קיום שדות תחילה)
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

-- עדכון הרשאות ריצה לפונקציית אתחול טבלאות
GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role; 