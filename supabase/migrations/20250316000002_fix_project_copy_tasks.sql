-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid);
DROP FUNCTION IF EXISTS copy_tasks_to_project_table(uuid[], uuid);

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