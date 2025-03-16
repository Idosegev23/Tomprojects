-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS create_project_table(text, uuid);
DROP FUNCTION IF EXISTS create_project_table(uuid);
DROP FUNCTION IF EXISTS check_table_exists(text);
DROP FUNCTION IF EXISTS delete_project_table(uuid);
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid);
DROP FUNCTION IF EXISTS copy_tasks_to_project_table(uuid[], uuid);
DROP FUNCTION IF EXISTS add_tasks_to_project_table(jsonb, uuid);
DROP FUNCTION IF EXISTS sync_project_tasks(uuid);
DROP FUNCTION IF EXISTS get_project_tasks(uuid);
DROP FUNCTION IF EXISTS update_task_in_project_table(uuid, uuid);
DROP FUNCTION IF EXISTS delete_task_from_project_table(uuid, uuid);

-- יצירת הפונקציה check_table_exists מחדש
CREATE OR REPLACE FUNCTION check_table_exists(table_name_param text)
RETURNS boolean AS $$
DECLARE
  exists_val boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND information_schema.tables.table_name = table_name_param
  ) INTO exists_val;
  
  RETURN exists_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הפונקציה create_project_table מחדש
CREATE OR REPLACE FUNCTION create_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  constraint_name text := 'proj_' || replace(project_id::text, '-', '') || '_fkey';
BEGIN
  -- בדיקה אם הטבלה כבר קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת טבלה חדשה עם אותו מבנה כמו טבלת tasks
    EXECUTE format('
      CREATE TABLE %I (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
        title text NOT NULL,
        description text,
        category text,
        status text DEFAULT ''todo'',
        priority text DEFAULT ''medium'',
        responsible uuid,
        estimated_hours numeric,
        actual_hours numeric,
        start_date date,
        due_date date,
        completed_date date,
        budget numeric,
        dependencies text[],
        assignees text[],
        watchers text[],
        labels text[],
        deleted boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        hierarchical_number text,
        parent_task_id uuid,
        is_template boolean DEFAULT false,
        original_task_id uuid
      )', table_name);

    -- הוספת אילוץ חוץ בנפרד (עם שם אילוץ מקוצר ובטוח יותר)
    EXECUTE format('
      ALTER TABLE %I 
      ADD CONSTRAINT %I 
      FOREIGN KEY (project_id) 
      REFERENCES projects(id) 
      ON DELETE CASCADE
    ', table_name, constraint_name);

    -- הגדרת הרשאות
    EXECUTE format('
      ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY select_policy
      ON %I
      FOR SELECT
      USING (true);
      
      CREATE POLICY insert_policy
      ON %I
      FOR INSERT
      WITH CHECK (project_id = %L);
      
      CREATE POLICY update_policy
      ON %I
      FOR UPDATE
      USING (project_id = %L)
      WITH CHECK (project_id = %L);
      
      CREATE POLICY delete_policy
      ON %I
      FOR DELETE
      USING (project_id = %L);
    ', 
      table_name, 
      table_name, 
      table_name, project_id,
      table_name, project_id, project_id,
      table_name, project_id
    );

    -- יצירת אינדקסים
    EXECUTE format('CREATE INDEX %I ON %I (project_id)', table_name || '_project_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (stage_id)', table_name || '_stage_id_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (status)', table_name || '_status_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (priority)', table_name || '_priority_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON %I (hierarchical_number)', table_name || '_hierarchical_number_idx', table_name);
  END IF;

  RAISE NOTICE 'Table % created successfully', table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הפונקציה delete_project_table מחדש
CREATE OR REPLACE FUNCTION delete_project_table(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- מחיקת הטבלה
    EXECUTE format('DROP TABLE %I', table_name);
    RAISE NOTICE 'Table % deleted successfully', table_name;
  ELSE
    RAISE NOTICE 'Table % does not exist', table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- פונקציה להעתקת משימה בודדת מהטבלה הראשית לטבלה הספציפית של הפרויקט
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

-- פונקציה להעתקת מספר משימות מהטבלה הראשית לטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION copy_tasks_to_project_table(task_ids uuid[], project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_id uuid;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- עבור על כל המשימות ברשימה והעתק אותן
  FOREACH task_id IN ARRAY task_ids LOOP
    PERFORM copy_task_to_project_table(task_id, project_id);
  END LOOP;
  
  RAISE NOTICE 'הועתקו % משימות לטבלת הפרויקט %', array_length(task_ids, 1), project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להוספת משימות חדשות ישירות לטבלת הפרויקט
CREATE OR REPLACE FUNCTION add_tasks_to_project_table(tasks_data jsonb, project_id uuid)
RETURNS SETOF uuid AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_data jsonb;
  task_id uuid;
  sql_insert text;
  columns text[];
  values text[];
  i int;
  key_var text;
  value_var jsonb;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- עבור על כל המשימות ברשימה והוסף אותן
  FOR task_data IN SELECT jsonb_array_elements(tasks_data) LOOP
    -- איפוס המערכים
    columns := ARRAY[]::text[];
    values := ARRAY[]::text[];
    i := 0;
    
    -- הוספת מזהה פרויקט אם לא קיים
    IF NOT task_data ? 'project_id' THEN
      task_data := jsonb_set(task_data, '{project_id}', to_jsonb(project_id));
    END IF;
    
    -- הוספת מזהה משימה אם לא קיים
    IF NOT task_data ? 'id' THEN
      task_id := uuid_generate_v4();
      task_data := jsonb_set(task_data, '{id}', to_jsonb(task_id));
    ELSE
      task_id := (task_data->>'id')::uuid;
    END IF;
    
    -- בניית רשימת העמודות והערכים
    FOR key_var, value_var IN SELECT * FROM jsonb_each(task_data) LOOP
      i := i + 1;
      columns := array_append(columns, quote_ident(key_var));
      
      -- טיפול בערכים NULL
      IF value_var IS NULL OR value_var = 'null'::jsonb THEN
        values := array_append(values, 'NULL');
      -- טיפול במערכים
      ELSIF jsonb_typeof(value_var) = 'array' THEN
        values := array_append(values, quote_nullable(value_var::text));
      -- טיפול בערכים רגילים
      ELSE
        values := array_append(values, quote_nullable(value_var#>>'{}'));
      END IF;
    END LOOP;
    
    -- בניית שאילתת ההוספה
    sql_insert := format('INSERT INTO %I (%s) VALUES (%s) RETURNING id',
      table_name,
      array_to_string(columns, ', '),
      array_to_string(values, ', ')
    );
    
    -- ביצוע ההוספה והחזרת המזהה
    EXECUTE sql_insert INTO task_id;
    RETURN NEXT task_id;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לסנכרון כל המשימות של פרויקט מהטבלה הראשית לטבלה הספציפית
CREATE OR REPLACE FUNCTION sync_project_tasks(project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_record record;
  task_count int := 0;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(project_id);
  END IF;
  
  -- עבור על כל המשימות של הפרויקט בטבלה הראשית
  FOR task_record IN SELECT id FROM tasks WHERE project_id = $1 AND deleted = false LOOP
    -- העתקת המשימה לטבלה הספציפית
    PERFORM copy_task_to_project_table(task_record.id, $1);
    task_count := task_count + 1;
  END LOOP;
  
  RAISE NOTICE 'סונכרנו % משימות לטבלת הפרויקט %', task_count, project_id;
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
      SELECT * FROM %I WHERE deleted = false ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
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
  IF check_table_exists(table_name) THEN
    -- בדיקה אם המשימה קיימת בטבלה הספציפית
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1 FROM %I WHERE id = %L
      )', table_name, task_id) INTO task_exists;
    
    IF task_exists THEN
      -- עדכון המשימה בטבלה הספציפית מהטבלה הראשית
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
          updated_at = now(),
          hierarchical_number = t.hierarchical_number,
          parent_task_id = t.parent_task_id,
          is_template = t.is_template,
          original_task_id = t.original_task_id
        FROM tasks t
        WHERE %I.id = %L AND t.id = %L
      ', table_name, table_name, task_id, task_id);
      
      RAISE NOTICE 'משימה % עודכנה בטבלת הפרויקט %', task_id, project_id;
    ELSE
      -- אם המשימה לא קיימת בטבלה הספציפית, נעתיק אותה
      PERFORM copy_task_to_project_table(task_id, project_id);
    END IF;
  ELSE
    RAISE NOTICE 'טבלת משימות ספציפית לפרויקט % אינה קיימת', project_id;
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
