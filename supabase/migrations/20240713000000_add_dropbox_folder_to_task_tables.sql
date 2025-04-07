-- מיגרציה להוספת עמודת dropbox_folder לטבלת משימות ראשית ולטבלאות משימות ספציפיות
-- תאריך: 13-07-2024

-- בדיקה והוספת העמודה לטבלת המשימות הראשית
DO $$
BEGIN
    -- בדיקה האם העמודה כבר קיימת בטבלת משימות ראשית
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'dropbox_folder'
    ) THEN
        -- הוספת עמודת dropbox_folder לטבלת tasks
        ALTER TABLE public.tasks 
        ADD COLUMN dropbox_folder text DEFAULT NULL;
        
        RAISE NOTICE 'עמודת dropbox_folder נוספה בהצלחה לטבלת tasks';
    ELSE
        RAISE NOTICE 'עמודת dropbox_folder כבר קיימת בטבלת tasks';
    END IF;
END $$;

-- פונקציה להוספת עמודת dropbox_folder לכל טבלאות המשימות הספציפיות של פרויקטים
CREATE OR REPLACE FUNCTION add_dropbox_folder_to_project_tables()
RETURNS void AS $$
DECLARE
    project_table_record RECORD;
    alter_command TEXT;
BEGIN
    -- עבור כל טבלה שמתחילה ב-project_ ומסתיימת ב-_tasks
    FOR project_table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'project\_%\_tasks'
        AND table_type = 'BASE TABLE'
    LOOP
        -- בדיקה האם העמודה כבר קיימת בטבלה הספציפית
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = project_table_record.table_name 
            AND column_name = 'dropbox_folder'
        ) THEN
            -- יצירת פקודת ALTER TABLE
            alter_command := 'ALTER TABLE public.' || project_table_record.table_name || ' ADD COLUMN dropbox_folder text DEFAULT NULL;';
            
            -- הרצת הפקודה
            EXECUTE alter_command;
            
            RAISE NOTICE 'עמודת dropbox_folder נוספה לטבלה %', project_table_record.table_name;
        ELSE
            RAISE NOTICE 'עמודת dropbox_folder כבר קיימת בטבלה %', project_table_record.table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'הוספת עמודת dropbox_folder לכל טבלאות המשימות הסתיימה בהצלחה';
END;
$$ LANGUAGE plpgsql;

-- הרצת הפונקציה להוספת העמודה לכל הטבלאות
SELECT add_dropbox_folder_to_project_tables();

-- מחיקת הפונקציה הזמנית
DROP FUNCTION add_dropbox_folder_to_project_tables(); 