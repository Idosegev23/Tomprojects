-- SQL למחיקת משימות כפולות בעלות אותו שם באותו פרויקט

-- 1. זיהוי כפילויות בטבלה הראשית, אך אין למחוק משימות אב
WITH ranked_tasks AS (
  SELECT 
    t.id,
    t.title,
    t.project_id,
    t.deleted,
    t.created_at,
    t.updated_at,
    -- בדיקה אם המשימה היא משימת אב
    (SELECT COUNT(*) FROM tasks child WHERE child.parent_task_id = t.id) > 0 AS is_parent,
    ROW_NUMBER() OVER (
      PARTITION BY t.title, t.project_id
      ORDER BY 
        -- עדיפות למשימות אב (לא למחוק אותן)
        (SELECT COUNT(*) FROM tasks child WHERE child.parent_task_id = t.id) > 0 DESC,
        t.deleted ASC, 
        t.updated_at DESC,
        t.created_at DESC
    ) AS rank
  FROM tasks t
),
duplicates AS (
  SELECT id
  FROM ranked_tasks
  WHERE rank > 1 AND is_parent = false  -- רק משימות שאינן אב
)
DELETE FROM tasks
WHERE id IN (SELECT id FROM duplicates);

-- 2. מחיקת כפילויות בטבלאות הספציפיות של הפרויקטים
DO $$
DECLARE
  table_record RECORD;
  duplicate_count INTEGER;
  total_count INTEGER := 0;
  table_name TEXT;
  sql_query TEXT;
BEGIN
  -- מעבר על כל טבלאות הפרויקטים
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
          t.id,
          t.title,
          t.deleted,
          t.created_at,
          t.updated_at,
          -- בדיקה אם המשימה היא משימת אב
          (SELECT COUNT(*) FROM %I child WHERE child.parent_task_id = t.id) > 0 AS is_parent,
          ROW_NUMBER() OVER (
            PARTITION BY t.title
            ORDER BY 
              -- עדיפות למשימות אב (לא למחוק אותן)
              (SELECT COUNT(*) FROM %I child WHERE child.parent_task_id = t.id) > 0 DESC,
              t.deleted ASC, 
              t.updated_at DESC,
              t.created_at DESC
          ) AS rank
        FROM %I t
      ),
      duplicates AS (
        SELECT id
        FROM ranked_tasks
        WHERE rank > 1 AND is_parent = false -- רק משימות שאינן אב
      )
      DELETE FROM %I
      WHERE id IN (SELECT id FROM duplicates)
      RETURNING id', 
      table_name, table_name, table_name, table_name
    );
    
    -- הרצת השאילתה וספירת המשימות שנמחקו
    EXECUTE sql_query;
    GET DIAGNOSTICS duplicate_count = ROW_COUNT;
    
    total_count := total_count + duplicate_count;
    
    RAISE NOTICE 'נמחקו % משימות עם כותרות כפולות מטבלה %', duplicate_count, table_name;
  END LOOP;
  
  RAISE NOTICE 'סה"כ נמחקו % משימות כפולות מכל טבלאות הפרויקטים', total_count;
END $$;

-- 3. אפשרות חלופית: עדכון המזהה של משימות בנות במקום למחוק את האב
-- (שימושית אם אתה מעדיף לשמור על קשרי אב-בן)
/*
DO $$
DECLARE
  parent_record RECORD;
  duplicate_parent RECORD;
  affected_count INTEGER := 0;
BEGIN
  -- מצא משימות אב שיש להן כפילויות
  FOR parent_record IN
    WITH parent_tasks AS (
      SELECT 
        t.id, 
        t.title, 
        t.project_id,
        t.deleted,
        t.created_at,
        t.updated_at,
        ROW_NUMBER() OVER (
          PARTITION BY t.title, t.project_id
          ORDER BY 
            t.deleted ASC, 
            t.updated_at DESC,
            t.created_at DESC
        ) AS rank
      FROM tasks t
      WHERE EXISTS (SELECT 1 FROM tasks child WHERE child.parent_task_id = t.id)
    )
    SELECT * FROM parent_tasks WHERE rank > 1
  LOOP
    -- מצא את המשימה הראשית (שתישאר) לכל כפילות
    SELECT id INTO duplicate_parent
    FROM tasks t
    WHERE t.title = parent_record.title 
      AND t.project_id = parent_record.project_id
      AND t.id <> parent_record.id
    ORDER BY 
      t.deleted ASC, 
      t.updated_at DESC,
      t.created_at DESC
    LIMIT 1;
    
    -- עדכן את כל המשימות הבנות לשייכות למשימת האב הראשית
    UPDATE tasks
    SET parent_task_id = duplicate_parent.id
    WHERE parent_task_id = parent_record.id;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RAISE NOTICE 'עודכנו % משימות בנות משיוך לאב % לאב %', 
      affected_count, parent_record.id, duplicate_parent.id;
  END LOOP;
END $$;
*/ 