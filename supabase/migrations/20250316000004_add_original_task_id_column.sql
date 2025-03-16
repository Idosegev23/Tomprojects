-- הוספת עמודת original_task_id לטבלת tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_task_id uuid;

-- יצירת אינדקס על העמודה החדשה
CREATE INDEX IF NOT EXISTS tasks_original_task_id_idx ON tasks (original_task_id);

-- עדכון הפונקציה update_task_in_project_table כדי לטפל בשדה original_task_id
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