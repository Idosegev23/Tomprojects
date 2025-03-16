-- מחיקת הפונקציה sync_project_tasks ויצירתה מחדש
DROP FUNCTION IF EXISTS sync_project_tasks(uuid);

-- יצירת הפונקציה sync_project_tasks מחדש
CREATE FUNCTION sync_project_tasks(p_project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || p_project_id::text || '_tasks';
  task_record record;
  task_count int := 0;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(p_project_id);
  END IF;
  
  -- עבור על כל המשימות של הפרויקט בטבלה הראשית
  FOR task_record IN SELECT t.id FROM tasks t WHERE t.project_id = p_project_id AND t.deleted = false LOOP
    -- העתקת המשימה לטבלה הספציפית
    PERFORM copy_task_to_project_table(task_record.id, p_project_id);
    task_count := task_count + 1;
  END LOOP;
  
  RAISE NOTICE 'סונכרנו % משימות לטבלת הפרויקט %', task_count, p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 