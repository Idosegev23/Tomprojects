-- מיגרציה לעדכון המספור ההיררכי של המשימות לפי השלבים
-- תאריך: 20-03-2025

-- 1. יצירת מספור היררכי לשלבים
UPDATE stages 
SET hierarchical_number = 
  CASE 
    WHEN id = '00000001-0000-0000-0000-000000000001' THEN '1'
    WHEN id = '00000002-0000-0000-0000-000000000002' THEN '2'
    WHEN id = '00000003-0000-0000-0000-000000000003' THEN '3'
    WHEN id = '00000004-0000-0000-0000-000000000004' THEN '4'
    WHEN id = '00000005-0000-0000-0000-000000000005' THEN '5'
    WHEN id = '00000006-0000-0000-0000-000000000006' THEN '6'
    ELSE hierarchical_number
  END
WHERE id IN (
  '00000001-0000-0000-0000-000000000001',
  '00000002-0000-0000-0000-000000000002',
  '00000003-0000-0000-0000-000000000003',
  '00000004-0000-0000-0000-000000000004',
  '00000005-0000-0000-0000-000000000005',
  '00000006-0000-0000-0000-000000000006'
);

-- 2. עדכון המספור ההיררכי של המשימות לפי השלבים
-- נעדכן בעזרת פונקציה המעדכנת כל משימה

DO $$
DECLARE
  stage_rec RECORD;
  task_counter INTEGER;
  subtask_counter INTEGER;
  task_rec RECORD;
  parent_task_id UUID;
  last_stage_id UUID := NULL;
  stage_hierarchical_number TEXT;
  task_title TEXT;
BEGIN
  -- נעבור על כל השלבים לפי סדר המספור ההיררכי
  FOR stage_rec IN 
    SELECT id, hierarchical_number, name 
    FROM stages 
    WHERE id IN (
      '00000001-0000-0000-0000-000000000001',
      '00000002-0000-0000-0000-000000000002',
      '00000003-0000-0000-0000-000000000003',
      '00000004-0000-0000-0000-000000000004',
      '00000005-0000-0000-0000-000000000005',
      '00000006-0000-0000-0000-000000000006'
    )
    ORDER BY hierarchical_number
  LOOP
    -- אתחול מונה המשימות לשלב הנוכחי
    task_counter := 1;
    stage_hierarchical_number := stage_rec.hierarchical_number;
    task_title := stage_rec.name;
    
    -- נבדוק אם כבר קיימת משימת אב לשלב הזה
    SELECT id INTO parent_task_id FROM tasks 
    WHERE stage_id = stage_rec.id AND parent_task_id IS NULL AND title = task_title
    LIMIT 1;
    
    IF parent_task_id IS NULL THEN
      -- יצירת משימת אב לשלב
      INSERT INTO tasks (
        id, title, description, category, status, priority, 
        stage_id, hierarchical_number, is_template, labels, created_at, updated_at, deleted
      ) VALUES (
        uuid_generate_v4(), 
        task_title, 
        'משימת אב עבור שלב ' || task_title,
        'תפעול',
        'לא התחילה',
        'medium',
        stage_rec.id,
        stage_hierarchical_number,
        false,
        ARRAY['תפעול'],
        NOW(),
        NOW(),
        false
      )
      RETURNING id INTO parent_task_id;
      
      RAISE NOTICE 'יצרתי משימת אב לשלב % עם המזהה %', task_title, parent_task_id;
    ELSE
      -- עדכון המספור ההיררכי של משימת האב
      UPDATE tasks 
      SET hierarchical_number = stage_hierarchical_number
      WHERE id = parent_task_id;
      
      RAISE NOTICE 'עדכנתי את המספור ההיררכי של משימת האב % ל-%', parent_task_id, stage_hierarchical_number;
    END IF;
    
    -- עדכון המשימות השייכות לשלב
    FOR task_rec IN 
      SELECT id, title 
      FROM tasks 
      WHERE stage_id = stage_rec.id 
        AND id != parent_task_id
        AND deleted = false
      ORDER BY title
    LOOP
      -- עדכון המספור ההיררכי והשיוך לאב
      UPDATE tasks 
      SET 
        hierarchical_number = stage_hierarchical_number || '.' || task_counter,
        parent_task_id = parent_task_id
      WHERE id = task_rec.id;
      
      RAISE NOTICE 'עדכנתי את המשימה % עם המספור % ושייכתי לאב %', 
        task_rec.title, 
        stage_hierarchical_number || '.' || task_counter,
        parent_task_id;
      
      -- קידום מונה המשימות
      task_counter := task_counter + 1;
    END LOOP;
    
    -- שמירת המזהה של השלב האחרון שעובד
    last_stage_id := stage_rec.id;
  END LOOP;
  
  RAISE NOTICE 'סיימתי לעדכן את המספור ההיררכי של כל המשימות.';
