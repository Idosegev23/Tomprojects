-- migration_name: 20251002000000_add_rpc_to_update_build_tracking
-- description: הוספת פונקציית RPC לעדכון שדה build_tracking

DO $$ 
BEGIN
  RAISE NOTICE '----- הוספת פונקציות RPC לעדכון build_tracking -----';
END $$;

-- ========================================================
-- 1. הוספת פונקציית RPC לעדכון שדה build_tracking
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
-- 2. הוספת פונקציית RPC לשליפת שדה build_tracking
-- ========================================================
CREATE OR REPLACE FUNCTION get_build_tracking(
  project_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  tracking_data jsonb;
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
  SELECT build_tracking INTO tracking_data 
  FROM projects 
  WHERE id = project_id_param;

  -- החזרת תוצאה
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'build_tracking', COALESCE(tracking_data, '{}'::jsonb)
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
-- 3. הענקת הרשאות לפונקציות החדשות
-- ========================================================
GRANT EXECUTE ON FUNCTION update_build_tracking(uuid, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_build_tracking(uuid) TO anon, authenticated, service_role;

DO $$ 
BEGIN
  RAISE NOTICE '----- הוספת פונקציות RPC לעדכון build_tracking הושלמה בהצלחה -----';
END $$; 