-- סקריפט לבדיקה אם הפרויקט קיים ויצירה שלו אם לא
-- העתק והדבק קוד זה לממשק SQL של סופאבייס

-- פונקציה ליצירת פרויקט אם לא קיים
DO $$
DECLARE
  -- פרויקט חדש שגרם לשגיאה
  new_project_id uuid := '5b291208-e165-4e7c-abaf-b26e41a8d31d';
  project_count integer;
BEGIN
  -- בדיקה אם הפרויקט קיים
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE id = new_project_id;
  
  -- אם הפרויקט לא קיים, יצירתו
  IF project_count = 0 THEN
    RAISE NOTICE 'פרויקט עם מזהה % לא קיים, יוצר פרויקט חדש...', new_project_id;
    
    INSERT INTO projects (
      id, 
      name, 
      description, 
      status, 
      start_date, 
      end_date, 
      created_at, 
      updated_at
    ) VALUES (
      new_project_id,
      'פרויקט לדוגמה חדש', 
      'פרויקט חדש שנוצר אוטומטית לצורך בדיקת המערכת', 
      'active', 
      CURRENT_DATE, 
      CURRENT_DATE + INTERVAL '180 days', 
      now(), 
      now()
    );
    
    RAISE NOTICE 'פרויקט חדש נוצר בהצלחה עם מזהה %', new_project_id;
  ELSE
    RAISE NOTICE 'פרויקט עם מזהה % כבר קיים במערכת', new_project_id;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'שגיאה ביצירת הפרויקט: %', SQLERRM;
END;
$$; 

-- בדיקה והוספה של פרויקט נוסף (הישן) במידת הצורך
DO $$
DECLARE
  -- הפרויקט הקודם שטיפלנו בו
  previous_project_id uuid := '5d08c5ee-1ba3-4e70-96c5-e488745f2519';
  project_count integer;
BEGIN
  -- בדיקה אם הפרויקט קיים
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE id = previous_project_id;
  
  -- אם הפרויקט לא קיים, יצירתו
  IF project_count = 0 THEN
    RAISE NOTICE 'פרויקט קודם עם מזהה % לא קיים, יוצר אותו...', previous_project_id;
    
    INSERT INTO projects (
      id, 
      name, 
      description, 
      status, 
      start_date, 
      end_date, 
      created_at, 
      updated_at
    ) VALUES (
      previous_project_id,
      'פרויקט לדוגמה מקורי', 
      'פרויקט שנוצר אוטומטית לצורך בדיקת המערכת', 
      'active', 
      CURRENT_DATE, 
      CURRENT_DATE + INTERVAL '180 days', 
      now(), 
      now()
    );
    
    RAISE NOTICE 'פרויקט קודם נוצר בהצלחה עם מזהה %', previous_project_id;
  ELSE
    RAISE NOTICE 'פרויקט קודם עם מזהה % כבר קיים במערכת', previous_project_id;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'שגיאה ביצירת הפרויקט הקודם: %', SQLERRM;
END;
$$; 