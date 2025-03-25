-- migration_name: 20250402000006_fix_check_pg_triggers
-- description: תיקון לפונקציית בדיקת טריגרים עם טיפול בסוגי נתונים

CREATE OR REPLACE FUNCTION check_pg_triggers()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    trigger_record RECORD;
    result TEXT := '';
BEGIN
    -- בדיקת טריגרים על טבלת projects
    result := result || 'Triggers on projects table:' || E'\n';
    
    FOR trigger_record IN 
        SELECT 
            tgname as trigger_name,
            pg_class.relname as table_name,
            proname as function_name,
            CASE tgtype & cast(1 as int2)
                WHEN 0 THEN 'AFTER'
                ELSE 'BEFORE'
            END as action_timing,
            CASE (tgtype & cast(66 as int2))
                WHEN 2 THEN 'BEFORE DELETE'
                WHEN 4 THEN 'BEFORE INSERT'
                WHEN 8 THEN 'BEFORE UPDATE'
                WHEN 16 THEN 'BEFORE TRUNCATE'
                WHEN 32 THEN 'INSTEAD OF'
                WHEN 64 THEN 'AFTER'
                ELSE 'UNKNOWN'
            END as timing_event
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE pg_class.relname = 'projects'
        AND NOT tgisinternal
        ORDER BY tgname
    LOOP
        result := result || 'Trigger: ' || trigger_record.trigger_name || E'\n';
        result := result || '  Table: ' || trigger_record.table_name || E'\n';
        result := result || '  Function: ' || trigger_record.function_name || E'\n';
        result := result || '  Timing: ' || trigger_record.action_timing || E'\n';
        result := result || '  Event: ' || trigger_record.timing_event || E'\n\n';
    END LOOP;
    
    -- בדיקת קיום הפונקציות הרלוונטיות
    result := result || E'\nRelevant functions:' || E'\n';
    
    FOR trigger_record IN 
        SELECT 
            proname as function_name,
            prosrc as function_source
        FROM pg_proc
        WHERE proname IN (
            'create_project_table_on_project_insert',
            'init_project_tables_and_data',
            'create_project_stages_table_on_project_insert',
            'sync_all_project_tables_on_insert'
        )
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        result := result || 'Function: ' || trigger_record.function_name || E'\n';
        result := result || '  Source (excerpt): ' || LEFT(COALESCE(trigger_record.function_source, 'Not available'), 100) || '...' || E'\n\n';
    END LOOP;
    
    -- בדיקה אם הטריגרים הנדרשים קיימים
    result := result || E'\nMissing triggers check:' || E'\n';
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE pg_class.relname = 'projects' 
        AND proname = 'create_project_table_on_project_insert'
        AND NOT tgisinternal
    ) THEN
        result := result || '  Missing trigger: create_project_table_trigger (create_project_table_on_project_insert)' || E'\n';
    ELSE
        result := result || '  Found trigger: create_project_table_trigger (create_project_table_on_project_insert)' || E'\n';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE pg_class.relname = 'projects' 
        AND proname = 'create_project_stages_table_on_project_insert'
        AND NOT tgisinternal
    ) THEN
        result := result || '  Missing trigger: create_project_stages_table_trigger (create_project_stages_table_on_project_insert)' || E'\n';
    ELSE
        result := result || '  Found trigger: create_project_stages_table_trigger (create_project_stages_table_on_project_insert)' || E'\n';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
        WHERE pg_class.relname = 'projects' 
        AND proname = 'sync_all_project_tables_on_insert'
        AND NOT tgisinternal
    ) THEN
        result := result || '  Missing trigger: sync_all_project_tables_trigger (sync_all_project_tables_on_insert)' || E'\n';
    ELSE
        result := result || '  Found trigger: sync_all_project_tables_trigger (sync_all_project_tables_on_insert)' || E'\n';
    END IF;
    
    RETURN result;
END;
$$;

-- הענקת הרשאות לפונקציה
GRANT EXECUTE ON FUNCTION check_pg_triggers() TO anon, authenticated, service_role; 