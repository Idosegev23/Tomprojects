-- פונקציה להעתקת שלבים מטבלת stages הכללית לטבלת השלבים הייחודית של הפרויקט
CREATE OR REPLACE FUNCTION copy_stages_to_project(project_id uuid)
RETURNS json AS $$
DECLARE
  stages_table_name text := 'project_' || project_id::text || '_stages';
  stage_rec record;
  copied_count integer := 0;
  general_stages_count integer := 0;
  project_stages_count integer := 0;
  result json;
BEGIN
  -- בדיקה אם הפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id) THEN
    RAISE EXCEPTION 'הפרויקט עם המזהה % לא קיים', project_id;
  END IF;

  -- בדיקה אם טבלת השלבים הייחודית קיימת
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = stages_table_name
  ) THEN
    -- יצירת טבלת השלבים הייחודית אם אינה קיימת
    PERFORM create_project_stages_table(project_id);
  END IF;

  -- ספירת השלבים הכלליים
  SELECT COUNT(*) INTO general_stages_count 
  FROM stages 
  WHERE project_id IS NULL;

  -- ספירת השלבים של הפרויקט הספציפי
  SELECT COUNT(*) INTO project_stages_count 
  FROM stages 
  WHERE project_id = copy_stages_to_project.project_id;

  -- מעבר על כל השלבים בטבלה הכללית שאינם משויכים לפרויקט כלל (שלבים כלליים)
  FOR stage_rec IN SELECT * FROM stages WHERE project_id IS NULL
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
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        hierarchical_number = EXCLUDED.hierarchical_number,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        color = EXCLUDED.color,
        parent_stage_id = EXCLUDED.parent_stage_id,
        dependencies = EXCLUDED.dependencies,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at',
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
      copy_stages_to_project.project_id
    );
    
    copied_count := copied_count + 1;
  END LOOP;
  
  -- מעבר על כל השלבים בטבלה הכללית שמשויכים לפרויקט זה
  FOR stage_rec IN SELECT * FROM stages WHERE project_id = copy_stages_to_project.project_id
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
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        hierarchical_number = EXCLUDED.hierarchical_number,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        color = EXCLUDED.color,
        parent_stage_id = EXCLUDED.parent_stage_id,
        dependencies = EXCLUDED.dependencies,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at',
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
    
    copied_count := copied_count + 1;
  END LOOP;
  
  -- יצירת תוצאת החזרה
  SELECT json_build_object(
    'success', true,
    'project_id', project_id,
    'copied_count', copied_count,
    'general_stages_count', general_stages_count,
    'project_stages_count', project_stages_count,
    'stages_table_name', stages_table_name
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 