-- מיגרציה ליצירת פונקציות RPC חסרות
-- תאריך: 29-03-2025

-- יצירת פונקציות RPC חסרות

-- בדיקה אם פונקציה כבר קיימת לפני DROP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tasks_tree') THEN
    DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
  END IF;
END
$$;

-- פונקציה לקבלת עץ המשימות של פרויקט
CREATE OR REPLACE FUNCTION get_tasks_tree(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  task_table_name text := 'project_' || p_project_id::text || '_tasks';
  result json;
BEGIN
  IF check_table_exists(task_table_name) THEN
    -- בדיקה אם הטבלה קיימת ואז ביצוע השאילתה
    EXECUTE format('
      WITH RECURSIVE task_tree AS (
        -- שורשי העץ (משימות ללא משימת אב)
        SELECT t.*, jsonb_build_array() AS children
        FROM %I t
        WHERE t.parent_task_id IS NULL
        
        UNION ALL
        
        -- משימות בנות
        SELECT t.*, jsonb_build_array() AS children
        FROM %I t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.id
      )
      SELECT json_agg(to_json(t)) FROM task_tree t;
    ', task_table_name, task_table_name) INTO result;
    
    RETURN QUERY SELECT result;
  ELSE
    -- אם הטבלה לא קיימת, מחזירים מערך ריק
    RETURN QUERY SELECT '[]'::json;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- בדיקה אם פונקציה כבר קיימת לפני DROP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_project_tasks') THEN
    DROP FUNCTION IF EXISTS get_project_tasks(uuid);
  END IF;
END
$$;

-- פונקציה לקבלת משימות פרויקט
CREATE OR REPLACE FUNCTION get_project_tasks(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  task_table_name text := 'project_' || p_project_id::text || '_tasks';
  result json;
BEGIN
  IF check_table_exists(task_table_name) THEN
    -- ביצוע השאילתה אם הטבלה קיימת
    EXECUTE format('
      SELECT json_agg(to_json(t))
      FROM %I t
      WHERE t.project_id = %L
    ', task_table_name, p_project_id) INTO result;
    
    -- אם אין תוצאות, החזרת מערך ריק במקום NULL
    IF result IS NULL THEN
      result := '[]'::json;
    END IF;
    
    RETURN QUERY SELECT result;
  ELSE
    -- אם הטבלה לא קיימת, מחזירים מערך ריק
    RETURN QUERY SELECT '[]'::json;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות החדשות
GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role; 