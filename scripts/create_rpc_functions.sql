-- פונקציה לקבלת רשימת הטבלאות
CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE (
  table_name text
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
$$;

-- פונקציה ליצירת פונקציית get_tables
CREATE OR REPLACE FUNCTION create_get_tables_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- הפונקציה כבר נוצרה בקובץ הזה, אז אין צורך לעשות כלום
  RETURN;
END;
$$;

-- פונקציה לקבלת מידע על עמודות בטבלה
CREATE OR REPLACE FUNCTION get_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  column_default text,
  is_nullable text
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    column_default::text,
    is_nullable::text
  FROM 
    information_schema.columns
  WHERE 
    table_schema = 'public' AND
    information_schema.columns.table_name = $1
  ORDER BY 
    ordinal_position;
$$;

-- פונקציה ליצירת פונקציית get_columns
CREATE OR REPLACE FUNCTION create_get_columns_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- הפונקציה כבר נוצרה בקובץ הזה, אז אין צורך לעשות כלום
  RETURN;
END;
$$; 