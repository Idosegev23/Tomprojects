-- בדיקת הפתרון המעודכן - סקריפט מינימלי

-- 1. יצירת פרויקט חדש לבדיקה
INSERT INTO projects (
  id, name, description, entrepreneur_id, status, priority, progress, owner
)
VALUES (
  '12345678-1234-1234-1234-123456789abc', -- מזהה קבוע לצורכי בדיקה
  'פרויקט בדיקה סופי',
  'תיאור פרויקט בדיקה',
  null,
  'planning',
  'medium',
  0,
  'בודק מערכת'
)
ON CONFLICT (id) 
DO UPDATE SET
  name = 'פרויקט בדיקה סופי - עודכן',
  updated_at = now()
RETURNING id;

-- 2. הצגת פרטי הפרויקט
SELECT 'פרטי הפרויקט:' as message;
SELECT id, name, status, owner FROM projects WHERE id = '12345678-1234-1234-1234-123456789abc';

-- 3. קריאה לפונקציית האתחול - עם מערך משימות ריק (משימות ברירת מחדל יווצרו)
SELECT 'קריאה לפונקציית האתחול:' as message;
SELECT init_project_tables_and_data('12345678-1234-1234-1234-123456789abc', true, true, NULL); 