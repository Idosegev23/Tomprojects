-- יצירת פרויקט בדיקה חדש

-- יצירת פרויקט חדש לצרכי בדיקה
INSERT INTO projects (
  id, name, owner, status, priority, progress
)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- מזהה קבוע לצורכי בדיקה
  'פרויקט בדיקה - חדש',
  'בודק מערכת',
  'planning',
  'medium',
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = 'פרויקט בדיקה - עודכן',
  updated_at = now()
RETURNING id;

-- בדיקה שהפרויקט נוצר
SELECT * FROM projects WHERE id = '12345678-1234-1234-1234-123456789abc';

-- אתחול הפרויקט עם הפונקציה המתוקנת
SELECT init_project_tables_and_data('12345678-1234-1234-1234-123456789abc', true, true, NULL);

-- בדיקת התוצאות - האם הטבלאות נוצרו
SELECT 
  check_table_exists('project_12345678-1234-1234-1234-123456789abc_tasks') AS tasks_table_exists,
  check_table_exists('project_12345678-1234-1234-1234-123456789abc_stages') AS stages_table_exists; 