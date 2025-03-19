-- מיגרציה לעדכון שלבים ומשימות
-- תאריך: 20-03-2025

-- 1. שמירת גיבוי של השלבים הקיימים (למקרה שנצטרך)
CREATE TABLE IF NOT EXISTS stages_backup AS
SELECT * FROM stages;

-- 2. מחיקת כל השלבים הקיימים מהטבלה
TRUNCATE TABLE stages CASCADE;

-- 3. יצירת שלבים חדשים גלובליים (לא מחוברים לפרויקט ספציפי)
INSERT INTO stages (id, title, description, created_at, updated_at, project_id) VALUES
  -- שלב התנעה והקמה
  ('00000001-0000-0000-0000-000000000001', 'התנעה והקמה', 'שלב התנעת הפרויקט והקמת תשתיות ראשוניות', NOW(), NOW(), NULL),
  
  -- שלב תכנון ואישורים
  ('00000002-0000-0000-0000-000000000002', 'תכנון ואישורים', 'שלב התכנון, קבלת אישורים והיתרים', NOW(), NOW(), NULL),
  
  -- שלב תפעול ולוגיסטיקה
  ('00000003-0000-0000-0000-000000000003', 'תפעול ולוגיסטיקה', 'שלב תפעול, לוגיסטיקה וניהול שוטף', NOW(), NOW(), NULL),
  
  -- שלב שיווק ומיתוג
  ('00000004-0000-0000-0000-000000000004', 'שיווק ומיתוג', 'שלב השיווק, פרסום ומיתוג הפרויקט', NOW(), NOW(), NULL),
  
  -- שלב מכירות וליווי לקוחות
  ('00000005-0000-0000-0000-000000000005', 'מכירות וליווי לקוחות', 'שלב המכירות, חתימת חוזים וליווי לקוחות', NOW(), NOW(), NULL),
  
  -- שלב משפטי ופיננסי
  ('00000006-0000-0000-0000-000000000006', 'משפטי ופיננסי', 'טיפול בהיבטים משפטיים ופיננסיים של הפרויקט', NOW(), NOW(), NULL)
;

-- 4. עדכון המשימות הקיימות ושיוך לשלבים החדשים בהתאם לקטגוריה
-- שיוך משימות מקטגוריית תפעול לשלב תפעול ולוגיסטיקה
UPDATE tasks SET stage_id = '00000003-0000-0000-0000-000000000003'
WHERE category = 'תפעול';

-- שיוך משימות מקטגוריית שיווק לשלב שיווק ומיתוג
UPDATE tasks SET stage_id = '00000004-0000-0000-0000-000000000004'
WHERE category = 'שיווק';

-- שיוך משימות מקטגוריית מכירות לשלב מכירות וליווי לקוחות
UPDATE tasks SET stage_id = '00000005-0000-0000-0000-000000000005'
WHERE category = 'מכירות';

-- שיוך משימות מקטגוריית משפטי לשלב משפטי ופיננסי
UPDATE tasks SET stage_id = '00000006-0000-0000-0000-000000000006'
WHERE category = 'משפטי';

-- שיוך משימות מקטגוריית פיננסי לשלב משפטי ופיננסי
UPDATE tasks SET stage_id = '00000006-0000-0000-0000-000000000006'
WHERE category = 'פיננסי';

-- שיוך משימות הקמת פרויקט לשלב התנעה והקמה
UPDATE tasks SET stage_id = '00000001-0000-0000-0000-000000000001'
WHERE title LIKE '%הקמת פרויקט%' OR title LIKE '%התנעת פרויקט%';

-- 5. עדכון טבלאות הפרויקט הספציפיות (project_*_tasks)
DO $$
DECLARE
  project_table RECORD;
BEGIN
  FOR project_table IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'project\_%\_tasks'
  LOOP
    -- עדכון משימות תפעוליות
    EXECUTE format('
      UPDATE %I 
      SET stage_id = ''00000003-0000-0000-0000-000000000003''
      WHERE category = ''תפעול''
    ', project_table.table_name);
    
    -- עדכון משימות שיווקיות
    EXECUTE format('
      UPDATE %I 
      SET stage_id = ''00000004-0000-0000-0000-000000000004''
      WHERE category = ''שיווק''
    ', project_table.table_name);
    
    -- עדכון משימות מכירות
    EXECUTE format('
      UPDATE %I 
      SET stage_id = ''00000005-0000-0000-0000-000000000005''
      WHERE category = ''מכירות''
    ', project_table.table_name);
    
    -- עדכון משימות משפטיות ופיננסיות
    EXECUTE format('
      UPDATE %I 
      SET stage_id = ''00000006-0000-0000-0000-000000000006''
      WHERE category IN (''משפטי'', ''פיננסי'')
    ', project_table.table_name);
    
    -- עדכון משימות הקמה
    EXECUTE format('
      UPDATE %I 
      SET stage_id = ''00000001-0000-0000-0000-000000000001''
      WHERE title LIKE ''%%הקמת פרויקט%%'' OR title LIKE ''%%התנעת פרויקט%%''
    ', project_table.table_name);
  END LOOP;
END $$;

-- 6. גיבוי של משימות עם שלבים לא תקינים
CREATE TABLE IF NOT EXISTS tasks_with_invalid_stages AS
SELECT * FROM tasks WHERE stage_id IS NOT NULL AND stage_id NOT IN (
  '00000001-0000-0000-0000-000000000001',
  '00000002-0000-0000-0000-000000000002',
  '00000003-0000-0000-0000-000000000003',
  '00000004-0000-0000-0000-000000000004',
  '00000005-0000-0000-0000-000000000005',
  '00000006-0000-0000-0000-000000000006'
);

-- 7. איפוס שלבים לא תקינים
UPDATE tasks SET stage_id = NULL
WHERE stage_id IS NOT NULL AND stage_id NOT IN (
  '00000001-0000-0000-0000-000000000001',
  '00000002-0000-0000-0000-000000000002',
  '00000003-0000-0000-0000-000000000003',
  '00000004-0000-0000-0000-000000000004',
  '00000005-0000-0000-0000-000000000005',
  '00000006-0000-0000-0000-000000000006'
);

-- 8. יצירת אינדקס על שדה הקטגוריה
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'tasks_category_idx'
  ) THEN
    CREATE INDEX tasks_category_idx ON tasks (category);
  END IF;
END $$; 