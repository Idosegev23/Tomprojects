-- בדיקת השלבים שהוזנו
SELECT
  id,
  title,
  hierarchical_number,
  status,
  progress,
  color
FROM
  stages
WHERE
  hierarchical_number ~ '^[1-5]$'
ORDER BY
  hierarchical_number::int;

-- בדיקת המשימות הראשיות שהוזנו (רמה ראשונה)
SELECT
  id,
  title,
  description,
  stage_id,
  status,
  priority,
  hierarchical_number
FROM
  tasks
WHERE
  hierarchical_number ~ '^[1-5]\.[1-5]$'
ORDER BY
  hierarchical_number;

-- בדיקת תת-משימות (רמה שניה)
SELECT
  id,
  title,
  parent_task_id,
  status,
  priority,
  hierarchical_number
FROM
  tasks
WHERE
  hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]$'
ORDER BY
  hierarchical_number;

-- בדיקת תת-תת-משימות (רמה שלישית)
SELECT
  id,
  title,
  parent_task_id,
  status,
  priority,
  hierarchical_number
FROM
  tasks
WHERE
  hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]\.[1-2]$'
ORDER BY
  hierarchical_number;

-- סיכום לפי שלב
SELECT
  s.title AS stage_title,
  s.hierarchical_number,
  COUNT(t.id) AS task_count,
  SUM(CASE WHEN t.hierarchical_number ~ '^[1-5]\.[1-5]$' THEN 1 ELSE 0 END) AS main_tasks,
  SUM(CASE WHEN t.hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]$' THEN 1 ELSE 0 END) AS subtasks,
  SUM(CASE WHEN t.hierarchical_number ~ '^[1-5]\.[1-5]\.[1-3]\.[1-2]$' THEN 1 ELSE 0 END) AS subsubtasks,
  SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
  SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
  SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks
FROM
  stages s
LEFT JOIN
  tasks t ON s.id = t.stage_id
WHERE
  s.hierarchical_number ~ '^[1-5]$'
GROUP BY
  s.id, s.title, s.hierarchical_number
ORDER BY
  s.hierarchical_number::int; 