-- migration_name: 20250402000007_create_missing_trigger_functions
-- description: יצירת פונקציות טריגר חסרות

-- יצירת הפונקציה create_project_stages_table_on_project_insert() שחסרה
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה ליצירת טבלת שלבים ספציפית לפרויקט
  PERFORM create_project_stages_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- יצירת הפונקציה sync_all_project_tables_on_insert() אם היא גם חסרה
CREATE OR REPLACE FUNCTION sync_all_project_tables_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- יצירת טבלאות ספציפיות לפרויקט
  PERFORM create_project_tables(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- יצירת הפונקציה create_project_table_on_project_insert() אם היא חסרה
CREATE OR REPLACE FUNCTION create_project_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_project_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הענקת הרשאות לפונקציות
GRANT EXECUTE ON FUNCTION create_project_stages_table_on_project_insert() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION sync_all_project_tables_on_insert() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_table_on_project_insert() TO anon, authenticated, service_role; 