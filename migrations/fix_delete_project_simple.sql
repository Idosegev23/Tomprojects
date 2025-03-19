-- מיגרציה מפושטת לתיקון בעיית מחיקת פרויקטים
-- Error: cache lookup failed for constraint 77652/81692

-- הסרת האילוצים הישנים
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE public.stages DROP CONSTRAINT IF EXISTS stages_project_id_fkey;

-- הוספת אילוצים חדשים עם CASCADE
ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

ALTER TABLE public.stages 
    ADD CONSTRAINT stages_project_id_fkey 
    FOREIGN KEY (project_id) 
    REFERENCES public.projects(id) 
    ON DELETE CASCADE;

-- וידוא שהטריגר למחיקת טבלאות פרויקט עובד כראוי
DROP TRIGGER IF EXISTS before_delete_project ON public.projects;

-- יצירת הטריגר מחדש אם הפונקציה קיימת
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_project_table_trigger') THEN
        CREATE TRIGGER before_delete_project
        BEFORE DELETE ON public.projects
        FOR EACH ROW
        EXECUTE FUNCTION delete_project_table_trigger();
    END IF;
END $$; 