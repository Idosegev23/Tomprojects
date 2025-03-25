-- סקריפט בדיקה לפתרון הסופי

-- יצירת פרויקט חדש לצרכי בדיקה
INSERT INTO projects (
  id, name, owner, status, priority, progress
)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- מזהה קבוע לצורכי בדיקה
  'פרויקט בדיקה סופי',
  'בודק מערכת',
  'planning',
  'medium',
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = 'פרויקט בדיקה סופי - עודכן',
  updated_at = now()
RETURNING id;

-- הדפסת הודעה לפני אתחול הפרויקט
SELECT 'מאתחל פרויקט עם מזהה: 12345678-1234-1234-1234-123456789abc' as message;

-- אתחול הפרויקט עם הפונקציה המתוקנת
SELECT init_project_tables_and_data('12345678-1234-1234-1234-123456789abc', true, true, NULL);

-- בדיקה אם הטבלאות נוצרו
SELECT 
  check_table_exists('project_12345678-1234-1234-1234-123456789abc_tasks') AS tasks_table_exists,
  check_table_exists('project_12345678-1234-1234-1234-123456789abc_stages') AS stages_table_exists;

-- הצגת השלבים שנוצרו
SELECT 'שלבים שנוצרו בפרויקט החדש:' as info;
SELECT * FROM "project_12345678-1234-1234-1234-123456789abc_stages";

-- הצגת המשימות שנוצרו
SELECT 'משימות שנוצרו בפרויקט החדש:' as info;
SELECT * FROM "project_12345678-1234-1234-1234-123456789abc_tasks"; 