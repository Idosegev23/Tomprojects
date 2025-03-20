-- יצירת פונקציה זמנית לייצוא נתונים

CREATE OR REPLACE FUNCTION export_inserted_data()
RETURNS text AS $$
DECLARE
  stages_data text;
  tasks_data text;
  summary_data text;
  result_text text;
BEGIN
  -- שליפת נתוני שלבים
  SELECT json_agg(row_to_json(s))::text INTO stages_data
  FROM (
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
      hierarchical_number
  ) s;
  
  -- שליפת נתוני משימות
  SELECT json_agg(row_to_json(t))::text INTO tasks_data
  FROM (
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
      hierarchical_number
  ) t;
  
  -- שליפת סיכום לפי שלב
  SELECT json_agg(row_to_json(sum))::text INTO summary_data
  FROM (
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
      s.hierarchical_number
  ) sum;
  
  -- איחוד התוצאות
  result_text := 
    '--- STAGES ---\n' || stages_data || 
    '\n\n--- TASKS ---\n' || tasks_data || 
    '\n\n--- SUMMARY ---\n' || summary_data;
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- הרצת הפונקציה
SELECT export_inserted_data() AS result;

-- מחיקת הפונקציה
DROP FUNCTION export_inserted_data(); 