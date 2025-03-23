-- פונקציה חדשה להקמת טבלאות ייחודיות לפרויקט ואתחול נתונים ראשוניים
-- העתק והדבק את הקוד הזה לממשק SQL של סופאבייס

-- פונקציית עזר לקביעת זמן עדכון
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- פונקציה לבדיקה אם טבלה קיימת (אם לא הותקנה עדיין)
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

-- פונקציית אתחול טבלאות ונתונים לפרויקט
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
  -- בדיקה אם הטבלאות קיימות ויצירתן אם לא קיימות
  IF NOT check_table_exists(stage_tablename) OR NOT check_table_exists(task_tablename) THEN
    -- יצירת הטבלאות הייחודיות לפרויקט
    PERFORM create_project_tables(project_id);
    RAISE NOTICE 'טבלאות הפרויקט % נוצרו אוטומטית', project_id;
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
    SELECT id INTO default_stage_id FROM stage_record;
    
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
    
    SELECT id INTO default_stage_id FROM stage_record;
  END IF;
  
  -- יצירת משימות ברירת מחדל אם ביקשו
  IF create_default_tasks THEN
    -- יצירת משימות ברירת מחדל ישירות בטבלה הייחודית
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
    
    -- הוספת שאר המשימות
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
  
  RAISE NOTICE 'טבלאות הפרויקט % אותחלו בהצלחה עם נתונים ראשוניים', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת משימות מטבלה ספציפית
DROP FUNCTION IF EXISTS get_project_tasks(uuid);
CREATE OR REPLACE FUNCTION get_project_tasks(p_project_id uuid) 
RETURNS SETOF tasks AS $$
DECLARE
  project_id_safe text := replace(p_project_id::text, '-', '_');
  table_name text := 'project_' || project_id_safe || '_tasks';
BEGIN
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    -- שימוש ב-execute format כדי להחזיר רשומות שיתאימו למבנה של tasks
    RETURN QUERY EXECUTE format('
      SELECT 
        t.id, 
        t.project_id, 
        t.stage_id, 
        t.title, 
        t.description, 
        t.category, 
        t.status, 
        t.priority, 
        t.responsible, 
        t.estimated_hours, 
        t.actual_hours, 
        t.start_date, 
        t.due_date, 
        t.completed_date, 
        t.budget, 
        t.dependencies, 
        t.assignees, 
        t.watchers, 
        t.labels, 
        t.deleted, 
        t.created_at, 
        t.updated_at, 
        t.hierarchical_number, 
        t.parent_task_id, 
        t.is_template
      FROM %I t 
      WHERE t.deleted = false 
      ORDER BY t.hierarchical_number
    ', table_name);
  ELSE
    -- אם טבלה ספציפית לא קיימת, החזר משימות מהטבלה הראשית
    RAISE NOTICE 'Falling back to main tasks table for project %', p_project_id;
    RETURN QUERY SELECT * FROM tasks 
      WHERE project_id = p_project_id AND deleted = false 
      ORDER BY hierarchical_number;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- במקרה של שגיאה, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Error in get_project_tasks: %, falling back to main tasks table', SQLERRM;
    RETURN QUERY SELECT * FROM tasks 
      WHERE project_id = p_project_id AND deleted = false 
      ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להחזרת עץ משימות היררכי לפרויקט
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
CREATE OR REPLACE FUNCTION get_tasks_tree(p_project_id uuid) 
RETURNS SETOF tasks AS $$
DECLARE
  project_id_safe text := replace(p_project_id::text, '-', '_');
  table_name text := 'project_' || project_id_safe || '_tasks';
BEGIN
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית במבנה היררכי
    RETURN QUERY EXECUTE format('
      WITH RECURSIVE task_tree AS (
        SELECT 
          t.*
        FROM %I t
        WHERE t.parent_task_id IS NULL AND NOT t.deleted
        
        UNION ALL
        
        SELECT 
          c.*
        FROM %I c
        JOIN task_tree p ON c.parent_task_id = p.id
        WHERE NOT c.deleted
      )
      SELECT * FROM task_tree
      ORDER BY hierarchical_number
    ', table_name, table_name);
  ELSE
    -- אם טבלה ספציפית לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Falling back to main tasks table for project %', p_project_id;
    RETURN QUERY 
      WITH RECURSIVE task_tree AS (
        SELECT 
          t.*
        FROM tasks t
        WHERE t.project_id = p_project_id AND t.parent_task_id IS NULL AND NOT t.deleted
        
        UNION ALL
        
        SELECT 
          c.*
        FROM tasks c
        JOIN task_tree p ON c.parent_task_id = p.id
        WHERE c.project_id = p_project_id AND NOT c.deleted
      )
      SELECT * FROM task_tree
      ORDER BY hierarchical_number;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- במקרה של שגיאה, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Error in get_tasks_tree: %, falling back to main tasks table', SQLERRM;
    RETURN QUERY 
      WITH RECURSIVE task_tree AS (
        SELECT 
          t.*
        FROM tasks t
        WHERE t.project_id = p_project_id AND t.parent_task_id IS NULL AND NOT t.deleted
        
        UNION ALL
        
        SELECT 
          c.*
        FROM tasks c
        JOIN task_tree p ON c.parent_task_id = p.id
        WHERE c.project_id = p_project_id AND NOT c.deleted
      )
      SELECT * FROM task_tree
      ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 