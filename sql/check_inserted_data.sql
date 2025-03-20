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
  title LIKE 'Stage %'
ORDER BY
  hierarchical_number;

-- בדיקת המשימות שהוזנו
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
  title LIKE 'Task %'
ORDER BY
  hierarchical_number;

-- סיכום לפי שלב
SELECT
  s.title AS stage_title,
  s.hierarchical_number,
  COUNT(t.id) AS task_count,
  SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
  SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
  SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks
FROM
  stages s
LEFT JOIN
  tasks t ON s.id = t.stage_id
WHERE
  s.title LIKE 'Stage %'
GROUP BY
  s.id, s.title, s.hierarchical_number
ORDER BY
  s.hierarchical_number; 