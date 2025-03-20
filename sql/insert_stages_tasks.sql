-- מחיקת הנתונים הקיימים בטבלאות (אופציונלי, יש להסיר סימון הערה אם רוצים למחוק את הנתונים הקיימים)
-- TRUNCATE tasks CASCADE;
-- TRUNCATE stages CASCADE;

-- הוספת שלבים A-E לטבלת stages
INSERT INTO stages (id, title, hierarchical_number, status, progress, color)
VALUES
  (uuid_generate_v4(), 'Stage A', 'A', 'pending', 0, '#FF5733'),
  (uuid_generate_v4(), 'Stage B', 'B', 'pending', 0, '#33FF57'),
  (uuid_generate_v4(), 'Stage C', 'C', 'pending', 0, '#3357FF'),
  (uuid_generate_v4(), 'Stage D', 'D', 'pending', 0, '#F3FF33'),
  (uuid_generate_v4(), 'Stage E', 'E', 'pending', 0, '#FF33F3');

-- שמירת מזהי השלבים במשתנים זמניים לשימוש בהוספת משימות
WITH inserted_stages AS (
  SELECT * FROM stages
  WHERE title IN ('Stage A', 'Stage B', 'Stage C', 'Stage D', 'Stage E')
  ORDER BY hierarchical_number
)
INSERT INTO tasks (id, title, description, stage_id, status, priority, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  'Task ' || letter AS title,
  'Description for Task ' || letter || ' in ' || s.title AS description,
  s.id AS stage_id,
  CASE 
    WHEN ascii(letter) % 3 = 0 THEN 'todo'
    WHEN ascii(letter) % 3 = 1 THEN 'in_progress'
    ELSE 'done'
  END AS status,
  CASE 
    WHEN ascii(letter) % 3 = 0 THEN 'low'
    WHEN ascii(letter) % 3 = 1 THEN 'medium'
    ELSE 'high'
  END AS priority,
  s.hierarchical_number || '-' || letter AS hierarchical_number
FROM 
  inserted_stages s,
  (VALUES 
    ('a'), ('b'), ('c'), ('d'), ('e'), ('f'), ('g'), ('h'), ('i'), ('j'),
    ('k'), ('l'), ('m'), ('n'), ('o'), ('p'), ('q'), ('r'), ('s'), ('t'),
    ('u'), ('v'), ('w'), ('x'), ('y'), ('z')
  ) AS letters(letter);

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
SELECT 'Stages count: ' || COUNT(*) FROM stages WHERE title LIKE 'Stage %';
SELECT 'Tasks count: ' || COUNT(*) FROM tasks WHERE title LIKE 'Task %'; 