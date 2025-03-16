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

-- טריגר ליצירת טבלה ספציפית לפרויקט בעת יצירת פרויקט חדש
CREATE OR REPLACE FUNCTION create_project_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יצירת טבלה ספציפית לפרויקט החדש
  PERFORM create_project_table(NEW.id);
  RETURN NEW;
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