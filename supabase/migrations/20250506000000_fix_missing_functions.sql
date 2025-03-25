-- migration_name: 20250506000000_fix_missing_functions
-- description: תיקון פונקציות חסרות לסנכרון שלבים והעתקתם לטבלאות הייחודיות של הפרויקט

-- וידוא קיום טבלת tasks אם לא קיימת
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES projects(id),
  stage_id uuid, -- לא עושים REFERENCES כי יכול להיות שהשלב הוא בטבלה ייחודית
  parent_task_id uuid,
  hierarchical_number text,
  due_date date,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  category text,
  responsible text,
  dropbox_folder text,
  start_date date,
  completed_date date,
  budget numeric,
  estimated_hours numeric,
  actual_hours numeric,
  dependencies jsonb,
  assignees text[],
  watchers text[],
  labels text[],
  is_template boolean DEFAULT false,
  original_task_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- וידוא קיום טבלת stages אם לא קיימת
CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  project_id uuid REFERENCES projects(id),
  hierarchical_number text,
  due_date date,
  status text DEFAULT 'pending',
  progress integer DEFAULT 0,
  color text,
  parent_stage_id uuid,
  dependencies jsonb,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- עדכון קובץ המעקב
DO $$ 
BEGIN
  RAISE NOTICE 'המיגרציה הסתיימה בהצלחה. הטבלאות הבסיסיות נוצרו או כבר קיימות.';
END $$; 