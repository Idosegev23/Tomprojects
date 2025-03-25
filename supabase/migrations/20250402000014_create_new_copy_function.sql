-- migration_name: 20250402000014_create_new_copy_function
-- description: יצירת פונקציה חדשה להעתקת שלבים

-- מחיקת הפונקציות הקיימות
DROP FUNCTION IF EXISTS copy_stages_to_project_table(uuid);
DROP FUNCTION IF EXISTS copy_existing_stages_to_project_tables();

-- יצירת פונקציה חדשה שמעתיקה שלבים
CREATE FUNCTION copy_stages_to_project_table_v2(p_project_id uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || p_project_id::text || '_stages';
  stage_rec record;
BEGIN
  -- בדיקה אם טבלת השלבים הייחודית קיימת
  IF check_stages_table_exists(stages_table_name) THEN
    -- מעבר על כל השלבים בטבלה הכללית שמשויכים לפרויקט זה
    FOR stage_rec IN SELECT 
        s.id, s.title, s.hierarchical_number, s.due_date, 
        s.status, s.progress, s.color, s.parent_stage_id, 
        s.dependencies, s.sort_order, s.created_at, s.updated_at, 
        s.project_id
      FROM stages s
      WHERE s.project_id = p_project_id
    LOOP
      -- הוספת השלב לטבלה הייחודית
      EXECUTE format('
        INSERT INTO %I (
          id, title, hierarchical_number, due_date, status, progress, 
          color, parent_stage_id, dependencies, sort_order, 
          created_at, updated_at, project_id
        ) VALUES (
          %L, %L, %L, %L, %L, %L,
          %L, %L, %L, %L,
          %L, %L, %L
        )
        ON CONFLICT (id) DO NOTHING',
        stages_table_name,
        stage_rec.id,
        stage_rec.title,
        stage_rec.hierarchical_number,
        stage_rec.due_date,
        stage_rec.status,
        stage_rec.progress,
        stage_rec.color,
        stage_rec.parent_stage_id,
        stage_rec.dependencies,
        stage_rec.sort_order,
        stage_rec.created_at,
        stage_rec.updated_at,
        stage_rec.project_id
      );
    END LOOP;
    
    RAISE NOTICE 'שלבים הועתקו בהצלחה לטבלה %', stages_table_name;
  ELSE
    RAISE NOTICE 'טבלת השלבים % לא קיימת ולכן לא ניתן להעתיק שלבים', stages_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת פונקציה חדשה להעתקת כל השלבים הקיימים לטבלאות
CREATE FUNCTION copy_existing_stages_to_project_tables_v2()
RETURNS void AS $$
DECLARE
  project_rec record;
BEGIN
  FOR project_rec IN SELECT id FROM projects
  LOOP
    BEGIN
      -- קודם כל יוצרים את הטבלה אם היא לא קיימת
      PERFORM create_project_stages_table(project_rec.id);
      
      -- עכשיו מעתיקים את השלבים
      PERFORM copy_stages_to_project_table_v2(project_rec.id);
      RAISE NOTICE 'שלבים הועתקו בהצלחה לפרויקט %', project_rec.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'שגיאה בהעתקת שלבים לפרויקט %: %', project_rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכון הטריגר של יצירת טבלת השלבים כך שישתמש בפונקציה החדשה
CREATE OR REPLACE FUNCTION create_project_stages_table_on_project_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- קריאה לפונקציה ליצירת טבלת שלבים ספציפית לפרויקט
  PERFORM create_project_stages_table(NEW.id);
  
  -- העתקת השלבים מהטבלה הכללית אם ישנם
  PERFORM copy_stages_to_project_table_v2(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- הענקת הרשאות לפונקציות החדשות
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table_v2(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION copy_existing_stages_to_project_tables_v2() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_project_stages_table_on_project_insert() TO anon, authenticated, service_role;

-- הפעלת הפונקציה החדשה להעתקת כל השלבים הקיימים
SELECT copy_existing_stages_to_project_tables_v2(); 