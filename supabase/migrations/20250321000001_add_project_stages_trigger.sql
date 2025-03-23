-- ====================================================================
-- הוספת טריגר שייצור טבלת שלבים ייחודית לכל פרויקט חדש שנוצר
-- ====================================================================

-- פונקציית טריגר ליצירת טבלת שלבים ייחודית כאשר נוצר פרויקט חדש
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_project_stages_table(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הגדרת הטריגר על טבלת projects
DROP TRIGGER IF EXISTS create_project_stages_table_trigger ON projects;
CREATE TRIGGER create_project_stages_table_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_stages_table_on_project_insert();

-- ====================================================================
-- הרצת פונקצית סנכרון על כל הפרויקטים הקיימים
-- ====================================================================

-- יצירת טבלאות שלבים ייחודיות לכל הפרויקטים הקיימים וסנכרון נתונים
SELECT sync_all_project_tables(); 