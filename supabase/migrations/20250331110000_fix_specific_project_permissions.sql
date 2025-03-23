-- מיגרציה לתיקון הרשאות לפרויקט ספציפי
-- מתמקדת בפרויקט b4b96d48-51f3-4657-90cc-b5f4a603771d

-- בדיקה אם הפונקציה get_safe_table_name כבר קיימת ויצירה שלה אם לא
DO $block1$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_safe_table_name'
    AND pg_get_function_arguments(oid) = 'input_text text'
  ) THEN
    EXECUTE $creation_block$
      CREATE OR REPLACE FUNCTION get_safe_table_name(input_text text)
      RETURNS text AS $function_body$
      DECLARE
        safe_name text;
      BEGIN
        -- מסיר תווים לא חוקיים ומחליף רווחים בקו תחתון
        safe_name := lower(regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g'));
        safe_name := regexp_replace(safe_name, '\s+', '_', 'g');
        
        -- אם השם ריק, נחזיר ערך ברירת מחדל
        IF length(safe_name) = 0 THEN
          safe_name := 'project';
        END IF;
        
        -- מקצר את השם אם הוא ארוך מדי
        IF length(safe_name) > 20 THEN
          safe_name := substring(safe_name FROM 1 FOR 20);
        END IF;
        
        RETURN safe_name;
      END;
      $function_body$ LANGUAGE plpgsql IMMUTABLE;
    $creation_block$;

    EXECUTE 'GRANT EXECUTE ON FUNCTION get_safe_table_name(text) TO anon, authenticated, service_role';
    
    RAISE NOTICE 'פונקציית get_safe_table_name נוצרה בהצלחה';
  ELSE
    RAISE NOTICE 'פונקציית get_safe_table_name כבר קיימת';
  END IF;
END $block1$;

-- תיקון הרשאות לטבלאות הספציפיות
DO $block2$
DECLARE
  project_id uuid := 'b4b96d48-51f3-4657-90cc-b5f4a603771d';
  tasks_table_name text := 'project_b4b96d48_51f3_4657_90cc_b5f4a603771d_tasks';
  stages_table_name text := 'project_b4b96d48_51f3_4657_90cc_b5f4a603771d_stages';
BEGIN
  -- בדיקה אם הטבלאות קיימות
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tasks_table_name) THEN
    -- ביטול RLS על טבלת המשימות הספציפית
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    
    -- הענקת הרשאות מלאות לכל סוגי המשתמשים
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
    
    RAISE NOTICE 'עדכון הרשאות לטבלת משימות % הושלם בהצלחה', tasks_table_name;
  ELSE
    RAISE NOTICE 'טבלת משימות % לא נמצאה', tasks_table_name;
  END IF;
  
  -- בדיקה אם טבלת השלבים קיימת
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = stages_table_name) THEN
    -- ביטול RLS על טבלת השלבים הספציפית
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    
    -- הענקת הרשאות מלאות לכל סוגי המשתמשים
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
    
    RAISE NOTICE 'עדכון הרשאות לטבלת שלבים % הושלם בהצלחה', stages_table_name;
  ELSE
    RAISE NOTICE 'טבלת שלבים % לא נמצאה', stages_table_name;
  END IF;
  
  -- בדיקה נוספת - שם עם מקפים
  tasks_table_name := 'project_b4b96d48-51f3-4657-90cc-b5f4a603771d_tasks';
  stages_table_name := 'project_b4b96d48-51f3-4657-90cc-b5f4a603771d_stages';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tasks_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת משימות (עם מקפים) % הושלם בהצלחה', tasks_table_name;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = stages_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת שלבים (עם מקפים) % הושלם בהצלחה', stages_table_name;
  END IF;
  
  -- בדיקה נוספת - שם עם UUID מלא
  tasks_table_name := 'project_' || project_id::text || '_tasks';
  stages_table_name := 'project_' || project_id::text || '_stages';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tasks_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת משימות (עם UUID) % הושלם בהצלחה', tasks_table_name;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = stages_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת שלבים (עם UUID) % הושלם בהצלחה', stages_table_name;
  END IF;
END $block2$;

-- פונקציית עזר לפרויקט ספציפי (פשוטה ללא שימוש ב-get_safe_table_name)
CREATE OR REPLACE FUNCTION fix_specific_project_permissions(project_id uuid)
RETURNS void AS $function_body$
DECLARE
  project_id_safe text := replace(project_id::text, '-', '_');
  tasks_table_name text;
  stages_table_name text;
BEGIN
  -- אפשרות 1: UUID עם קווים תחתונים
  tasks_table_name := 'project_' || project_id_safe || '_tasks';
  stages_table_name := 'project_' || project_id_safe || '_stages';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tasks_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת משימות % הושלם בהצלחה', tasks_table_name;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = stages_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת שלבים % הושלם בהצלחה', stages_table_name;
  END IF;
  
  -- אפשרות 2: UUID מלא עם מקפים
  tasks_table_name := 'project_' || project_id::text || '_tasks';
  stages_table_name := 'project_' || project_id::text || '_stages';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = tasks_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tasks_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', tasks_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת משימות % הושלם בהצלחה', tasks_table_name;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = stages_table_name) THEN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', stages_table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO anon, authenticated, service_role', stages_table_name);
    RAISE NOTICE 'עדכון הרשאות לטבלת שלבים % הושלם בהצלחה', stages_table_name;
  END IF;
END;
$function_body$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות ריצה לפונקציה
GRANT EXECUTE ON FUNCTION fix_specific_project_permissions(uuid) TO anon, authenticated, service_role;

-- הפעלת הפונקציה על הפרויקט הבעייתי
SELECT fix_specific_project_permissions('b4b96d48-51f3-4657-90cc-b5f4a603771d'); 