-- טריגר שיקרא לפונקציה init_project_tables_and_data בזמן יצירת פרויקט

-- פונקציית הטריגר
CREATE OR REPLACE FUNCTION project_after_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה שיוצרת את טבלאות הפרויקט
  -- אם יש מערך של IDs של משימות שנבחרו בעת יצירת הפרויקט,
  -- אפשר להעביר אותו כפרמטר רביעי לפונקציה
  PERFORM init_project_tables_and_data(NEW.id, true, true, NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת הטריגר על טבלת הפרויקטים
DROP TRIGGER IF EXISTS project_after_insert_trigger ON projects;
CREATE TRIGGER project_after_insert_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION project_after_insert_trigger();

-- הערה לגבי העברת משימות נבחרות:
-- כדי להעביר רשימת משימות נבחרות, יש לעדכן את הלוגיקה בAPI/Frontend
-- כך שמערך המשימות יועבר כפרמטר לפונקציה init_project_tables_and_data
-- לדוגמה:
/*
  -- בעת יצירת פרויקט ובחירת משימות, לקרוא באופן מפורש לפונקציה:
  SELECT init_project_tables_and_data(
    'מזהה-הפרויקט-החדש', 
    true, 
    true, 
    ARRAY['מזהה-משימה-1', 'מזהה-משימה-2', 'מזהה-משימה-3']
  );
*/ 