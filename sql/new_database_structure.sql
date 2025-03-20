-- שינויים במבנה מסד הנתונים לתמיכה בהיררכיה החדשה

-- כבר קיימת טבלת entrepreneurs (יזמים)
-- CREATE TABLE IF NOT EXISTS entrepreneurs (
--   id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name text NOT NULL UNIQUE,
--   description text,
--   contact_info text,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now()
-- );

-- שינוי שמות לטבלאות קיימות לרוסית (לצורך גיבוי)
ALTER TABLE IF EXISTS projects RENAME TO projects_old;
ALTER TABLE IF EXISTS stages RENAME TO stages_old;
ALTER TABLE IF EXISTS tasks RENAME TO tasks_old;

-- 1. טבלת יזמים (קיימת כבר)
-- לא נדרשים שינויים בטבלה זו

-- 2. טבלת פרויקטים 
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  entrepreneur_id uuid REFERENCES entrepreneurs(id),
  status text DEFAULT 'planning',
  priority text DEFAULT 'medium',
  department text, -- מחלקה
  responsible uuid, -- אחראי
  total_budget numeric,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. טבלת אבני דרך (שלבים)
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  department text, -- מחלקה
  responsible uuid, -- אחראי
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  reminder_date date, -- תזכורת
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sort_order integer -- סדר תצוגה
);

-- 4. טבלת משימות
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  hierarchical_number text, -- מספר היררכי
  task_level integer DEFAULT 1, -- רמת המשימה (1=משימה, 2=תת משימה, 3=תת תת משימה)
  is_planned boolean DEFAULT true, -- האם מתוכננת מראש או אד-הוק
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  category text, -- קטגוריה
  tag text, -- תגית
  department text, -- מחלקה
  responsible uuid, -- אחראי
  estimated_hours numeric,
  actual_hours numeric,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  completed_date date,
  reminder_date date, -- תזכורת
  budget numeric,
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS milestones_project_id_idx ON milestones (project_id);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_milestone_id_idx ON tasks (milestone_id);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS tasks_hierarchical_number_idx ON tasks (hierarchical_number);
CREATE INDEX IF NOT EXISTS tasks_level_idx ON tasks (task_level);

-- הוספת אילוצים
ALTER TABLE milestones ADD CONSTRAINT milestone_sort_order_unique UNIQUE (project_id, sort_order);

-- טריגר לעדכון שדה updated_at בפרויקטים
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- יצירת טבלת אבני דרך קבועות (תבניות) - שמות אבני הדרך הקבועים
CREATE TABLE IF NOT EXISTS milestone_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- הכנסת אבני הדרך הקבועות לפי הדרישה
INSERT INTO milestone_templates (title, sort_order) VALUES
('היכרות', 1),
('איסוף חומר קיים', 2),
('השלמות', 3),
('הערות', 4),
('יישור קו', 5),
('עלייה לאוויר (פריסייל)', 6),
('איסוף נתונים ועדכון', 7),
('המשך מכירות', 8),
('תוך כדי בניה', 9),
('מסירות', 10)
ON CONFLICT (id) DO NOTHING;

-- פונקציה ליצירת אבני דרך אוטומטית בפרויקט חדש
CREATE OR REPLACE FUNCTION create_default_milestones_for_project(project_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO milestones (title, project_id, sort_order)
  SELECT title, project_id, sort_order
  FROM milestone_templates
  ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- טריגר ליצירת אבני דרך אוטומטית בעת יצירת פרויקט חדש
CREATE OR REPLACE FUNCTION trigger_create_default_milestones()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_milestones_for_project(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_milestones_on_project_creation
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_create_default_milestones(); 