-- פונקציות SQL ליצירת טבלאות ספציפיות לפרויקטים

-- פונקציה לבדיקה אם טבלה קיימת
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

-- פונקציה ליצירת טבלת משימות ספציפית לפרויקט
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id),
        stage_id uuid REFERENCES stages(id),
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
        deleted boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        hierarchical_number text,
        parent_task_id uuid,
        is_template boolean DEFAULT false,
        CONSTRAINT %I_project_id_check CHECK (project_id = %L)
      )', table_name, table_name, project_id);
    
    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I_hierarchical_number_idx ON %I (hierarchical_number)', table_name, table_name);
    EXECUTE format('CREATE INDEX %I_parent_task_id_idx ON %I (parent_task_id)', table_name, table_name);
    EXECUTE format('CREATE INDEX %I_status_idx ON %I (status)', table_name, table_name);
    
    -- יצירת טריגר לעדכון שדה updated_at
    EXECUTE format('
      CREATE TRIGGER set_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()', table_name, table_name);
    
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % נוצרה בהצלחה', project_id;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % כבר קיימת', project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה למחיקת טבלת משימות ספציפית לפרויקט
CREATE OR REPLACE FUNCTION drop_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- מחיקת הטבלה
    EXECUTE format('DROP TABLE %I', table_name);
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % נמחקה בהצלחה', project_id;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % אינה קיימת', project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להעתקת משימה מהטבלה הראשית לטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_exists boolean;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- בדיקה אם המשימה כבר קיימת בטבלה הספציפית
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I WHERE id = %L
    )', table_name, task_id) INTO task_exists;
  
  IF NOT task_exists THEN
    -- העתקת המשימה מהטבלה הראשית לטבלה הספציפית
    EXECUTE format('
      INSERT INTO %I
      SELECT * FROM tasks WHERE id = %L AND project_id = %L
    ', table_name, task_id, project_id);
    
    RAISE NOTICE 'משימה % הועתקה לטבלת הפרויקט %', task_id, project_id;
  ELSE
    RAISE NOTICE 'משימה % כבר קיימת בטבלת הפרויקט %', task_id, project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לעדכון משימה בטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION update_task_in_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_exists boolean;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
    -- העתקת המשימה לטבלה החדשה
    PERFORM copy_task_to_project_table(task_id, project_id);
    RETURN;
  END IF;
  
  -- בדיקה אם המשימה קיימת בטבלה הספציפית
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I WHERE id = %L
    )', table_name, task_id) INTO task_exists;
  
  IF task_exists THEN
    -- עדכון המשימה בטבלה הספציפית
    EXECUTE format('
      UPDATE %I
      SET 
        stage_id = t.stage_id,
        title = t.title,
        description = t.description,
        category = t.category,
        status = t.status,
        priority = t.priority,
        responsible = t.responsible,
        estimated_hours = t.estimated_hours,
        actual_hours = t.actual_hours,
        start_date = t.start_date,
        due_date = t.due_date,
        completed_date = t.completed_date,
        budget = t.budget,
        dependencies = t.dependencies,
        assignees = t.assignees,
        watchers = t.watchers,
        labels = t.labels,
        deleted = t.deleted,
        updated_at = t.updated_at,
        hierarchical_number = t.hierarchical_number,
        parent_task_id = t.parent_task_id,
        is_template = t.is_template
      FROM tasks t
      WHERE %I.id = %L AND t.id = %L
    ', table_name, table_name, task_id, task_id);
    
    RAISE NOTICE 'משימה % עודכנה בטבלת הפרויקט %', task_id, project_id;
  ELSE
    -- המשימה לא קיימת בטבלה הספציפית, נעתיק אותה
    PERFORM copy_task_to_project_table(task_id, project_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה למחיקת משימה מהטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION delete_task_from_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- מחיקת המשימה מהטבלה הספציפית
    EXECUTE format('
      DELETE FROM %I WHERE id = %L
    ', table_name, task_id);
    
    RAISE NOTICE 'משימה % נמחקה מטבלת הפרויקט %', task_id, project_id;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % אינה קיימת', project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION get_project_tasks(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 ORDER BY hierarchical_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לסנכרון כל המשימות של פרויקט מהטבלה הראשית לטבלה הספציפית
CREATE OR REPLACE FUNCTION sync_project_tasks(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_record record;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- מחיקת כל המשימות מהטבלה הספציפית
  EXECUTE format('TRUNCATE TABLE %I', table_name);
  
  -- העתקת כל המשימות מהטבלה הראשית לטבלה הספציפית
  FOR task_record IN SELECT * FROM tasks WHERE project_id = $1 LOOP
    PERFORM copy_task_to_project_table(task_record.id, project_id);
  END LOOP;
  
  RAISE NOTICE 'כל המשימות של פרויקט % סונכרנו בהצלחה', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה חדשה להקמת טבלאות ייחודיות לפרויקט ואתחול נתונים ראשוניים
CREATE OR REPLACE FUNCTION init_project_tables_and_data(
  project_id uuid,
  create_default_stages boolean DEFAULT true,
  create_default_tasks boolean DEFAULT true,
  selected_task_ids uuid[] DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  stage_tablename text := 'project_' || project_id::text || '_stages';
  task_tablename text := 'project_' || project_id::text || '_tasks';
  default_stage_id uuid;
  stage_record record;
  task_record record;
BEGIN
  -- 1. וודא שהטבלאות הייחודיות של הפרויקט קיימות
  PERFORM create_project_table(project_id);
  PERFORM create_project_stages_table(project_id);
  
  -- 2. יצירת שלבי ברירת מחדל אם ביקשו
  IF create_default_stages THEN
    -- יצירת שלבי ברירת מחדל ישירות בטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, color, status, progress, order_num, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 1, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 2, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 3, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 4, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 5, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 6, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 7, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 8, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 9, now(), now()),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 10, now(), now())
      RETURNING id
    ', 
      stage_tablename,
      project_id, 'היכרות', 'שלב ההיכרות עם הפרויקט', '#3182CE', 'active',
      project_id, 'איסוף חומר קיים', 'איסוף כל החומר הקיים הרלוונטי לפרויקט', '#3182CE', 'active',
      project_id, 'השלמות', 'השלמת החומרים החסרים', '#3182CE', 'active',
      project_id, 'הערות', 'הוספת הערות וסיכום ביניים', '#3182CE', 'active',
      project_id, 'יישור קו', 'יישור קו ואיחוד הנתונים', '#3182CE', 'active',
      project_id, 'עלייה לאוויר (פריסייל)', 'הכנה לקראת פריסייל', '#3182CE', 'active',
      project_id, 'איסוף נתונים ועדכון', 'איסוף נתונים ועדכונים לפרויקט', '#3182CE', 'active',
      project_id, 'המשך מכירות', 'המשך תהליך המכירות', '#3182CE', 'active',
      project_id, 'תוך כדי בניה', 'התנהלות במהלך הבניה', '#3182CE', 'active',
      project_id, 'מסירות', 'מסירת הדירות ללקוחות', '#3182CE', 'active'
    ) INTO stage_record;
    
    -- שמירת המזהה של השלב הראשון (היכרות) לשימוש במשימות
    SELECT id INTO default_stage_id 
    FROM stage_record;
  ELSE
    -- יצירת שלב ברירת מחדל בודד אם לא מוסיפים את כל שלבי ברירת המחדל
    EXECUTE format('
      INSERT INTO %I (id, project_id, title, description, color, status, progress, order_num, created_at, updated_at)
      VALUES (uuid_generate_v4(), %L, %L, %L, %L, %L, 0, 1, now(), now())
      RETURNING id
    ', 
      stage_tablename,
      project_id, 'ברירת מחדל', 'שלב ברירת מחדל', '#3182CE', 'active'
    ) INTO stage_record;
    
    SELECT id INTO default_stage_id 
    FROM stage_record;
  END IF;
  
  -- 3. יצירת משימות ברירת מחדל אם ביקשו
  IF create_default_tasks THEN
    -- יצירת משימות ברירת מחדל ישירות בטבלה הייחודית
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, 
        category, status, priority, hierarchical_number,
        created_at, updated_at, deleted
      )
      VALUES 
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false),
        (uuid_generate_v4(), %L, %L, %L, %L, %L, %L, %L, %L, now(), now(), false)
    ', 
      task_tablename,
      project_id, default_stage_id, 'איתור קרקע מתאימה', 'חיפוש וסינון קרקעות פוטנציאליות לפרויקט', 'תכנון', 'todo', 'high', '1',
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
  
  -- 4. העתקת משימות נבחרות אם יש כאלה
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
          deleted, created_at, updated_at, 
          hierarchical_number, parent_task_id, original_task_id
        )
        VALUES (
          uuid_generate_v4(), %L, %L, %L, %L,
          %L, %L, %L,
          %L, %L, %L,
          %L, %L, %L, %L,
          %L, %L, %L, %L,
          %L, now(), now(),
          %L, %L, %L
        )
      ', 
        task_tablename,
        project_id, default_stage_id, task_record.title, task_record.description,
        task_record.category, task_record.status, task_record.priority,
        task_record.responsible, task_record.estimated_hours, task_record.actual_hours,
        task_record.start_date, task_record.due_date, task_record.completed_date, task_record.budget,
        task_record.dependencies, task_record.assignees, task_record.watchers, task_record.labels,
        false, -- לא מחוק
        NULL, -- hierarchical_number יתעדכן אוטומטית בהמשך
        NULL, -- parent_task_id
        task_record.id -- original_task_id
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
  
  RAISE NOTICE 'טבלאות הפרויקט % אותחלו בהצלחה עם נתונים ראשוניים', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון הטריגר ליצירת פרויקט כך שיקרא לפונקציה שלנו עם פרמטרים ברירת מחדל
CREATE OR REPLACE FUNCTION create_project_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה החדשה עם הגדרות ברירת מחדל
  PERFORM init_project_tables_and_data(NEW.id, true, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- פונקציה לעדכון שדה updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט במבנה היררכי
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 ORDER BY hierarchical_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- טריגר למחיקת טבלה ספציפית לפרויקט בעת מחיקת פרויקט
CREATE OR REPLACE FUNCTION drop_project_table_on_project_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- מחיקת טבלה ספציפית לפרויקט שנמחק
  PERFORM drop_project_table(OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגרים על טבלת הפרויקטים
DROP TRIGGER IF EXISTS create_project_table_trigger ON projects;
CREATE TRIGGER create_project_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_table_on_project_insert();

DROP TRIGGER IF EXISTS drop_project_table_trigger ON projects;
CREATE TRIGGER drop_project_table_trigger
BEFORE DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION drop_project_table_on_project_delete(); 