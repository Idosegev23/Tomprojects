-- תיקון הפונקציה copy_task_to_project_table כדי לפתור את בעיית העמודה הדו-משמעית
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
      SELECT t.* FROM tasks t WHERE t.id = %L AND t.project_id = %L
    ', table_name, task_id, project_id);
    
    RAISE NOTICE 'משימה % הועתקה לטבלת הפרויקט %', task_id, project_id;
  ELSE
    RAISE NOTICE 'משימה % כבר קיימת בטבלת הפרויקט %', task_id, project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 