-- תיקון הפונקציה sync_project_tasks כדי לפתור את בעיית העמודה הדו-משמעית
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
  FOR task_record IN SELECT t.id FROM tasks t WHERE t.project_id = project_id AND t.deleted = false LOOP
    -- העתקת המשימה לטבלה הספציפית
    PERFORM copy_task_to_project_table(task_record.id, project_id);
    task_count := task_count + 1;
  END LOOP;
  
  RAISE NOTICE 'סונכרנו % משימות לטבלת הפרויקט %', task_count, project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 