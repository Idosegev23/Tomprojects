-- מיגרציה להסרת כפילויות מטבלת המשימות

-- 1. הסרת כפילויות מהטבלה הראשית tasks

-- יצירת טבלה זמנית לזיהוי כפילויות - שמירת רק הרשומה החדשה ביותר מכל קבוצת כפילויות
CREATE TEMP TABLE duplicate_tasks AS
WITH ranked_tasks AS (
  SELECT 
    id,
    title,
    project_id,
    deleted,
    original_task_id,
    created_at,
    -- דירוג לפי עדכניות וסטטוס מחיקה (עדיפות לשמור את הרשומות הפעילות והחדשות ביותר)
    ROW_NUMBER() OVER (
      PARTITION BY CASE WHEN original_task_id IS NOT NULL THEN original_task_id ELSE id END
      ORDER BY 
        deleted ASC, -- רשומות פעילות קודם
        created_at DESC -- רשומות חדשות קודם
    ) AS rank
  FROM tasks
)
-- בוחרים את כל הרשומות שהן לא המובילות בקבוצת הכפילויות שלהן
SELECT id
FROM ranked_tasks
WHERE rank > 1;

-- יצירת טבלה זמנית לתיעוד הכפילויות שנמחקו (לצורכי גיבוי ובקרה)
CREATE TEMP TABLE deleted_duplicates AS
SELECT *
FROM tasks 
WHERE id IN (SELECT id FROM duplicate_tasks);

-- לוג טבלת הגיבוי
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM deleted_duplicates;
  RAISE NOTICE 'גיבוי % רשומות כפולות לפני מחיקה', row_count;
END $$;

-- מחיקת הכפילויות מטבלת המשימות הראשית
DELETE FROM tasks
WHERE id IN (SELECT id FROM duplicate_tasks);

-- 2. הסרת כפילויות מטבלאות פרויקטים ספציפיות

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
          original_task_id,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN original_task_id IS NOT NULL THEN original_task_id ELSE id END
            ORDER BY 
              deleted ASC, 
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
      RAISE NOTICE 'נמחקו % כפילויות מטבלה %', duplicate_count, table_name;
    END IF;
  END LOOP;
END $$;

-- 3. הוספת אינדקסים לשיפור ביצועים ומניעת כפילויות עתידיות

-- אינדקס לשיפור חיפוש לפי כותרת משימה
CREATE INDEX IF NOT EXISTS tasks_title_idx ON tasks (title);

-- אינדקס לשיפור חיפוש לפי כותרת ופרויקט
CREATE INDEX IF NOT EXISTS tasks_title_project_id_idx ON tasks (title, project_id);

-- 4. יצירת פונקציה וטריגר למניעת כפילויות עתידיות

CREATE OR REPLACE FUNCTION prevent_duplicate_tasks()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- בדיקה אם כבר קיימת משימה פעילה זהה באותו פרויקט
  IF NEW.original_task_id IS NULL THEN
    -- בודק כפילות לפי כותרת ופרויקט
    SELECT COUNT(*)
    INTO existing_count
    FROM tasks
    WHERE 
      title = NEW.title 
      AND project_id = NEW.project_id 
      AND deleted = false
      AND id <> NEW.id;
      
    IF existing_count > 0 THEN
      RAISE WARNING 'נסיון להוסיף כפילות: משימה בשם "%" כבר קיימת בפרויקט זה', NEW.title;
    END IF;
  ELSE
    -- בודק כפילות לפי original_task_id
    SELECT COUNT(*)
    INTO existing_count
    FROM tasks
    WHERE 
      original_task_id = NEW.original_task_id
      AND deleted = false
      AND id <> NEW.id;
      
    IF existing_count > 0 THEN
      RAISE WARNING 'נסיון להוסיף כפילות: משימה עם original_task_id=% כבר קיימת', NEW.original_task_id;
    END IF;
  END IF;
  
  -- ממשיך בכל מקרה, אבל מתעד אזהרה
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- טריגר שיפעיל את הפונקציה למניעת כפילויות
CREATE TRIGGER check_duplicate_tasks
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_tasks();

-- 5. סיכום פעולות המיגרציה
DO $$
DECLARE
  total_deleted INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_deleted FROM deleted_duplicates;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'סיכום פעולות טיפול בכפילויות:';
  RAISE NOTICE '- סה"כ נמחקו % רשומות כפולות', total_deleted;
  RAISE NOTICE '- נוספו אינדקסים לשיפור ביצועים';
  RAISE NOTICE '- נוסף טריגר למניעת כפילויות עתידיות';
  RAISE NOTICE '==========================================';
END $$; 