-- מיגרציה להוספת עמודת dropbox_folder_path לטבלת פרויקטים
-- תאריך: 11-07-2024

-- בדיקה האם העמודה כבר קיימת בטבלה
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'dropbox_folder_path'
    ) THEN
        -- הוספת עמודת dropbox_folder_path לטבלת projects
        ALTER TABLE public.projects 
        ADD COLUMN dropbox_folder_path text DEFAULT NULL;
        
        RAISE NOTICE 'עמודת dropbox_folder_path נוספה בהצלחה לטבלת projects';
    ELSE
        RAISE NOTICE 'עמודת dropbox_folder_path כבר קיימת בטבלת projects';
    END IF;
END $$; 