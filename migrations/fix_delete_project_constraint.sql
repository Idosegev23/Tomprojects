-- מיגרציה לתיקון בעיית מחיקת פרויקטים
-- Error: cache lookup failed for constraint 77652
-- Error: cache lookup failed for constraint 81692

-- ביצוע בדיקה של כל האילוצים הקשורים לפרויקטים
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'בדיקת כל האילוצים הקשורים לפרויקטים:';
    
    FOR constraint_record IN 
        SELECT 
            con.oid as constraint_id,
            con.conname as constraint_name, 
            rel.relname as table_name,
            pg_get_constraintdef(con.oid) as definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
        AND pg_get_constraintdef(con.oid) LIKE '%project%id%'
    LOOP
        RAISE NOTICE 'אילוץ: ID=%, שם=%, טבלה=%, הגדרה=%', 
                     constraint_record.constraint_id,
                     constraint_record.constraint_name, 
                     constraint_record.table_name, 
                     constraint_record.definition;
    END LOOP;
END $$;

-- בדיקה ספציפית של האילוצים בטבלת tasks
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'אילוצים בטבלת tasks:';
    
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'public.tasks'::regclass
    LOOP
        RAISE NOTICE 'אילוץ: % - %', 
                     constraint_record.conname, 
                     constraint_record.definition;
    END LOOP;
END $$;

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

-- טיפול באילוצים ספציפיים - האילוץ 77652 ו-81692
DO $$
DECLARE
    constraint_record RECORD;
    found_first boolean := false;
    found_second boolean := false;
BEGIN
    -- האילוץ הראשון
    FOR constraint_record IN 
        SELECT conname, conrelid::regclass::text as table_name, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE oid = 77652
    LOOP
        RAISE NOTICE 'נמצא אילוץ מספר 77652: % בטבלה % עם הגדרה: %', 
                     constraint_record.conname, 
                     constraint_record.table_name,
                     constraint_record.definition;
        
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
                       constraint_record.table_name,
                       constraint_record.conname);
        
        RAISE NOTICE 'האילוץ % הוסר מהטבלה %', 
                     constraint_record.conname, 
                     constraint_record.table_name;
        
        found_first := true;
    END LOOP;
    
    IF NOT found_first THEN
        RAISE NOTICE 'לא נמצא אילוץ עם מזהה 77652';
    END IF;
    
    -- האילוץ השני
    FOR constraint_record IN 
        SELECT conname, conrelid::regclass::text as table_name, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE oid = 81692
    LOOP
        RAISE NOTICE 'נמצא אילוץ מספר 81692: % בטבלה % עם הגדרה: %', 
                     constraint_record.conname, 
                     constraint_record.table_name,
                     constraint_record.definition;
        
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
                       constraint_record.table_name,
                       constraint_record.conname);
        
        RAISE NOTICE 'האילוץ % הוסר מהטבלה %', 
                     constraint_record.conname, 
                     constraint_record.table_name;
        
        found_second := true;
    END LOOP;
    
    IF NOT found_second THEN
        RAISE NOTICE 'לא נמצא אילוץ עם מזהה 81692';
    END IF;
END $$;

-- עדכון גם טבלאות פרויקט ספציפיות:
-- וידאו שהטריגר ל-delete_project_table עובד כראוי
DROP TRIGGER IF EXISTS before_delete_project ON public.projects;

-- ניסוי לפתרון בעיית trigger
DO $$
DECLARE
    trigger_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'before_delete_project'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE 'הטריגר before_delete_project כבר קיים';
    ELSE
        BEGIN
            -- בדיקה אם הפונקציה קיימת
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_project_table_trigger') THEN
                RAISE NOTICE 'הפונקציה delete_project_table_trigger קיימת, יוצר טריגר חדש';
                
                -- יצירת הטריגר
                CREATE TRIGGER before_delete_project
                BEFORE DELETE ON public.projects
                FOR EACH ROW
                EXECUTE FUNCTION delete_project_table_trigger();
                
                RAISE NOTICE 'הטריגר before_delete_project נוצר בהצלחה';
            ELSE
                RAISE NOTICE 'הפונקציה delete_project_table_trigger לא קיימת, יוצר אותה';
                
                -- יצירת הפונקציה
                CREATE OR REPLACE FUNCTION delete_project_table_trigger()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                  PERFORM delete_project_table(OLD.id);
                  RETURN OLD;
                END;
                $$;
                
                -- יצירת הטריגר
                CREATE TRIGGER before_delete_project
                BEFORE DELETE ON public.projects
                FOR EACH ROW
                EXECUTE FUNCTION delete_project_table_trigger();
                
                RAISE NOTICE 'הפונקציה והטריגר נוצרו בהצלחה';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'שגיאה ביצירת הטריגר: %', SQLERRM;
        END;
    END IF;
END $$;

-- ביטול כל המגבלות הדינמיות שעלולות להפריע (באמצעות הוספת ON DELETE CASCADE אם הן קיימות)
DO $$
DECLARE
    tbl record;
    col record;
    project_id_col_exists boolean;
    constraint_name text;
    query text;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE 'project_%\_tasks' ESCAPE '\' 
        AND table_schema = 'public'
    LOOP
        RAISE NOTICE 'בודק טבלה: %', tbl.table_name;
        
        -- בדיקה אם קיים עמודה project_id בטבלה
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = tbl.table_name
            AND column_name = 'project_id'
            AND table_schema = 'public'
        ) INTO project_id_col_exists;
        
        IF project_id_col_exists THEN
            RAISE NOTICE 'נמצאה עמודת project_id בטבלה %', tbl.table_name;
            
            -- בדיקת כל המגבלות הקיימות הקשורות ל-project_id
            FOR constraint_name IN
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = tbl.table_name
                  AND kcu.column_name = 'project_id'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
            LOOP
                RAISE NOTICE 'נמצאה מגבלה: % בטבלה %', constraint_name, tbl.table_name;
                
                -- הסרת המגבלה הקיימת
                query := format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', 
                                tbl.table_name, constraint_name);
                EXECUTE query;
                RAISE NOTICE 'המגבלה % הוסרה מהטבלה %', constraint_name, tbl.table_name;
                
                -- הוספת מגבלה חדשה עם CASCADE
                query := format(
                    'ALTER TABLE public.%I ADD CONSTRAINT %I_new FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE',
                    tbl.table_name, constraint_name
                );
                BEGIN
                    EXECUTE query;
                    RAISE NOTICE 'נוספה מגבלה חדשה: %_new בטבלה %', constraint_name, tbl.table_name;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'שגיאה בהוספת מגבלה חדשה לטבלה %: %', tbl.table_name, SQLERRM;
                END;
            END LOOP;
        END IF;
    END LOOP;
END $$; 