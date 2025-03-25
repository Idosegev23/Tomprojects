-- בדיקה שרק המשימות הנבחרות מועתקות
-- שלב 1: יצירת משימות לבדיקה (אם הן לא קיימות)
INSERT INTO tasks (id, title, description, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'משימה ראשונה לבדיקה', 'תיאור משימה 1', 'todo'),
  ('22222222-2222-2222-2222-222222222222', 'משימה שנייה לבדיקה', 'תיאור משימה 2', 'in_progress'),
  ('33333333-3333-3333-3333-333333333333', 'משימה שלישית לבדיקה', 'תיאור משימה 3', 'done')
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;

-- שלב 2: יצירת פרויקט חדש לבדיקה
INSERT INTO projects (id, name, description, status, priority, progress)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'פרויקט בדיקת משימות נבחרות',
  'בדיקה שרק המשימות שנבחרו מועתקות',
  'planning',
  'medium',
  0
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- שלב 3: קריאה לפונקציית האתחול עם מערך המשימות הנבחרות
-- (רק משימות 1 ו-3)
SELECT init_project_tables_and_data(
  '99999999-9999-9999-9999-999999999999',
  true,
  true,
  ARRAY['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333']
);

-- שלב 4: בדיקת התוצאות - אילו משימות הועתקו לטבלת המשימות של הפרויקט
SELECT 'המשימות שהועתקו לפרויקט:' as info;
SELECT 
  id, title, description, status
FROM 
  project_99999999-9999-9999-9999-999999999999_tasks; 