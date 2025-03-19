-- מיגרציה להסרת משימות עם כותרות כפולות מטבלת tasks

-- 1. זיהוי משימות עם כותרות כפולות

-- יצירת טבלה זמנית לזיהוי כפילויות לפי כותרת - שמירת רק הרשומה החדשה ביותר מכל קבוצת כפילויות
CREATE TEMP TABLE duplicate_title_tasks AS
WITH ranked_tasks AS (
  SELECT 
    id,
    title,
    project_id,
    deleted,
    created_at,
    updated_at,
    -- דירוג לפי עדכניות וסטטוס מחיקה (עדיפות לשמור את הרשומות הפעילות והחדשות ביותר)
    ROW_NUMBER() OVER (
      PARTITION BY title, project_id
      ORDER BY 
        deleted ASC, -- רשומות פעילות קודם
        updated_at DESC, -- רשומות שעודכנו לאחרונה
        created_at DESC -- רשומות חדשות קודם
    ) AS rank
  FROM tasks
)
-- בוחרים את כל הרשומות שהן לא המובילות בקבוצת הכפילויות שלהן
SELECT id
FROM ranked_tasks
WHERE rank > 1;

-- יצירת טבלה זמנית לתיעוד הכפילויות שנמחקו (לצורכי גיבוי ובקרה)
CREATE TEMP TABLE deleted_title_duplicates AS
SELECT *
FROM tasks 
WHERE id IN (SELECT id FROM duplicate_title_tasks);

-- לוג טבלת הגיבוי
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM deleted_title_duplicates;
  RAISE NOTICE 'גיבוי % רשומות עם כותרות כפולות לפני מחיקה', row_count;
END $$;

-- 2. מחיקת המשימות הכפולות מטבלת tasks

DELETE FROM tasks
WHERE id IN (SELECT id FROM duplicate_title_tasks);

-- לוג לאחר המחיקה
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deleted_count FROM duplicate_title_tasks;
  RAISE NOTICE 'נמחקו % משימות עם כותרות כפולות מטבלת tasks', deleted_count;
END $$;

-- 3. הסרת משימות עם כותרות כפולות מטבלאות פרויקטים ספציפיות

DO $$
DECLARE
  table_record RECORD;
  duplicate_count INTEGER;
  table_name TEXT;
  sql_query TEXT;
BEGIN
  -- עבור על כל טבלאות הפרויקטים הספציפיות
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'project_%_tasks'
  LOOP
    table_name := table_record.table_name;
    
    -- בניית שאילתה דינמית למחיקת כפילויות בכל טבלת פרויקט
    sql_query := format('
      WITH ranked_tasks AS (
        SELECT 
          id,
          title,
          deleted,
          created_at,
          updated_at,
          ROW_NUMBER() OVER (
            PARTITION BY title
            ORDER BY 
              deleted ASC, 
              updated_at DESC,
              created_at DESC
          ) AS rank
        FROM %I
      ),
      duplicates AS (
        SELECT id
        FROM ranked_tasks
        WHERE rank > 1
      )
      DELETE FROM %I
      WHERE id IN (SELECT id FROM duplicates)
      RETURNING id', 
      table_name, table_name
    );
    
    -- הרצת השאילתה וספירת המשימות שנמחקו
    EXECUTE sql_query;
    GET DIAGNOSTICS duplicate_count = ROW_COUNT;
    
    IF duplicate_count > 0 THEN
      RAISE NOTICE 'נמחקו % משימות עם כותרות כפולות מטבלה %', duplicate_count, table_name;
    END IF;
  END LOOP;
END $$;

-- 4. יצירת אינדקס ייחודי למניעת כפילויות עתידיות

-- הסרת אינדקס קיים אם קיים
DROP INDEX IF EXISTS tasks_unique_title_project_idx;

-- יצירת אינדקס חדש עם אילוץ ייחודי עבור משימות פעילות (לא מחוקות)
CREATE UNIQUE INDEX tasks_unique_title_project_idx 
ON tasks (title, project_id) 
WHERE deleted = false;

-- הוספת טריגר למניעת כפילויות חדשות
CREATE OR REPLACE FUNCTION prevent_duplicate_title_tasks()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- בדיקה אם כבר קיימת משימה פעילה זהה באותו פרויקט
  SELECT COUNT(*)
  INTO existing_count
  FROM tasks
  WHERE 
    title = NEW.title 
    AND project_id = NEW.project_id 
    AND deleted = false
    AND id <> NEW.id;
    
  IF existing_count > 0 AND NEW.deleted = false THEN
    RAISE EXCEPTION 'לא ניתן להוסיף או לעדכן משימה עם כותרת "%" שכבר קיימת בפרויקט זה', NEW.title;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הסרת טריגר קיים אם קיים
DROP TRIGGER IF EXISTS check_duplicate_title_tasks ON tasks;

-- הוספת טריגר חדש
CREATE TRIGGER check_duplicate_title_tasks
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_title_tasks();

-- 5. סיכום פעולות המיגרציה
DO $$
DECLARE
  total_deleted INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_deleted FROM deleted_title_duplicates;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'סיכום טיפול במשימות עם כותרות כפולות:';
  RAISE NOTICE '- סה"כ נמחקו % רשומות כפולות', total_deleted;
  RAISE NOTICE '- נוסף אינדקס ייחודי למניעת כפילויות כותרות עתידיות';
  RAISE NOTICE '- נוסף טריגר למניעת הוספת כפילויות בעתיד';
  RAISE NOTICE '==========================================';
END $$; 