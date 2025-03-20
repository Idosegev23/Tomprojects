-- מחיקת הנתונים הקיימים בטבלאות (אופציונלי, יש להסיר סימון הערה אם רוצים למחוק את הנתונים הקיימים)
TRUNCATE tasks CASCADE;
TRUNCATE stages CASCADE;

-- הוספת שלבים 1-5 לטבלת stages
INSERT INTO stages (id, title, hierarchical_number, status, progress, color)
VALUES
  (uuid_generate_v4(), 'שלב 1', '1', 'pending', 0, '#FF5733'),
  (uuid_generate_v4(), 'שלב 2', '2', 'pending', 0, '#33FF57'),
  (uuid_generate_v4(), 'שלב 3', '3', 'pending', 0, '#3357FF'),
  (uuid_generate_v4(), 'שלב 4', '4', 'pending', 0, '#F3FF33'),
  (uuid_generate_v4(), 'שלב 5', '5', 'pending', 0, '#FF33F3');

-- שמירת מזהי השלבים במשתנים זמניים לשימוש בהוספת משימות עיקריות
WITH inserted_stages AS (
  SELECT * FROM stages
  WHERE hierarchical_number IN ('1', '2', '3', '4', '5')
  ORDER BY hierarchical_number::int
)
INSERT INTO tasks (id, title, description, stage_id, status, priority, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  'משימה ' || s.hierarchical_number || '.' || task_number AS title,
  'תיאור עבור משימה ' || s.hierarchical_number || '.' || task_number || ' בשלב ' || s.title AS description,
  s.id AS stage_id,
  CASE 
    WHEN task_number % 3 = 0 THEN 'todo'
    WHEN task_number % 3 = 1 THEN 'in_progress'
    ELSE 'done'
  END AS status,
  CASE 
    WHEN task_number % 3 = 0 THEN 'low'
    WHEN task_number % 3 = 1 THEN 'medium'
    ELSE 'high'
  END AS priority,
  s.hierarchical_number || '.' || task_number AS hierarchical_number
FROM 
  inserted_stages s,
  generate_series(1, 5) AS task_number;

-- שמירת המשימות העיקריות כדי ליצור תת-משימות
WITH main_tasks AS (
  SELECT * FROM tasks
  WHERE hierarchical_number ~ '^[1-5]\.[1-5]$'
)
INSERT INTO tasks (id, title, description, stage_id, status, priority, parent_task_id, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  'משימה ' || mt.hierarchical_number || '.' || subtask_number AS title,
  'תיאור עבור משימה ' || mt.hierarchical_number || '.' || subtask_number || ' (תת-משימה של ' || mt.title || ')' AS description,
  mt.stage_id AS stage_id,
  CASE 
    WHEN subtask_number % 3 = 0 THEN 'todo'
    WHEN subtask_number % 3 = 1 THEN 'in_progress'
    ELSE 'done'
  END AS status,
  CASE 
    WHEN subtask_number % 3 = 0 THEN 'low'
    WHEN subtask_number % 3 = 1 THEN 'medium'
    ELSE 'high'
  END AS priority,
  mt.id AS parent_task_id,
  mt.hierarchical_number || '.' || subtask_number AS hierarchical_number
FROM 
  main_tasks mt,
  generate_series(1, 3) AS subtask_number;

-- הוספת עוד רמה של תת-משימות (רמה שלישית)
WITH second_level_tasks AS (
  SELECT * FROM tasks
  WHERE hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]$'
  AND hierarchical_number LIKE '%.1.%'  -- רק עבור חלק מהמשימות (אלה שמסתיימות ב-1)
)
INSERT INTO tasks (id, title, description, stage_id, status, priority, parent_task_id, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  'משימה ' || slt.hierarchical_number || '.' || subsubtask_number AS title,
  'תיאור עבור משימה ' || slt.hierarchical_number || '.' || subsubtask_number || ' (תת-תת-משימה של ' || slt.title || ')' AS description,
  slt.stage_id AS stage_id,
  CASE 
    WHEN subsubtask_number % 3 = 0 THEN 'todo'
    WHEN subsubtask_number % 3 = 1 THEN 'in_progress'
    ELSE 'done'
  END AS status,
  CASE 
    WHEN subsubtask_number % 3 = 0 THEN 'low'
    WHEN subsubtask_number % 3 = 1 THEN 'medium'
    ELSE 'high'
  END AS priority,
  slt.id AS parent_task_id,
  slt.hierarchical_number || '.' || subsubtask_number AS hierarchical_number
FROM 
  second_level_tasks slt,
  generate_series(1, 2) AS subsubtask_number;

-- עדכון של הסטטוס והקידום של השלבים בהתאם למשימות שהוזנו
UPDATE stages s
SET 
  progress = t.avg_progress,
  status = CASE 
    WHEN t.avg_progress = 100 THEN 'completed'
    WHEN t.avg_progress > 0 THEN 'in_progress'
    ELSE 'pending'
  END
FROM (
  SELECT 
    stage_id,
    ROUND(AVG(
      CASE 
        WHEN status = 'done' THEN 100
        WHEN status = 'in_progress' THEN 50
        ELSE 0
      END
    )) AS avg_progress
  FROM tasks
  GROUP BY stage_id
) t
WHERE s.id = t.stage_id;

-- הוספת שדות לבדיקת הזנת הנתונים
SELECT 'מספר שלבים: ' || COUNT(*) FROM stages WHERE hierarchical_number ~ '^[1-5]$';
SELECT 'מספר משימות: ' || COUNT(*) FROM tasks WHERE hierarchical_number ~ '^[1-5]\.';
SELECT 'מספר תת-משימות (רמה 2): ' || COUNT(*) FROM tasks WHERE hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]$';
SELECT 'מספר תת-תת-משימות (רמה 3): ' || COUNT(*) FROM tasks WHERE hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]\.[1-2]$'; 