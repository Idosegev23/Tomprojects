-- מיגרציה לשינוי מבנה טבלת השלבים (stages)
-- תאריך: 2025-03-21

-- מחיקת כל הנתונים מטבלת השלבים הקיימת
TRUNCATE TABLE stages CASCADE;

-- שמירת גיבוי של מבנה הטבלה הקיימת (במידה ונרצה להחזיר את המבנה)
CREATE TABLE IF NOT EXISTS stages_backup AS SELECT * FROM stages;

-- מחיקת הטבלה הקיימת
DROP TABLE IF EXISTS stages CASCADE;

-- יצירת טבלת השלבים החדשה
CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL, -- שם השלב
  hierarchical_number text, -- מספר היררכי
  due_date date, -- תאריך יעד
  status text DEFAULT 'pending', -- סטטוס (pending, in_progress, completed, etc.)
  progress integer DEFAULT 0, -- אחוז התקדמות (0-100)
  color text, -- צבע לתצוגה ויזואלית (hex או שם צבע)
  parent_stage_id uuid REFERENCES stages(id) ON DELETE CASCADE, -- שלב הורה (לתמיכה בהיררכיה)
  dependencies text[], -- תלויות בשלבים אחרים (מערך של IDs)
  sort_order integer, -- סדר הצגת השלבים
  created_at timestamptz DEFAULT now(), -- תאריך הקמה
  updated_at timestamptz DEFAULT now() -- תאריך עדכון אחרון
);

-- יצירת אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS stages_parent_stage_id_idx ON stages(parent_stage_id);
CREATE INDEX IF NOT EXISTS stages_hierarchical_number_idx ON stages(hierarchical_number);
CREATE INDEX IF NOT EXISTS stages_status_idx ON stages(status);
CREATE INDEX IF NOT EXISTS stages_sort_order_idx ON stages(sort_order);

-- טריגר לעדכון שדה updated_at
CREATE OR REPLACE FUNCTION set_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_stages_updated_at
BEFORE UPDATE ON stages
FOR EACH ROW
EXECUTE FUNCTION set_stages_updated_at();

-- פונקציה לייצור מספר היררכי (כטריגר)
CREATE OR REPLACE FUNCTION generate_stages_hierarchical_number()
RETURNS TRIGGER AS $$
DECLARE
  parent_number text;
  siblings_count integer;
BEGIN
  -- אם יש שלב הורה, נחשב את המספר ההיררכי בהתאם למספר של ההורה
  IF NEW.parent_stage_id IS NOT NULL THEN
    -- קבלת המספר ההיררכי של ההורה
    SELECT hierarchical_number INTO parent_number FROM stages WHERE id = NEW.parent_stage_id;
    
    -- ספירת השלבים האחים תחת אותו הורה
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM stages 
    WHERE parent_stage_id = NEW.parent_stage_id;
    
    -- יצירת המספר ההיררכי החדש
    NEW.hierarchical_number := parent_number || '.' || siblings_count;
  ELSE
    -- שלב ראשי - נספור כמה שלבים ראשיים יש
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM stages 
    WHERE parent_stage_id IS NULL;
    
    -- יצירת המספר ההיררכי החדש
    NEW.hierarchical_number := siblings_count::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הוספת טריגר להגדרת מספר היררכי בעת יצירת שלב חדש
CREATE TRIGGER set_stages_hierarchical_number
BEFORE INSERT ON stages
FOR EACH ROW
WHEN (NEW.hierarchical_number IS NULL)
EXECUTE FUNCTION generate_stages_hierarchical_number();

-- פונקציה נפרדת לחישוב המספר ההיררכי (לשימוש ישיר, לא כטריגר)
CREATE OR REPLACE FUNCTION calculate_stage_hierarchical_number(
  p_stage_id uuid, 
  p_parent_id uuid
) RETURNS text AS $$
DECLARE
  parent_number text;
  siblings_count integer;
  result text;
BEGIN
  -- אם יש שלב הורה, נחשב את המספר ההיררכי בהתאם למספר של ההורה
  IF p_parent_id IS NOT NULL THEN
    -- קבלת המספר ההיררכי של ההורה
    SELECT hierarchical_number INTO parent_number FROM stages WHERE id = p_parent_id;
    
    -- ספירת השלבים האחים תחת אותו הורה
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM stages 
    WHERE parent_stage_id = p_parent_id AND id != p_stage_id;
    
    -- יצירת המספר ההיררכי החדש
    result := parent_number || '.' || siblings_count;
  ELSE
    -- שלב ראשי - נספור כמה שלבים ראשיים יש
    SELECT COUNT(*) + 1 INTO siblings_count 
    FROM stages 
    WHERE parent_stage_id IS NULL AND id != p_stage_id;
    
    -- יצירת המספר ההיררכי החדש
    result := siblings_count::text;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- פונקציה לעדכון sort_order של שלבים
CREATE OR REPLACE FUNCTION update_stages_sort_order()
RETURNS TRIGGER AS $$
BEGIN
  -- מעדכן את ה-sort_order בהתאמה למיקום בהיררכיה
  IF NEW.parent_stage_id IS NOT NULL THEN
    -- אם זה שלב תחת הורה, מקבל את ה-sort_order הבא תחת אותו הורה
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO NEW.sort_order
    FROM stages
    WHERE parent_stage_id = NEW.parent_stage_id;
  ELSE
    -- אם זה שלב ראשי, מקבל את ה-sort_order הבא מבין שלבים ראשיים
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO NEW.sort_order
    FROM stages
    WHERE parent_stage_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הוספת טריגר לעדכון sort_order בעת יצירת שלב חדש
CREATE TRIGGER set_stages_sort_order
BEFORE INSERT ON stages
FOR EACH ROW
WHEN (NEW.sort_order IS NULL)
EXECUTE FUNCTION update_stages_sort_order();

-- טבלת לוג היסטוריה לעקוב אחר שינויים
CREATE TABLE IF NOT EXISTS stages_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  operation text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  changed_by text, -- מי ביצע את השינוי
  old_data jsonb, -- נתונים לפני השינוי
  new_data jsonb, -- נתונים אחרי השינוי
  changed_at timestamptz DEFAULT now() -- מתי בוצע השינוי
);

-- טריגר לתיעוד היסטוריית שינויים
CREATE OR REPLACE FUNCTION log_stages_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- לוגים עבור יצירת שלב
    INSERT INTO stages_history(stage_id, operation, new_data, changed_by)
    VALUES (NEW.id, 'INSERT', row_to_json(NEW)::jsonb, current_user);
  ELSIF TG_OP = 'UPDATE' THEN
    -- לוגים עבור עדכון שלב
    INSERT INTO stages_history(stage_id, operation, old_data, new_data, changed_by)
    VALUES (NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
  ELSIF TG_OP = 'DELETE' THEN
    -- לוגים עבור מחיקת שלב
    INSERT INTO stages_history(stage_id, operation, old_data, changed_by)
    VALUES (OLD.id, 'DELETE', row_to_json(OLD)::jsonb, current_user);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- טריגרים ללוג היסטוריה
CREATE TRIGGER log_stages_insert
AFTER INSERT ON stages
FOR EACH ROW
EXECUTE FUNCTION log_stages_changes();

CREATE TRIGGER log_stages_update
AFTER UPDATE ON stages
FOR EACH ROW
EXECUTE FUNCTION log_stages_changes();

CREATE TRIGGER log_stages_delete
BEFORE DELETE ON stages
FOR EACH ROW
EXECUTE FUNCTION log_stages_changes(); 