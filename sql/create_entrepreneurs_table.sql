-- יצירת טבלת יזמים
CREATE TABLE IF NOT EXISTS entrepreneurs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- הוספת אינדקס על שם היזם
CREATE INDEX IF NOT EXISTS entrepreneurs_name_idx ON entrepreneurs (name);

-- יצירת טריגר לעדכון שדה updated_at
CREATE TRIGGER set_entrepreneurs_updated_at
BEFORE UPDATE ON entrepreneurs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- הוספת הערה לטבלה
COMMENT ON TABLE entrepreneurs IS 'טבלת יזמים';
COMMENT ON COLUMN entrepreneurs.name IS 'שם היזם';
COMMENT ON COLUMN entrepreneurs.description IS 'תיאור היזם';
COMMENT ON COLUMN entrepreneurs.contact_info IS 'פרטי קשר של היזם';

-- עדכון טבלת הפרויקטים כדי להוסיף מפתח זר ליזם
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS entrepreneur_id uuid REFERENCES entrepreneurs(id);

-- יצירת פונקציה להמרת שמות יזמים קיימים למזהים
CREATE OR REPLACE FUNCTION migrate_entrepreneur_names_to_ids()
RETURNS void AS $$
DECLARE
  project_record RECORD;
BEGIN
  -- עבור על כל הפרויקטים עם שם יזם
  FOR project_record IN 
    SELECT id, entrepreneur 
    FROM projects 
    WHERE entrepreneur IS NOT NULL AND entrepreneur != ''
  LOOP
    -- בדוק אם היזם כבר קיים בטבלת היזמים
    INSERT INTO entrepreneurs (name)
    VALUES (project_record.entrepreneur)
    ON CONFLICT (name) DO NOTHING;
    
    -- עדכן את מזהה היזם בטבלת הפרויקטים
    UPDATE projects
    SET entrepreneur_id = (SELECT id FROM entrepreneurs WHERE name = project_record.entrepreneur)
    WHERE id = project_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הפעלת הפונקציה להמרת שמות יזמים למזהים
SELECT migrate_entrepreneur_names_to_ids();

-- יצירת פונקציות RPC לניהול יזמים

-- פונקציה לקבלת כל היזמים
CREATE OR REPLACE FUNCTION get_entrepreneurs()
RETURNS SETOF entrepreneurs AS $$
BEGIN
  RETURN QUERY SELECT * FROM entrepreneurs ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה להוספת יזם חדש
CREATE OR REPLACE FUNCTION add_entrepreneur(p_name text, p_description text DEFAULT NULL, p_contact_info text DEFAULT NULL)
RETURNS entrepreneurs AS $$
DECLARE
  new_entrepreneur entrepreneurs;
BEGIN
  INSERT INTO entrepreneurs (name, description, contact_info)
  VALUES (p_name, p_description, p_contact_info)
  RETURNING * INTO new_entrepreneur;
  
  RETURN new_entrepreneur;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לעדכון יזם
CREATE OR REPLACE FUNCTION update_entrepreneur(p_id uuid, p_name text DEFAULT NULL, p_description text DEFAULT NULL, p_contact_info text DEFAULT NULL)
RETURNS entrepreneurs AS $$
DECLARE
  updated_entrepreneur entrepreneurs;
BEGIN
  UPDATE entrepreneurs
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    contact_info = COALESCE(p_contact_info, contact_info),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO updated_entrepreneur;
  
  RETURN updated_entrepreneur;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה למחיקת יזם
CREATE OR REPLACE FUNCTION delete_entrepreneur(p_id uuid)
RETURNS void AS $$
BEGIN
  -- עדכון פרויקטים שמשויכים ליזם זה
  UPDATE projects
  SET entrepreneur_id = NULL
  WHERE entrepreneur_id = p_id;
  
  -- מחיקת היזם
  DELETE FROM entrepreneurs
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 