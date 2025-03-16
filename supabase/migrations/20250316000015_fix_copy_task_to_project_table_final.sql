-- מחיקת הפונקציה copy_task_to_project_table ויצירתה מחדש
DROP FUNCTION IF EXISTS copy_task_to_project_table(uuid, uuid);

-- יצירת הפונקציה copy_task_to_project_table מחדש
CREATE FUNCTION copy_task_to_project_table(p_task_id uuid, p_project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || p_project_id::text || '_tasks';
  task_exists boolean;
  task_record record;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(table_name) THEN
    -- יצירת הטבלה אם היא לא קיימת
    PERFORM create_project_table(p_project_id);
  END IF;
  
  -- בדיקה אם המשימה כבר קיימת בטבלה הספציפית
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM %I WHERE id = %L
    )', table_name, p_task_id) INTO task_exists;
  
  IF NOT task_exists THEN
    -- קבלת נתוני המשימה מהטבלה הראשית
    SELECT * INTO task_record FROM tasks t WHERE t.id = p_task_id AND t.project_id = p_project_id;
    
    IF task_record IS NULL THEN
      RAISE NOTICE 'משימה % לא נמצאה בפרויקט %', p_task_id, p_project_id;
      RETURN;
    END IF;
    
    -- הוספת המשימה לטבלה הספציפית עם ציון מפורש של העמודות והערכים
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, category, status, priority,
        responsible, estimated_hours, actual_hours, start_date, due_date, completed_date,
        budget, dependencies, assignees, watchers, labels, deleted, created_at, updated_at,
        hierarchical_number, parent_task_id, is_template, original_task_id
      ) VALUES (
        %L, %L, %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L
      )
    ', 
      table_name,
      task_record.id, task_record.project_id, task_record.stage_id, task_record.title,
      task_record.description, task_record.category, task_record.status, task_record.priority,
      task_record.responsible, task_record.estimated_hours, task_record.actual_hours,
      task_record.start_date, task_record.due_date, task_record.completed_date,
      task_record.budget, task_record.dependencies, task_record.assignees,
      task_record.watchers, task_record.labels, task_record.deleted,
      task_record.created_at, task_record.updated_at, task_record.hierarchical_number,
      task_record.parent_task_id, 
      COALESCE(task_record.is_template, false), -- המרה מפורשת ל-boolean
      task_record.original_task_id
    );
    
    RAISE NOTICE 'משימה % הועתקה לטבלת הפרויקט %', p_task_id, p_project_id;
  ELSE
    RAISE NOTICE 'משימה % כבר קיימת בטבלת הפרויקט %', p_task_id, p_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 