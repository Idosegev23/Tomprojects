-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
DROP FUNCTION IF EXISTS get_project_tasks(uuid);

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט
CREATE OR REPLACE FUNCTION get_project_tasks(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I WHERE deleted = false ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת כל המשימות מהטבלה הספציפית של הפרויקט במבנה היררכי
CREATE OR REPLACE FUNCTION get_tasks_tree(project_id uuid)
RETURNS SETOF tasks AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_tasks';
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF check_table_exists(table_name) THEN
    -- החזרת כל המשימות מהטבלה הספציפית
    RETURN QUERY EXECUTE format('
      SELECT * FROM %I WHERE deleted = false ORDER BY hierarchical_number
    ', table_name);
  ELSE
    -- אם הטבלה לא קיימת, נחזיר את המשימות מהטבלה הראשית
    RETURN QUERY SELECT * FROM tasks WHERE project_id = $1 AND deleted = false ORDER BY hierarchical_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 