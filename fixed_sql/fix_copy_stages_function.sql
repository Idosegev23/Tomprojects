-- מחיקת הפונקציה הקיימת
DROP FUNCTION IF EXISTS copy_stages_to_project_table(uuid);

-- יצירת הפונקציה מחדש עם פתרון לאמביגואליות
CREATE OR REPLACE FUNCTION copy_stages_to_project_table(project_id_param uuid)
RETURNS void AS $$
DECLARE
  stages_table_name text := 'project_' || project_id_param::text || '_stages';
  stage_rec record;
BEGIN
  -- בדיקה אם הטבלה קיימת
  IF NOT check_table_exists(stages_table_name) THEN
    -- יצירת טבלת שלבים חדשה
    PERFORM create_project_stages_table(project_id_param);
  END IF;
  
  -- העתקת שלבים מהטבלה הראשית - פתרון אמביגואליות בעמודת project_id
  -- שימוש בשם המתאים בפקודת ה-SELECT ובתנאי ה-WHERE
  FOR stage_rec IN 
    SELECT 
      s.id, s.title, s.description, s.color, s.status, s.progress, 
      s.order_num, s.created_at, s.updated_at, s.project_id
    FROM 
      stages s
    WHERE 
      s.project_id = project_id_param OR s.project_id IS NULL
  LOOP
    -- ניסיון להעתיק את השלב לטבלת הפרויקט
    BEGIN
      EXECUTE format('
        INSERT INTO %I (
          id, project_id, title, description, color, status, progress, order_num, created_at, updated_at
        ) VALUES (
          %L, %L, %L, %L, %L, %L, %L, %L, %L, %L
        )
        ON CONFLICT (id) DO NOTHING
      ', 
        stages_table_name,
        stage_rec.id, project_id_param, stage_rec.title, stage_rec.description, 
        stage_rec.color, stage_rec.status, stage_rec.progress, stage_rec.order_num,
        stage_rec.created_at, stage_rec.updated_at
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error copying stage % to project stages table: %', stage_rec.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Stages copied to project table % successfully', stages_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION copy_stages_to_project_table(uuid) TO anon, authenticated, service_role; 