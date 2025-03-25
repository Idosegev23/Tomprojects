-- שלב 1: יצירת פרויקט חדש

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