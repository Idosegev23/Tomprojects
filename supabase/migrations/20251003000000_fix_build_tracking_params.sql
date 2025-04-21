-- migration_name: 20251003000000_fix_build_tracking_params
-- description: תיקון שמות פרמטרים בפונקציות build_tracking

DO $$ 
BEGIN
  RAISE NOTICE '----- תיקון שמות פרמטרים בפונקציות build_tracking -----';
END $$;

-- ========================================================
-- 1. תיקון פונקציית get_build_tracking
-- ========================================================
CREATE OR REPLACE FUNCTION get_build_tracking(
  p_project_id uuid
)
RETURNS jsonb AS $$
DECLARE
  tracking_data jsonb;
BEGIN
  -- בדיקה שהפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'פרויקט לא קיים',
      'project_id', p_project_id
    );
  END IF;

  -- שליפת ערך ה-build_tracking הנוכחי
  SELECT build_tracking INTO tracking_data 
  FROM projects 
  WHERE id = p_project_id;

  -- החזרת תוצאה
  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'build_tracking', COALESCE(tracking_data, '{}'::jsonb)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 2. תיקון פונקציית update_build_tracking
-- ========================================================
CREATE OR REPLACE FUNCTION update_build_tracking(
  project_id_param uuid,
  tracking_data jsonb
)
RETURNS jsonb AS $$
DECLARE
  updated_project record;
  current_data jsonb;
BEGIN
  -- בדיקה שהפרויקט קיים
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_param) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'פרויקט לא קיים',
      'project_id', project_id_param
    );
  END IF;

  -- שליפת ערך ה-build_tracking הנוכחי
  SELECT build_tracking INTO current_data 
  FROM projects 
  WHERE id = project_id_param;

  -- עדכון שדה build_tracking
  UPDATE projects
  SET 
    build_tracking = CASE 
      WHEN current_data IS NULL THEN tracking_data
      ELSE current_data || tracking_data
    END,
    updated_at = now()
  WHERE id = project_id_param
  RETURNING * INTO updated_project;

  -- החזרת תוצאה
  RETURN jsonb_build_object(
    'success', true,
    'message', 'שדה build_tracking עודכן בהצלחה',
    'project_id', project_id_param,
    'build_tracking', updated_project.build_tracking
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'project_id', project_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 3. הענקת הרשאות לפונקציות המעודכנות
-- ========================================================
GRANT EXECUTE ON FUNCTION get_build_tracking(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_build_tracking(uuid, jsonb) TO anon, authenticated, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '----- תיקון שמות פרמטרים בפונקציות build_tracking הושלם בהצלחה -----';
END $$; 