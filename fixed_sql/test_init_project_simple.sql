-- סקריפט פשוט לבדיקת תקינות פונקציית init_project_tables_and_data

-- 1. יצירת פרויקט חדש לבדיקה 
INSERT INTO projects (
  id, name, owner, status, priority, progress
)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- מזהה קבוע לצורכי בדיקה
  'פרויקט בדיקה',
  'בודק מערכת',
  'planning',
  'medium',
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = 'פרויקט בדיקה מעודכן',
  updated_at = now()
RETURNING id;

-- 2. הפעלת הפונקציה המתוקנת עם סינטקס פשוט
SELECT init_project_tables_and_data(
  '12345678-1234-1234-1234-123456789abc',
  true,
  true,
  NULL
);

-- 3. בדיקה פשוטה אם הטבלאות קיימות
SELECT check_table_exists('project_12345678-1234-1234-1234-123456789abc_tasks') AS tasks_exist,
       check_table_exists('project_12345678-1234-1234-1234-123456789abc_stages') AS stages_exist; 