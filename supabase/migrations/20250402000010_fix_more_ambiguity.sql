-- migration_name: 20250402000010_fix_more_ambiguity
-- description: תיקון נוסף לדו-משמעות בפונקציית בדיקת קיום טבלה

-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS check_stages_table_exists(text);
DROP FUNCTION IF EXISTS check_table_exists(text);

-- יצירה מחדש של פונקציית בדיקת קיום טבלת שלבים
CREATE FUNCTION check_stages_table_exists(stages_table_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = stages_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- יצירה מחדש של פונקציית בדיקת קיום טבלה
CREATE FUNCTION check_table_exists(checked_table_name text)
RETURNS boolean AS $$
DECLARE
  exists_val boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = checked_table_name
  ) INTO exists_val;
  
  RETURN exists_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות לפונקציות
GRANT EXECUTE ON FUNCTION check_stages_table_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role; 