END $$;

-- 4. עדכון הטריגר לשמירה על המספור ההיררכי
CREATE OR REPLACE FUNCTION maintain_hierarchical_task_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- אם זו משימה חדשה ואין לה מספור היררכי
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.hierarchical_number IS NULL THEN
    -- אם יש לה הורה, נקבע את המספור שלה לפי ההורה
    IF NEW.parent_task_id IS NOT NULL THEN
      -- מצא את המספור ההיררכי הבא עבור משימות תחת אותו הורה
      WITH sibling_tasks AS (
        SELECT hierarchical_number
        FROM tasks
        WHERE parent_task_id = NEW.parent_task_id
          AND id != NEW.id
        ORDER BY hierarchical_number DESC
        LIMIT 1
      )
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN 
            -- אם אין משימות אחיות, השתמש במספור ההורה ו-.1
            (SELECT hierarchical_number || '.1' 
             FROM tasks 
             WHERE id = NEW.parent_task_id)
          ELSE 
            -- אחרת, קח את המספור האחרון והגדל את המספר האחרון ב-1
            (SELECT 
              SUBSTRING(hierarchical_number FROM 1 FOR LENGTH(hierarchical_number) - POSITION('.' IN REVERSE(hierarchical_number))) 
              || '.' 
              || (SUBSTRING(hierarchical_number FROM LENGTH(hierarchical_number) - POSITION('.' IN REVERSE(hierarchical_number)) + 2)::integer + 1)::text
             FROM sibling_tasks)
        END INTO NEW.hierarchical_number
      FROM sibling_tasks;
    ELSE
      -- אם אין לה הורה ויש לה שלב, נקבע לפי השלב
      IF NEW.stage_id IS NOT NULL THEN
        WITH stage_tasks AS (
          SELECT hierarchical_number
          FROM tasks
          WHERE stage_id = NEW.stage_id
            AND parent_task_id IS NULL
            AND id != NEW.id
          ORDER BY hierarchical_number DESC
          LIMIT 1
        )
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 
              -- אם אין משימות אחרות באותו שלב, השתמש במספר השלב
              (SELECT hierarchical_number FROM stages WHERE id = NEW.stage_id)
            ELSE 
              -- אחרת, קח את המספור האחרון והגדל ב-1
              (SELECT 
                CASE 
                  WHEN POSITION('.' IN hierarchical_number) = 0 THEN
                    -- אם אין נקודה, זו כנראה משימת אב, הוסף .1
                    hierarchical_number || '.1'
                  ELSE
                    -- אחרת זו משימה רגילה, הגדל את המספר האחרון
                    SUBSTRING(hierarchical_number FROM 1 FOR LENGTH(hierarchical_number) - POSITION('.' IN REVERSE(hierarchical_number))) 
                    || '.' 
                    || (SUBSTRING(hierarchical_number FROM LENGTH(hierarchical_number) - POSITION('.' IN REVERSE(hierarchical_number)) + 2)::integer + 1)::text
                END
               FROM stage_tasks)
          END INTO NEW.hierarchical_number
        FROM stage_tasks;
      ELSE
        -- אם אין לה גם הורה וגם שלב, תן לה מספור בסיסי
        NEW.hierarchical_number := '0';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- בדוק אם הטריגר כבר קיים ואם לא, צור אותו
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'maintain_task_hierarchical_numbers' 
      AND tgrelid = 'tasks'::regclass
  ) THEN
    CREATE TRIGGER maintain_task_hierarchical_numbers
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION maintain_hierarchical_task_numbers();
  END IF;
END $$; 