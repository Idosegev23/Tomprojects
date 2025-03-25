-- הוספת העמודה is_global_template לטבלת המשימות
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_global_template boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS tasks_is_global_template_idx ON tasks (is_global_template);
