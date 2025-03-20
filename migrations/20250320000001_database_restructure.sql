-- קובץ מיגרציה 20250320000001_database_restructure.sql
-- שינוי מבנה בסיס הנתונים לתמיכה בהיררכיה החדשה של המשימות והפרויקטים

-- שינוי שמות לטבלאות קיימות (גיבוי)
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

-- פונקציה לקבלת אבני הדרך של פרויקט בסדר הנכון
CREATE OR REPLACE FUNCTION get_project_milestones(p_project_id uuid)
RETURNS SETOF milestones AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM milestones 
  WHERE project_id = p_project_id
  ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת המשימות של אבן דרך
CREATE OR REPLACE FUNCTION get_milestone_tasks(p_milestone_id uuid)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM tasks 
  WHERE milestone_id = p_milestone_id AND parent_task_id IS NULL AND deleted = false
  ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לקבלת תתי משימות
CREATE OR REPLACE FUNCTION get_subtasks(p_task_id uuid)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM tasks 
  WHERE parent_task_id = p_task_id AND deleted = false
  ORDER BY hierarchical_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה ליצירת מספר היררכי למשימה חדשה
CREATE OR REPLACE FUNCTION generate_hierarchical_number(
  p_project_id uuid, 
  p_milestone_id uuid, 
  p_parent_task_id uuid
) RETURNS text AS $$
DECLARE
  parent_number text;
  next_number integer;
  new_number text;
BEGIN
  -- אם יש משימת אב, נתחיל עם המספר ההיררכי שלה
  IF p_parent_task_id IS NOT NULL THEN
    SELECT hierarchical_number INTO parent_number FROM tasks WHERE id = p_parent_task_id;
    
    -- נמצא את המשימה האחרונה באותה רמה
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(hierarchical_number FROM LENGTH(parent_number) + 2) AS integer)
    ), 0) + 1
    INTO next_number
    FROM tasks
    WHERE parent_task_id = p_parent_task_id AND deleted = false;
    
    new_number := parent_number || '.' || next_number;
  -- אם אין משימת אב, נתחיל עם אבן הדרך
  ELSIF p_milestone_id IS NOT NULL THEN
    -- נמצא את מספר אבן הדרך בתוך הפרויקט
    WITH milestone_index AS (
      SELECT sort_order FROM milestones WHERE id = p_milestone_id
    )
    SELECT COALESCE(milestone_index.sort_order, 0) || '.' || 
           (COALESCE(MAX(
             CAST(SPLIT_PART(hierarchical_number, '.', 2) AS integer)
           ), 0) + 1)
    INTO new_number
    FROM tasks, milestone_index
    WHERE milestone_id = p_milestone_id 
    AND parent_task_id IS NULL
    AND deleted = false;
  -- אם אין גם אבן דרך, נתחיל עם מספר פרויקט
  ELSE
    -- נמצא את המשימה האחרונה ברמה הגבוהה
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(hierarchical_number, '.', 1) AS integer)
    ), 0) + 1 || '.1'
    INTO new_number
    FROM tasks
    WHERE project_id = p_project_id 
    AND parent_task_id IS NULL 
    AND milestone_id IS NULL
    AND deleted = false;
  END IF;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להוספת משימה חדשה
CREATE OR REPLACE FUNCTION add_task(
  p_title text,
  p_description text,
  p_project_id uuid,
  p_milestone_id uuid DEFAULT NULL,
  p_parent_task_id uuid DEFAULT NULL,
  p_status text DEFAULT 'todo',
  p_priority text DEFAULT 'medium',
  p_category text DEFAULT NULL,
  p_tag text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_responsible uuid DEFAULT NULL,
  p_planned_start_date date DEFAULT NULL,
  p_planned_end_date date DEFAULT NULL,
  p_task_level integer DEFAULT NULL,
  p_is_planned boolean DEFAULT NULL
) RETURNS tasks AS $$
DECLARE
  new_task tasks;
  calculated_task_level integer;
  calculated_is_planned boolean;
BEGIN
  -- חישוב רמת המשימה אם לא סופקה
  IF p_task_level IS NULL THEN
    IF p_parent_task_id IS NULL THEN
      calculated_task_level := 1; -- משימה ראשית
    ELSE
      -- בדוק את רמת משימת האב
      SELECT task_level INTO calculated_task_level FROM tasks WHERE id = p_parent_task_id;
      calculated_task_level := calculated_task_level + 1; -- הוסף רמה
    END IF;
  ELSE
    calculated_task_level := p_task_level;
  END IF;
  
  -- חישוב האם משימה מתוכננת
  IF p_is_planned IS NULL THEN
    calculated_is_planned := (calculated_task_level < 3); -- מתוכננת אם רמה 1 או 2
  ELSE
    calculated_is_planned := p_is_planned;
  END IF;
  
  -- יצירת מספר היררכי
  INSERT INTO tasks (
    title,
    description,
    project_id,
    milestone_id,
    parent_task_id,
    hierarchical_number,
    task_level,
    is_planned,
    status,
    priority,
    category,
    tag,
    department,
    responsible,
    planned_start_date,
    planned_end_date
  ) VALUES (
    p_title,
    p_description,
    p_project_id,
    p_milestone_id,
    p_parent_task_id,
    generate_hierarchical_number(p_project_id, p_milestone_id, p_parent_task_id),
    calculated_task_level,
    calculated_is_planned,
    p_status,
    p_priority,
    p_category,
    p_tag,
    p_department,
    p_responsible,
    p_planned_start_date,
    p_planned_end_date
  ) RETURNING * INTO new_task;
  
  RETURN new_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 