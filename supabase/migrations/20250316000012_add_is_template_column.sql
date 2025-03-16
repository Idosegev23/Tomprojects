-- הוספת העמודה is_template לטבלת המשימות
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- יצירת אינדקס על העמודה החדשה
CREATE INDEX IF NOT EXISTS tasks_is_template_idx ON tasks (is_template); 