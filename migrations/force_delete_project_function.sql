-- יצירת פונקציה למחיקת פרויקט מאולצת שתעקוף את כל המגבלות
CREATE OR REPLACE FUNCTION force_delete_project(project_id_param uuid)
RETURNS void AS $$
DECLARE
    project_table text := 'project_' || project_id_param::text || '_tasks';
    task_ids uuid[];
BEGIN
    -- 1. מחיקת כל המשימות המקושרות לפרויקט
    SELECT array_agg(id) INTO task_ids 
    FROM public.tasks 
    WHERE project_id = project_id_param;
    
    IF task_ids IS NOT NULL THEN
        DELETE FROM public.tasks WHERE id = ANY(task_ids);
    END IF;
    
    -- 2. מחיקת כל השלבים המקושרים לפרויקט
    DELETE FROM public.stages WHERE project_id = project_id_param;
    
    -- 3. מחיקת טבלת הפרויקט הספציפית אם היא קיימת
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = project_table
        AND table_schema = 'public'
    ) THEN
        EXECUTE format('DROP TABLE IF EXISTS public.%I', project_table);
    END IF;
    
    -- 4. לבסוף, מחיקת הפרויקט עצמו
    DELETE FROM public.projects WHERE id = project_id_param;
    
    RAISE NOTICE 'הפרויקט % נמחק בהצלחה יחד עם כל הרשומות המקושרות', project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 