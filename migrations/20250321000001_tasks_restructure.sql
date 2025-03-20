-- מיגרציה לשינוי מבנה טבלת המשימות
-- תאריך: 2025-03-21

-- מחיקת כל הנתונים מטבלת המשימות הקיימת
TRUNCATE TABLE tasks CASCADE;

-- שמירת גיבוי של מבנה הטבלה הקיימת (במידה ונרצה להחזיר את המבנה)
CREATE TABLE IF NOT EXISTS tasks_backup AS SELECT * FROM tasks;

-- מחיקת הטבלה הקיימת
DROP TABLE IF EXISTS tasks CASCADE;

-- יצירת טבלת המשימות החדשה
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL, -- שם משימה
  description text, -- תיאור המשימה
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE, -- פרויקט שהמשימה משוייכת אליו
  stage_id uuid REFERENCES stages(id) ON DELETE SET NULL, -- שלב שהיא משוייכת אליו
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE, -- משימת הורה
  hierarchical_number text, -- מספר היררכי
  due_date date, -- תאריך יעד
  status text DEFAULT 'todo', -- סטטוס
  priority text DEFAULT 'medium', -- עדיפות
  category text, -- קטגוריה
  responsible uuid, -- למי משוייכת
  dropbox_folder text, -- קישור לתקיית דרופבוקס
  created_at timestamptz DEFAULT now(), -- תאריך הקמה
  updated_at timestamptz DEFAULT now()
);

-- יצירת אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_stage_id_idx ON tasks(stage_id);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS tasks_hierarchical_number_idx ON tasks(hierarchical_number);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_responsible_idx ON tasks(responsible);

-- טריגר לעדכון שדה updated_at
CREATE OR REPLACE FUNCTION set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_tasks_updated_at();

-- פונקציה לייצור מספר היררכי (כטריגר)
CREATE OR REPLACE FUNCTION generate_tasks_hierarchical_number()
RETURNS TRIGGER AS $$
DECLARE
  parent_number text;
  siblings_count integer;
BEGIN
  -- אם יש משימת הורה, נחשב את המספר ההיררכי בהתאם למספר של ההורה
  IF NEW.parent_task_id IS NOT NULL THEN
    -- קבלת המספר ההיררכי של ההורה
    SELECT hierarchical_number INTO parent_number FROM tasks WHERE id = NEW.parent_task_id;
    
    -- ספירת המשימות האחיות תחת אותו הורה
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM tasks 
    WHERE parent_task_id = NEW.parent_task_id;
    
    -- יצירת המספר ההיררכי החדש
    NEW.hierarchical_number := parent_number || '.' || siblings_count;
  ELSE
    -- משימה ראשית - נספור כמה משימות ראשיות יש תחת אותו שלב
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM tasks 
    WHERE stage_id = NEW.stage_id AND parent_task_id IS NULL;
    
    -- יצירת המספר ההיררכי החדש
    NEW.hierarchical_number := siblings_count::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הוספת טריגר להגדרת מספר היררכי בעת יצירת משימה חדשה
CREATE TRIGGER set_tasks_hierarchical_number
BEFORE INSERT ON tasks
FOR EACH ROW
WHEN (NEW.hierarchical_number IS NULL)
EXECUTE FUNCTION generate_tasks_hierarchical_number();

-- פונקציה נפרדת לחישוב המספר ההיררכי (לשימוש ישיר, לא כטריגר)
CREATE OR REPLACE FUNCTION calculate_hierarchical_number(
  p_task_id uuid, 
  p_parent_id uuid, 
  p_stage_id uuid
) RETURNS text AS $$
DECLARE
  parent_number text;
  siblings_count integer;
  result text;
BEGIN
  -- אם יש משימת הורה, נחשב את המספר ההיררכי בהתאם למספר של ההורה
  IF p_parent_id IS NOT NULL THEN
    -- קבלת המספר ההיררכי של ההורה
    SELECT hierarchical_number INTO parent_number FROM tasks WHERE id = p_parent_id;
    
    -- ספירת המשימות האחיות תחת אותו הורה
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM tasks 
    WHERE parent_task_id = p_parent_id AND id != p_task_id;
    
    -- יצירת המספר ההיררכי החדש
    result := parent_number || '.' || siblings_count;
  ELSE
    -- משימה ראשית - נספור כמה משימות ראשיות יש תחת אותו שלב
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM tasks 
    WHERE stage_id = p_stage_id AND parent_task_id IS NULL AND id != p_task_id;
    
    -- יצירת המספר ההיררכי החדש
    result := siblings_count::text;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ניתן לעדכן כאן את קובץ המעקב של המבנה 
-- (אם רלוונטי למערכת) 