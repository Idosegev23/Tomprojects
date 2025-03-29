-- migration_name: 20251000000000_remove_project_specific_stages_tables
-- description: הסרה מוחלטת של טבלאות שלבים ספציפיות לפרויקטים והפונקציות שמטפלות בהן

DO $$ 
BEGIN
  RAISE NOTICE '----- הסרת טבלאות שלבים ספציפיות לפרויקטים -----';
END $$;

-- ========================================================
-- 1. הסרת טריגרים הקשורים לטבלאות שלבים ספציפיות
-- ========================================================
DROP TRIGGER IF EXISTS sync_stages_trigger ON stages;
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;

-- ========================================================
-- 2. מחיקת כל הפונקציות הקשורות לטבלאות שלבים ספציפיות
-- ========================================================
DROP FUNCTION IF EXISTS copy_stages_to_project_table(uuid);
DROP FUNCTION IF EXISTS copy_stages_to_project_table_v2(uuid);
DROP FUNCTION IF EXISTS clone_stages_to_project_table(uuid);
DROP FUNCTION IF EXISTS sync_project_stages(uuid);
DROP FUNCTION IF EXISTS sync_stages_on_change();
DROP FUNCTION IF EXISTS create_project_stages_table(uuid);
DROP FUNCTION IF EXISTS create_project_stages_table_on_project_insert();
DROP FUNCTION IF EXISTS fix_project_stages_table(uuid);
DROP FUNCTION IF EXISTS fix_specific_project_stages_table(text);
DROP FUNCTION IF EXISTS check_stages_table_exists(uuid);
DROP FUNCTION IF EXISTS manage_project_stages_table(uuid);

-- ========================================================
-- 3. מחיקת כל טבלאות השלבים הספציפיות לפרויקטים
-- ========================================================
DO $$
DECLARE
  table_name text;
BEGIN
  -- מציאת כל הטבלאות שמתחילות ב-project_ ומסתיימות ב-_stages
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE 'project_%\_stages'
  LOOP
    -- מחיקת הטבלה
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
    RAISE NOTICE 'נמחקה טבלת שלבים %', table_name;
  END LOOP;
END $$;

DO $$ 
BEGIN
  RAISE NOTICE '----- הסרת טבלאות שלבים ספציפיות לפרויקטים הושלמה בהצלחה -----';
END $$;
