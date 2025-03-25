-- שליפת מידע סכמה לטבלאות המרכזיות

-- מידע על טבלת projects
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
  AND table_name = 'projects'
ORDER BY 
  ordinal_position;

-- מידע על טבלת stages
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
  AND table_name = 'stages'
ORDER BY 
  ordinal_position;

-- מידע על טבלת tasks
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
  AND table_name = 'tasks'
ORDER BY 
  ordinal_position;

-- רשימת פונקציות SQL הקשורות לפרויקטים
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  t.typname AS return_type,
  p.prosrc AS function_definition
FROM 
  pg_proc p 
JOIN 
  pg_namespace n ON p.pronamespace = n.oid
JOIN 
  pg_type t ON p.prorettype = t.oid
WHERE 
  n.nspname = 'public'
  AND (
    p.proname LIKE '%project%' 
    OR p.proname LIKE '%table%'
    OR p.proname LIKE '%init%'
  )
ORDER BY 
  p.proname; 