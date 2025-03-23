-- סקריפט לתיקון מבנה טבלת stages
-- העתק והדבק קוד זה לממשק SQL של סופאבייס

-- בדיקה אם העמודה project_id כבר קיימת בטבלה
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stages'
        AND column_name = 'project_id'
    ) THEN
        -- הוספת העמודה לטבלה
        ALTER TABLE public.stages ADD COLUMN project_id uuid REFERENCES public.projects(id);
        RAISE NOTICE 'עמודת project_id נוספה לטבלת stages בהצלחה';
    ELSE
        RAISE NOTICE 'עמודת project_id כבר קיימת בטבלת stages';
    END IF;
END $$; 