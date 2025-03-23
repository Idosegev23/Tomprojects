-- סקריפט לתיקון הרשאות גישה לטבלת stages
-- העתק והדבק קוד זה לממשק SQL של סופאבייס

-- ביטול מוחלט של RLS על טבלת stages
ALTER TABLE IF EXISTS public.stages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.stages;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.stages;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.stages;

-- הענקת הרשאות גישה מלאות לטבלת stages
GRANT ALL PRIVILEGES ON TABLE public.stages TO anon;
GRANT ALL PRIVILEGES ON TABLE public.stages TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.stages TO service_role;

-- הסרת RLS מטבלאות השלבים הספציפיות של כל פרויקט
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'project_%_stages'
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS select_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS insert_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS update_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS delete_policy ON public.%I', table_record.table_name);
    END LOOP;
END
$$;

-- הענקת הרשאות גישה גם לכל טבלאות השלבים הספציפיות
DO $$
DECLARE
    project_table RECORD;
BEGIN
    FOR project_table IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'project_%_stages'
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO anon', project_table.table_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO authenticated', project_table.table_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', project_table.table_name);
    END LOOP;
END
$$;

-- וידוא שכל המשתמשים יכולים לקרוא מהטבלה
COMMENT ON TABLE public.stages IS 'טבלת השלבים - כל המשתמשים יכולים לגשת אליה ללא הגבלות';

-- לוג הפעולה לבדיקה
SELECT 'הסרת הגבלות RLS מטבלת stages והענקת הרשאות גישה מלאות בוצעה בהצלחה!' AS log; 