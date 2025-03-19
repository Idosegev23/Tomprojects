-- מיגרציה לעדכון המבנה ההיררכי של המשימות
-- תאריך: 20-03-2025

-- יצירת טבלת עזר זמנית עבור השלבים
CREATE TEMP TABLE stage_hierarchy AS
SELECT 
  id,
  title,
  description,
  ROW_NUMBER() OVER (ORDER BY id) AS hierarchy_level
FROM stages
ORDER BY id;

-- יצירת אב-משימה לכל שלב
DO $$
DECLARE
  stage_record RECORD;
  new_parent_id UUID;
  task_rec RECORD;
  counter INTEGER;
BEGIN
  -- עבור על כל השלבים
  FOR stage_record IN SELECT * FROM stage_hierarchy LOOP
    -- יצירת משימת אב לשלב
    INSERT INTO tasks (
      id, 
      title, 
      description, 
      category, 
      status, 
      priority, 
      stage_id, 
      created_at, 
      updated_at, 
      deleted,
      hierarchical_number,
      is_template
    ) VALUES (
      uuid_generate_v4(), 
      stage_record.title, 
      stage_record.description, 
      'שלב', 
      'לא התחילה', 
      'high', 
      stage_record.id, 
      NOW(), 
      NOW(), 
      false,
      stage_record.hierarchy_level::text,
      true
    )
    RETURNING id INTO new_parent_id;
    
    -- עדכון המשימות השייכות לשלב הזה בלולאה נפרדת
    counter := 1;
    
    -- קודם מיין את המשימות לפי עדיפות וכותרת
    FOR task_rec IN 
      SELECT t.id 
      FROM tasks t 
      WHERE 
        t.stage_id = stage_record.id AND 
        t.id != new_parent_id AND 
        t.deleted = false AND
        t.title != stage_record.title
      ORDER BY 
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.title
    LOOP
      -- עדכון כל משימה בנפרד
      UPDATE tasks 
      SET 
        parent_task_id = new_parent_id,
        hierarchical_number = stage_record.hierarchy_level || '.' || counter
      WHERE id = task_rec.id;
      
      counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'עודכן מבנה היררכי עבור שלב % (%) עם % כמשימת אב', 
                 stage_record.title, stage_record.id, new_parent_id;
  END LOOP;
END $$;

-- יצירת אינדקס על עמודת hierarchical_number
CREATE INDEX IF NOT EXISTS tasks_hierarchical_number_idx ON tasks (hierarchical_number);

-- יצירת משימות תת-אב לקטגוריות נפוצות בכל שלב
DO $$
DECLARE
  stage_record RECORD;
  sub_parent_id UUID;
  category_record RECORD;
  category_count INTEGER;
  task_rec RECORD;
  counter INTEGER;
BEGIN
  -- עבור על כל השלבים (משימות שלב ללא הורה)
  FOR stage_record IN 
    SELECT id, hierarchical_number, stage_id 
    FROM tasks 
    WHERE parent_task_id IS NULL AND category = 'שלב'
    ORDER BY hierarchical_number 
  LOOP
    -- בדיקה אם יש יותר מקטגוריה אחת בשלב זה
    SELECT COUNT(DISTINCT category) INTO category_count
    FROM tasks t
    WHERE t.stage_id = stage_record.stage_id
      AND t.parent_task_id = stage_record.id
      AND t.deleted = false;
      
    -- אם יש יותר מקטגוריה אחת, יצור תת-אבות לכל קטגוריה
    IF category_count > 1 THEN
      FOR category_record IN 
        SELECT DISTINCT t.category 
        FROM tasks t
        WHERE t.stage_id = stage_record.stage_id
          AND t.parent_task_id = stage_record.id
          AND t.deleted = false
          AND t.category != 'שלב'
      LOOP
        -- יצירת משימת תת-אב לקטגוריה
        INSERT INTO tasks (
          id, 
          title, 
          description, 
          category, 
          status, 
          priority, 
          stage_id, 
          created_at, 
          updated_at, 
          deleted,
          parent_task_id,
          hierarchical_number,
          is_template
        ) VALUES (
          uuid_generate_v4(), 
          'קטגוריה: ' || category_record.category, 
          'משימות בקטגוריה ' || category_record.category, 
          category_record.category, 
          'לא התחילה', 
          'medium', 
          stage_record.stage_id, 
          NOW(), 
          NOW(), 
          false,
          stage_record.id,
          stage_record.hierarchical_number || '.0',
          true
        )
        RETURNING id INTO sub_parent_id;
        
        -- עדכון בלולאה של כל המשימות בקטגוריה זו
        counter := 1;
        
        FOR task_rec IN 
          SELECT t.id 
          FROM tasks t 
          WHERE 
            t.stage_id = stage_record.stage_id AND
            t.category = category_record.category AND
            t.id != sub_parent_id AND
            t.id != stage_record.id AND
            t.deleted = false AND
            t.parent_task_id = stage_record.id
          ORDER BY 
            CASE t.priority
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              WHEN 'low' THEN 3
              ELSE 4
            END,
            t.title
        LOOP
          -- עדכון כל משימה בנפרד
          UPDATE tasks 
          SET 
            parent_task_id = sub_parent_id,
            hierarchical_number = (
              SELECT t2.hierarchical_number FROM tasks t2 WHERE t2.id = sub_parent_id
            ) || '.' || counter
          WHERE id = task_rec.id;
          
          counter := counter + 1;
        END LOOP;
        
        RAISE NOTICE 'נוצרה משימת תת-אב % עבור קטגוריה % בשלב %', 
                     sub_parent_id, category_record.category, stage_record.hierarchical_number;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- עדכון שדה תבנית למשימות אב
UPDATE tasks t
SET is_template = true 
WHERE t.category = 'שלב' OR t.hierarchical_number LIKE '%.0';

-- הגדרת כל משימות האב כמשימות מיוחדות
UPDATE tasks t
SET labels = array_append(COALESCE(t.labels, ARRAY[]::text[]), 'אב')
WHERE t.parent_task_id IS NULL OR t.hierarchical_number LIKE '%.0';

-- יצירת אינדקסים
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks (category); 