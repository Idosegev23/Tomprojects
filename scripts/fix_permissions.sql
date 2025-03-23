-- סקריפט לתיקון הרשאות גישה לטבלאות פרויקטים ספציפיות
-- מוסיף הרשאות ומבטל RLS לכל הטבלאות הקשורות לפרויקטים

-- פונקציה לתיקון הרשאות גישה ו-RLS לטבלה ספציפית
DROP FUNCTION IF EXISTS fix_table_permissions(text);
CREATE FUNCTION fix_table_permissions(table_name text)
RETURNS void AS $$
BEGIN
  -- בדיקה האם הטבלה קיימת
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = fix_table_permissions.table_name
  ) THEN
    -- מתן הרשאות מלאות לכל המשתמשים
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon', fix_table_permissions.table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO authenticated', fix_table_permissions.table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO service_role', fix_table_permissions.table_name);
    
    -- ביטול RLS
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', fix_table_permissions.table_name);
    
    RAISE NOTICE 'הרשאות תוקנו עבור טבלה %', fix_table_permissions.table_name;
  ELSE
    RAISE NOTICE 'טבלה % לא קיימת', fix_table_permissions.table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. תיקון הרשאות לטבלאות המרכזיות
SELECT fix_table_permissions('projects');
SELECT fix_table_permissions('stages');
SELECT fix_table_permissions('tasks');

-- 2. תיקון הרשאות לטבלאות ספציפיות לפרויקטים
DO $$
DECLARE
  project_record RECORD;
  safe_project_id text;
BEGIN
  -- מעבר על כל הפרויקטים הקיימים
  FOR project_record IN SELECT id FROM projects LOOP
    -- המרת המזהה לפורמט בטוח עבור שמות טבלאות
    safe_project_id := replace(project_record.id::text, '-', '_');
    
    -- קריאה לפונקציה לתיקון הרשאות עבור הטבלאות הספציפיות
    PERFORM fix_table_permissions('project_' || safe_project_id || '_tasks');
    PERFORM fix_table_permissions('project_' || safe_project_id || '_stages');
  END LOOP;
END $$;

-- 3. מתן הרשאות הרצה לפונקציות RPC
DO $$
BEGIN
  -- פונקציות מרכזיות
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_project_tables(uuid) TO anon, authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION init_project_tables_and_data(uuid, boolean, boolean, uuid[]) TO anon, authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION check_table_exists(text) TO anon, authenticated, service_role';
  
  RAISE NOTICE 'הענקת הרשאות לפונקציות הושלמה בהצלחה';
END $$;

-- 4. מחיקת מדיניות RLS לא נחוצה
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- מחיקת כל מדיניויות RLS שקשורות לטבלאות הפרויקט
  FOR policy_record IN 
    SELECT policyname, tablename
    FROM pg_policies
    WHERE tablename LIKE 'project_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
                  policy_record.policyname, 
                  policy_record.tablename);
    
    RAISE NOTICE 'מדיניות % על טבלה % נמחקה', 
                policy_record.policyname, 
                policy_record.tablename;
  END LOOP;
END $$;

-- 5. יצירת מדיניות RLS בסיסית אם נדרש (פה נשאיר את ה-RLS מנוטרל)
-- כרגע אין צורך ביצירת מדיניות RLS חדשה כי אנחנו רוצים גישה מלאה

-- 6. הוספת הערה בטבלאות הרלוונטיות
DO $$
DECLARE
  project_record RECORD;
  safe_project_id text;
BEGIN
  -- הוספת הערה לטבלאות המרכזיות
  EXECUTE 'COMMENT ON TABLE projects IS ''טבלת פרויקטים - גישה מלאה לכל המשתמשים''';
  EXECUTE 'COMMENT ON TABLE stages IS ''טבלת שלבים כללית - גישה מלאה לכל המשתמשים''';
  EXECUTE 'COMMENT ON TABLE tasks IS ''טבלת משימות כללית - גישה מלאה לכל המשתמשים''';
  
  -- מעבר על כל הפרויקטים
  FOR project_record IN SELECT id FROM projects LOOP
    -- המרת המזהה לפורמט בטוח עבור שמות טבלאות
    safe_project_id := replace(project_record.id::text, '-', '_');
    
    -- הוספת הערה לטבלאות של כל פרויקט
    EXECUTE format('COMMENT ON TABLE project_%s_tasks IS ''טבלת משימות של פרויקט %s - גישה מלאה לכל המשתמשים''',
                  safe_project_id, project_record.id::text);
    EXECUTE format('COMMENT ON TABLE project_%s_stages IS ''טבלת שלבים של פרויקט %s - גישה מלאה לכל המשתמשים''',
                  safe_project_id, project_record.id::text);
  END LOOP;
END $$; 