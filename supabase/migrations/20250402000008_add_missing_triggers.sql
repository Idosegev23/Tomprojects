-- migration_name: 20250402000008_add_missing_triggers
-- description: הוספת הטריגרים החסרים לטבלת projects

-- הטריגר ליצירת טבלת tasks ספציפית לפרויקט
DROP TRIGGER IF EXISTS create_project_table_trigger ON projects;
CREATE TRIGGER create_project_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_table_on_project_insert();

-- הטריגר ליצירת טבלת stages ספציפית לפרויקט
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- הטריגר לסנכרון כל הטבלאות הייעודיות של הפרויקט
DROP TRIGGER IF EXISTS sync_all_project_tables_trigger ON projects;
CREATE TRIGGER sync_all_project_tables_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_all_project_tables_on_insert();

-- פונקציה נוספת לבדיקה אם הטריגרים נוצרו בהצלחה
CREATE OR REPLACE FUNCTION verify_project_triggers_exist()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result TEXT := 'Project Triggers Status:' || E'\n';
  trigger_exists BOOLEAN;
BEGIN
  -- בדיקת הטריגר create_project_table_trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'projects' 
    AND tgname = 'create_project_table_trigger'
  ) INTO trigger_exists;
  
  result := result || 'create_project_table_trigger: ' || CASE WHEN trigger_exists THEN 'EXISTS' ELSE 'MISSING' END || E'\n';
  
  -- בדיקת הטריגר create_project_stages_table_trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'projects' 
    AND tgname = 'create_project_stages_table_trigger'
  ) INTO trigger_exists;
  
  result := result || 'create_project_stages_table_trigger: ' || CASE WHEN trigger_exists THEN 'EXISTS' ELSE 'MISSING' END || E'\n';
  
  -- בדיקת הטריגר sync_all_project_tables_trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
    WHERE pg_class.relname = 'projects' 
    AND tgname = 'sync_all_project_tables_trigger'
  ) INTO trigger_exists;
  
  result := result || 'sync_all_project_tables_trigger: ' || CASE WHEN trigger_exists THEN 'EXISTS' ELSE 'MISSING' END || E'\n';
  
  RETURN result;
END;
$$;

-- הענקת הרשאות לפונקציה החדשה
GRANT EXECUTE ON FUNCTION verify_project_triggers_exist() TO anon, authenticated, service_role; 