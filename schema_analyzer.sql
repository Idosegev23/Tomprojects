-- סקריפט מקיף לניתוח הסכמה, טבלאות, פונקציות וטריגרים

-- ======= שלב 1: טבלאות קיימות =======
SELECT '======= 1. רשימת טבלאות בסכמה ציבורית =======' AS section;
SELECT 
    table_name, 
    pg_size_pretty(pg_relation_size(quote_ident(table_name))) AS table_size
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- ======= שלב 2: מבנה הטבלאות המרכזיות =======
SELECT '======= 2. מבנה טבלת projects =======' AS section;
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'projects'
ORDER BY 
    ordinal_position;

SELECT '======= 3. מבנה טבלת tasks =======' AS section;
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'tasks'
ORDER BY 
    ordinal_position;

SELECT '======= 4. מבנה טבלת stages =======' AS section;
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'stages'
ORDER BY 
    ordinal_position;

-- ======= שלב 3: כל הפונקציות הקיימות =======
SELECT '======= 5. רשימת פונקציות בסכמה הציבורית =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    t.typname AS return_type,
    CASE p.prosecdef WHEN true THEN 'security definer' ELSE 'security invoker' END AS security
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid
WHERE 
    n.nspname = 'public'
ORDER BY 
    p.proname;

-- ======= שלב 4: פונקציות ספציפיות הקשורות לפרויקטים ומשימות =======
SELECT '======= 6. פונקציות הקשורות לפרויקטים ומשימות =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    t.typname AS return_type
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_type t ON p.prorettype = t.oid
WHERE 
    n.nspname = 'public'
    AND (
        p.proname LIKE '%project%' 
        OR p.proname LIKE '%task%'
        OR p.proname LIKE '%stage%'
        OR p.proname LIKE '%init%'
        OR p.proname LIKE '%copy%'
        OR p.proname LIKE '%create%'
    )
ORDER BY 
    p.proname;

-- ======= שלב 5: הגדרות מלאות של פונקציות מעניינות =======
SELECT '======= 7. הגדרה מלאה של פונקציית init_project_tables_and_data =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND p.proname = 'init_project_tables_and_data';

SELECT '======= 8. הגדרה מלאה של פונקציית copy_task_to_project_table =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND p.proname = 'copy_task_to_project_table';

SELECT '======= 9. הגדרה מלאה של פונקציית copy_stages_to_project_table =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND p.proname = 'copy_stages_to_project_table';

-- ======= שלב 6: טריגרים =======
SELECT '======= 10. טריגרים בסכמה הציבורית =======' AS section;
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS trigger_enabled,
    CASE t.tgtype & 1 WHEN 1 THEN 'ROW' ELSE 'STATEMENT' END AS trigger_level,
    CASE t.tgtype & (1 << 1) WHEN (1 << 1) THEN 'BEFORE' ELSE 'AFTER' END AS trigger_timing,
    pg_class.relname AS table_name,
    pg_proc.proname AS function_name
FROM 
    pg_trigger t
    JOIN pg_class ON t.tgrelid = pg_class.oid
    JOIN pg_proc ON t.tgfoid = pg_proc.oid
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE 
    pg_namespace.nspname = 'public'
    AND NOT t.tgisinternal
ORDER BY 
    pg_class.relname, trigger_name;

-- ======= שלב 7: הגדרות מלאות של טריגרים מעניינים =======
SELECT '======= 11. הגדרה מלאה של פונקציית project_after_insert_trigger =======' AS section;
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND p.proname = 'project_after_insert_trigger';

-- ======= שלב 8: בדיקה של טבלאות ספציפיות לפרויקטים =======
SELECT '======= 12. רשימת טבלאות ספציפיות של פרויקטים =======' AS section;
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE 'project_%'
ORDER BY 
    table_name;

-- ======= שלב 9: מהם הקשרים בין הטבלאות (מפתחות זרים) =======
SELECT '======= 13. קשרים בין הטבלאות (מפתחות זרים) =======' AS section;
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (
        tc.table_name = 'projects' 
        OR tc.table_name = 'tasks' 
        OR tc.table_name = 'stages'
        OR tc.table_name LIKE 'project_%'
    )
ORDER BY 
    tc.table_name;

-- ======= שלב 10: בדיקה אם יש טבלאות דינמיות שנוצרו מהפונקציות שלנו =======
SELECT '======= 14. דוגמאות לטבלאות דינמיות שנוצרו =======' AS section;
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM 
    information_schema.tables t
WHERE 
    table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name LIKE 'project_%_tasks'
        OR table_name LIKE 'project_%_stages'
    )
LIMIT 10; 