-- מחיקת כל הנתונים מטבלאות המשימות והשלבים
TRUNCATE tasks CASCADE;
TRUNCATE stages CASCADE;

-- הוספת שלבים A-E לכל הפרויקטים
INSERT INTO stages (id, project_id, title, description)
SELECT 
  uuid_generate_v4(),
  id, 
  'שלב ' || stage_letter, 
  'תיאור עבור שלב ' || stage_letter || ' בפרויקט'
FROM 
  projects,
  (VALUES ('A'), ('B'), ('C'), ('D'), ('E')) AS stage_letters(stage_letter);

-- הוספת משימות א-ת לכל שלב ופרויקט
WITH hebrew_letters AS (
  SELECT letter FROM (
    VALUES ('א'), ('ב'), ('ג'), ('ד'), ('ה'), ('ו'), ('ז'), ('ח'), ('ט'), ('י'),
           ('כ'), ('ל'), ('מ'), ('נ'), ('ס'), ('ע'), ('פ'), ('צ'), ('ק'), ('ר'), ('ש'), ('ת')
  ) AS letters(letter)
)
INSERT INTO tasks (id, project_id, stage_id, title, description, status, priority, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  p.id AS project_id,
  s.id AS stage_id,
  'משימה ' || l.letter || ' בשלב ' || substring(s.title, 5, 1) AS title,
  'תיאור עבור משימה ' || l.letter || ' בשלב ' || substring(s.title, 5, 1) || ' בפרויקט.' AS description,
  CASE (ascii(l.letter) % 2)
    WHEN 0 THEN 'todo'
    WHEN 1 THEN 'done'
  END AS status,
  CASE (ascii(l.letter) % 3)
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    WHEN 2 THEN 'high'
  END AS priority,
  substring(s.title, 5, 1) || l.letter AS hierarchical_number
FROM 
  projects p
  CROSS JOIN hebrew_letters l
  JOIN stages s ON s.project_id = p.id;

-- הוספת תת-משימות למשימות הראשיות
WITH primary_tasks AS (
  SELECT * FROM tasks WHERE hierarchical_number ~ '^[A-E].$'
)
INSERT INTO tasks (id, project_id, stage_id, title, description, status, priority, parent_task_id, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  pt.project_id,
  pt.stage_id,
  'תת-משימה 1 עבור ' || pt.title AS title,
  'תיאור עבור תת-משימה 1 של ' || pt.title AS description,
  CASE (ascii(substring(pt.hierarchical_number, 2, 1)) % 2)
    WHEN 0 THEN 'todo'
    WHEN 1 THEN 'done'
  END AS status,
  CASE (ascii(substring(pt.hierarchical_number, 2, 1)) % 3)
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    WHEN 2 THEN 'high'
  END AS priority,
  pt.id AS parent_task_id,
  pt.hierarchical_number || '.1' AS hierarchical_number
FROM 
  primary_tasks pt
WHERE 
  ascii(substring(pt.hierarchical_number, 2, 1)) % 3 = 0;  -- רק לשליש מהמשימות

-- הוספת תת-תת-משימות
WITH sub_tasks AS (
  SELECT * FROM tasks WHERE hierarchical_number ~ '^[A-E].\\.1$'
)
INSERT INTO tasks (id, project_id, stage_id, title, description, status, priority, parent_task_id, hierarchical_number)
SELECT 
  uuid_generate_v4() AS id,
  st.project_id,
  st.stage_id,
  'תת-תת-משימה 1 עבור ' || st.title AS title,
  'תיאור עבור תת-תת-משימה 1 של ' || st.title AS description,
  CASE (ascii(substring(st.hierarchical_number, 2, 1)) % 2)
    WHEN 0 THEN 'todo'
    WHEN 1 THEN 'done'
  END AS status,
  CASE (ascii(substring(st.hierarchical_number, 2, 1)) % 3)
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    WHEN 2 THEN 'high'
  END AS priority,
  st.id AS parent_task_id,
  st.hierarchical_number || '.1' AS hierarchical_number
FROM 
  sub_tasks st
WHERE 
  ascii(substring(st.hierarchical_number, 2, 1)) % 2 = 0;  -- רק למחצית מתת-המשימות 