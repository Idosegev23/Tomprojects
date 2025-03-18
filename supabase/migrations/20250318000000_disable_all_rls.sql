-- ביטול RLS והסרת כל מדיניויות האבטחה מכל הטבלאות במערכת

-- טבלת entrepreneurs
ALTER TABLE IF EXISTS public.entrepreneurs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.entrepreneurs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.entrepreneurs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.entrepreneurs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.entrepreneurs;

-- טבלת projects
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read projects" ON public.projects;
DROP POLICY IF EXISTS "projects_policy" ON public.projects;

-- טבלת tasks
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.tasks;

-- טבלת stages
ALTER TABLE IF EXISTS public.stages DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_access" ON public.stages;

-- הסרת RLS מטבלאות הפרויקטים הספציפיות
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'project_%_tasks'
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS select_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS insert_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS update_policy ON public.%I', table_record.table_name);
        EXECUTE format('DROP POLICY IF EXISTS delete_policy ON public.%I', table_record.table_name);
    END LOOP;
END
$$;

-- הענקת הרשאות גישה מלאות לכל הטבלאות עבור כל התפקידים
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

-- הענקת הרשאות לרצפים
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role; 