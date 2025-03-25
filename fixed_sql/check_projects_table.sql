-- בדיקת מבנה טבלת projects
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_schema = 'public' 
  AND table_name = 'projects' 
ORDER BY 
  ordinal_position; 