-- מיגרציה לתיקון פונקציות RPC כדי שיתאימו למבנה העדכני של הטבלאות
-- תאריך: 31-03-2025

-- בדיקה אם פונקציה כבר קיימת לפני DROP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tasks_tree') THEN
    DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
  END IF;
END
$$;

-- פונקציה מעודכנת לקבלת עץ המשימות של פרויקט
CREATE OR REPLACE FUNCTION get_tasks_tree(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  project_name text;
  table_prefix text;
  project_id_safe text := replace(p_project_id::text, '-', '_');
  task_table_name text;
  result json;
BEGIN
  -- קבלת שם הפרויקט
  SELECT name INTO project_name FROM projects WHERE id = p_project_id;
  
  -- יצירת תחילית בטוחה לשם הטבלה
  IF project_name IS NOT NULL AND length(project_name) > 0 THEN
    table_prefix := get_safe_table_name(project_name);
  ELSE
    table_prefix := project_id_safe;
  END IF;
  
  -- הגדרת שם טבלת המשימות
  task_table_name := 'project_' || table_prefix || '_tasks';

  IF check_table_exists(task_table_name) THEN
    -- בדיקה אם הטבלה קיימת ואז ביצוע השאילתה
    BEGIN
      EXECUTE format('
        WITH RECURSIVE task_tree AS (
          -- שורשי העץ (משימות ללא משימת אב)
          SELECT 
            id, title, description, project_id, stage_id, status, priority,
            due_date, hierarchical_number, parent_task_id, category,
            responsible, NULL::jsonb AS children
          FROM %I
          WHERE parent_task_id IS NULL
          
          UNION ALL
          
          -- משימות בנות
          SELECT 
            t.id, t.title, t.description, t.project_id, t.stage_id, t.status, t.priority,
            t.due_date, t.hierarchical_number, t.parent_task_id, t.category,
            t.responsible, NULL::jsonb AS children
          FROM %I t
          INNER JOIN task_tree tt ON t.parent_task_id = tt.id
        )
        SELECT json_agg(
          json_build_object(
            ''id'', id,
            ''title'', title,
            ''description'', description,
            ''project_id'', project_id,
            ''stage_id'', stage_id,
            ''status'', status,
            ''priority'', priority,
            ''due_date'', due_date,
            ''hierarchical_number'', hierarchical_number,
            ''parent_task_id'', parent_task_id,
            ''category'', category,
            ''responsible'', responsible,
            ''children'', children
          )
        ) FROM task_tree;
      ', task_table_name, task_table_name) INTO result;
    EXCEPTION WHEN OTHERS THEN
      -- אם יש שגיאה, לוג ומחזיר מערך ריק
      RAISE NOTICE 'שגיאה בביצוע השאילתה: %', SQLERRM;
      result := '[]'::json;
    END;
    
    -- אם אין תוצאות, מחזירים מערך ריק במקום NULL
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

-- בדיקה אם פונקציה כבר קיימת לפני DROP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_project_tasks') THEN
    DROP FUNCTION IF EXISTS get_project_tasks(uuid);
  END IF;
END
$$;

-- פונקציה מעודכנת לקבלת משימות פרויקט (כל השדות הבסיסיים בלבד)
CREATE OR REPLACE FUNCTION get_project_tasks(p_project_id uuid)
RETURNS SETOF json AS $$
DECLARE
  project_name text;
  table_prefix text;
  project_id_safe text := replace(p_project_id::text, '-', '_');
  task_table_name text;
  result json;
BEGIN
  -- קבלת שם הפרויקט
  SELECT name INTO project_name FROM projects WHERE id = p_project_id;
  
  -- יצירת תחילית בטוחה לשם הטבלה
  IF project_name IS NOT NULL AND length(project_name) > 0 THEN
    table_prefix := get_safe_table_name(project_name);
  ELSE
    table_prefix := project_id_safe;
  END IF;
  
  -- הגדרת שם טבלת המשימות
  task_table_name := 'project_' || table_prefix || '_tasks';

  IF check_table_exists(task_table_name) THEN
    -- ביצוע השאילתה אם הטבלה קיימת
    BEGIN
      EXECUTE format('
        SELECT json_agg(
          json_build_object(
            ''id'', id,
            ''title'', title,
            ''description'', description,
            ''project_id'', project_id,
            ''stage_id'', stage_id,
            ''status'', status,
            ''priority'', priority,
            ''due_date'', due_date,
            ''hierarchical_number'', hierarchical_number,
            ''parent_task_id'', parent_task_id,
            ''category'', category,
            ''responsible'', responsible,
            ''created_at'', created_at,
            ''updated_at'', updated_at
          )
        )
        FROM %I
        WHERE project_id = %L
      ', task_table_name, p_project_id) INTO result;
    EXCEPTION WHEN OTHERS THEN
      -- אם יש שגיאה, לוג ומחזיר מערך ריק
      RAISE NOTICE 'שגיאה בביצוע השאילתה: %', SQLERRM;
      result := '[]'::json;
    END;
    
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