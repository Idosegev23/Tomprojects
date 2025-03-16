-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS sync_project_tasks(uuid);
DROP FUNCTION IF EXISTS add_tasks_to_project_table(jsonb, uuid);

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