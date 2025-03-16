-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
DROP FUNCTION IF EXISTS get_project_tasks(uuid);

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION get_project_tasks(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  table_exists boolean;
BEGIN
  -- בדיקה אם הטבלה קיימת
  SELECT check_table_exists(table_name) INTO table_exists;
  
  IF table_exists THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I WHERE deleted = false ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Falling back to main tasks table for project %', project_id;
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- במקרה של שגיאה, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Error in get_project_tasks: %, falling back to main tasks table', SQLERRM;
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט במבנה היררכי
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
  table_exists boolean;
BEGIN
  -- בדיקה אם הטבלה קיימת
  SELECT check_table_exists(table_name) INTO table_exists;
  
  IF table_exists THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I WHERE deleted = false ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Falling back to main tasks table for project %', project_id;
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- במקרה של שגיאה, נחזיר את המשימות מהטבלה הראשית
    RAISE NOTICE 'Error in get_tasks_tree: %, falling back to main tasks table', SQLERRM;
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 