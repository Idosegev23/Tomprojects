-- מיגרציה לתיקון פונקציית רשימת הטריגרים
-- תאריך: 02-04-2025

-- מחיקת הפונקציה הקיימת
DROP FUNCTION IF EXISTS list_projects_triggers;

-- פונקציה חדשה להצגת כל הטריגרים על טבלת projects
CREATE OR REPLACE FUNCTION list_projects_triggers_v2()
RETURNS TABLE (
  trigger_name text,
  table_name text,
  event_manipulation text,
  action_orientation text,
  action_timing text,
  function_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_trigger.tgname::text AS trigger_name,
    pg_class.relname::text AS table_name,
    (CASE WHEN pg_trigger.tgtype & 1 = 1 THEN 'INSERT' ELSE '' END ||
     CASE WHEN pg_trigger.tgtype & 2 = 2 THEN ' DELETE' ELSE '' END ||
     CASE WHEN pg_trigger.tgtype & 4 = 4 THEN ' UPDATE' ELSE '' END ||
     CASE WHEN pg_trigger.tgtype & 8 = 8 THEN ' TRUNCATE' ELSE '' END) AS event_manipulation,
    (CASE WHEN pg_trigger.tgtype & 64 = 64 THEN 'ROW' ELSE 'STATEMENT' END) AS action_orientation,
    (CASE WHEN pg_trigger.tgtype & 32 = 32 THEN 'INSTEAD OF' ELSE
      CASE WHEN pg_trigger.tgtype & 16 = 16 THEN 'AFTER' ELSE 'BEFORE' END
    END) AS action_timing,
    pg_proc.proname::text AS function_name
  FROM pg_trigger
  JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
  JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
  JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
  WHERE pg_class.relname = 'projects'
  ORDER BY pg_trigger.tgname;
END;
$$ LANGUAGE plpgsql;

-- הענקת הרשאות לפונקציה
GRANT EXECUTE ON FUNCTION list_projects_triggers_v2() TO anon, authenticated, service_role; 