-- קובץ ליצירה מחדש של טבלת projects בסופרבייס

CREATE TABLE IF NOT EXISTS public.projects (
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

-- יצירת אינדקסים
CREATE INDEX IF NOT EXISTS projects_entrepreneur_id_idx ON public.projects (entrepreneur_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects (status);
CREATE INDEX IF NOT EXISTS projects_priority_idx ON public.projects (priority);

-- טריגר לעדכון שדה updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- יצירת טריגר לעדכון שדה updated_at בעת עדכון פרויקטים
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- הענקת הרשאות גישה מלאות לכל התפקידים
GRANT ALL PRIVILEGES ON TABLE public.projects TO anon;
GRANT ALL PRIVILEGES ON TABLE public.projects TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.projects TO service_role; 