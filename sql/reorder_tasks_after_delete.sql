-- פונקציה לסידור מחדש של מספרים היררכיים לאחר מחיקת משימה
CREATE OR REPLACE FUNCTION reorder_tasks_after_delete(
  project_id_param uuid,
  parent_task_id_param uuid
)
RETURNS void AS $$
DECLARE
  project_id_safe text := replace(project_id_param::text, '-', '_');
  table_name text := 'project_' || project_id_safe || '_tasks';
  task record;
  idx integer := 1;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT (SELECT public.check_table_exists(table_name)) THEN
    RAISE NOTICE 'טבלה % אינה קיימת', table_name;
    RETURN;
  END IF;
    
  -- אם יש parent_task_id, סדר את תתי-המשימות שלו
  IF parent_task_id_param IS NOT NULL THEN
    -- עדכון המספרים ההיררכיים של תתי-המשימות
    FOR task IN EXECUTE format('
      SELECT 
        id,
        hierarchical_number
      FROM %I
      WHERE parent_task_id = %L
      ORDER BY hierarchical_number ASC
    ', table_name, parent_task_id_param)
    LOOP
      -- מקבלים את המספר ההיררכי של ההורה
      DECLARE
        parent_hierarchical_number text;
      BEGIN
        EXECUTE format('
          SELECT hierarchical_number FROM %I WHERE id = %L
        ', table_name, parent_task_id_param) INTO parent_hierarchical_number;
        
        -- עדכון המספר ההיררכי של המשימה הנוכחית
        EXECUTE format('
          UPDATE %I
          SET hierarchical_number = %L
          WHERE id = %L
        ', table_name, parent_hierarchical_number || '.' || idx, task.id);
        
        idx := idx + 1;
      END;
    END LOOP;
    
    RAISE NOTICE 'עודכנו % תתי-משימות תחת המשימה %', idx - 1, parent_task_id_param;
  ELSE
    -- סידור מחדש של משימות ברמה העליונה (ללא הורה)
    FOR task IN EXECUTE format('
      SELECT 
        id,
        hierarchical_number
      FROM %I
      WHERE parent_task_id IS NULL
      ORDER BY hierarchical_number ASC
    ', table_name)
    LOOP
      -- עדכון המספר ההיררכי של המשימה הנוכחית
      EXECUTE format('
        UPDATE %I
        SET hierarchical_number = %L
        WHERE id = %L
      ', table_name, idx::text, task.id);
      
      idx := idx + 1;
    END LOOP;
    
    RAISE NOTICE 'עודכנו % משימות ברמה העליונה', idx - 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 