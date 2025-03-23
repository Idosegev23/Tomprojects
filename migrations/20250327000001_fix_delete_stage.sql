-- ================================================================
-- מיגרציה מספר 20250327000001
-- תיקון פונקציית deleteStage לעבוד רק עם טבלאות ייחודיות של הפרויקט
-- ================================================================

-- בדיקה אם פונקציה קיימת כדי למנוע שגיאות
DROP FUNCTION IF EXISTS delete_stage_from_project_table(uuid, uuid);

-- יצירת פונקציית SQL חדשה למחיקת שלב מטבלה ייחודית של פרויקט
CREATE OR REPLACE FUNCTION delete_stage_from_project_table(stage_id uuid, project_id uuid)
RETURNS boolean AS $$
DECLARE
  table_name text := 'project_' || project_id::text || '_stages';
  tasks_table_name text := 'project_' || project_id::text || '_tasks';
  table_exists boolean;
  tasks_table_exists boolean;
BEGIN
  -- בדיקה אם הטבלה הייחודית קיימת
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = table_name
  ) INTO table_exists;
  
  -- בדיקה אם טבלת המשימות הייחודית קיימת
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = tasks_table_name
  ) INTO tasks_table_exists;
  
  -- אם הטבלה לא קיימת, נחזיר שגיאה
  IF NOT table_exists THEN
    RAISE EXCEPTION 'טבלת השלבים הייחודית % לא קיימת', table_name;
  END IF;
  
  -- עדכון המשימות המשויכות לשלב זה (אם יש טבלת משימות ייחודית)
  IF tasks_table_exists THEN
    EXECUTE format('
      UPDATE %I
      SET stage_id = NULL
      WHERE stage_id = %L
    ', tasks_table_name, stage_id);
  END IF;
  
  -- מחיקת השלב מהטבלה הייחודית
  EXECUTE format('
    DELETE FROM %I
    WHERE id = %L
  ', table_name, stage_id);
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'שגיאה במחיקת שלב %: %', stage_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הוספת פונקציית RPC לקריאה מהקליינט
DROP FUNCTION IF EXISTS public.delete_stage(uuid, uuid);
CREATE OR REPLACE FUNCTION public.delete_stage(stage_id uuid, project_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN delete_stage_from_project_table(stage_id, project_id);
END;
$$; 