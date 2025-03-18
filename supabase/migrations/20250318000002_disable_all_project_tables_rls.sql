-- ביטול RLS מטבלאות פרויקטים ספציפיות באופן מפורש

-- ביטול RLS מטבלאות פרויקטים ספציפיות
ALTER TABLE IF EXISTS public."project_b80c8fef-a677-5340-85fb-2c162d75df03_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_67219c67-5f9b-4fa8-8537-f181fe6e911e_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_faac7198-4fd6-40dd-af92-a6d24289507d_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_820ff65a-b6d6-4e05-98e3-79913987b97d_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_7a9631fb-36f0-4c5f-a524-8fc319b72860_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_1a63e5f2-e756-4deb-bc2c-0516c9dfb862_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_97fae4f7-c54c-4376-8093-8647e57571a7_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_b77439b7-26d5-4839-ae84-0690ada3f314_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."project_2019ef61-a999-40a1-9fdc-589d60d558e7_tasks" DISABLE ROW LEVEL SECURITY;

-- הסרת מדיניויות מטבלאות הפרויקטים
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
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS select_policy ON public.%I', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping select_policy on %: %', table_record.table_name, SQLERRM;
        END;
        
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS insert_policy ON public.%I', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping insert_policy on %: %', table_record.table_name, SQLERRM;
        END;
        
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS update_policy ON public.%I', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping update_policy on %: %', table_record.table_name, SQLERRM;
        END;
        
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS delete_policy ON public.%I', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping delete_policy on %: %', table_record.table_name, SQLERRM;
        END;
        
        BEGIN
            EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error disabling RLS on %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- הענקת הרשאות לכל טבלאות הפרויקטים
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
        BEGIN
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO anon', table_record.table_name);
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO authenticated', table_record.table_name);
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', table_record.table_name);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error granting privileges on %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END
$$; 