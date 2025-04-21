-- supabase/migrations/YYYYMMDDHHMMSS_remove_original_task_id_from_copy.sql

-- עדכון הפונקציה copy_task_to_project_table להסרת עמודה מיותרת

CREATE OR REPLACE FUNCTION copy_task_to_project_table(task_id uuid, project_id uuid)
RETURNS void AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  task_exists boolean;
  task_record record;
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
    -- קבלת נתוני המשימה מהטבלה הראשית 'tasks'
    SELECT * INTO task_record FROM tasks WHERE id = task_id;

    -- בדיקה אם המשימה נמצאה בטבלה הראשית
    IF task_record.id IS NULL THEN
      RAISE NOTICE 'משימה % לא נמצאה בטבלה הראשית', task_id;
      RETURN;
    END IF;

    -- הוספת המשימה לטבלה הספציפית ללא original_task_id
    EXECUTE format('
      INSERT INTO %I (
        id, project_id, stage_id, title, description, category, status, priority,
        responsible, estimated_hours, actual_hours, start_date, due_date, completed_date,
        budget, dependencies, assignees, watchers, labels, deleted, created_at, updated_at,
        hierarchical_number, parent_task_id, is_template
      ) VALUES (
        %L, %L, %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L, %L, %L,
        %L, %L, %L, %L, %L, %L, %L, %L,
        %L, %L, %L
      )
    ', 
      table_name,
      task_record.id,
      project_id,
      task_record.stage_id, task_record.title,
      task_record.description, task_record.category, task_record.status, task_record.priority,
      task_record.responsible, task_record.estimated_hours, task_record.actual_hours,
      task_record.start_date, task_record.due_date, task_record.completed_date,
      task_record.budget, task_record.dependencies, task_record.assignees,
      task_record.watchers, task_record.labels, task_record.deleted,
      task_record.created_at, task_record.updated_at, task_record.hierarchical_number,
      task_record.parent_task_id, 
      COALESCE(task_record.is_template, false)
    );
    
    RAISE NOTICE 'משימה % הועתקה לטבלת הפרויקט %', task_id, project_id;
  ELSE
    RAISE NOTICE 'משימה % כבר קיימת בטבלת הפרויקט %', task_id, project_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות מחדש (ליתר ביטחון)
GRANT EXECUTE ON FUNCTION copy_task_to_project_table(uuid, uuid) TO anon, authenticated, service_role; 