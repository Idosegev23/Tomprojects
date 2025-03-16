-- פונקציה להרצת שאילתות SQL דינמיות
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- ניסיון להריץ את השאילתה ללא החזרת נתונים
  BEGIN
    EXECUTE query;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Query executed successfully'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- אם יש שגיאה, ננסה לבדוק אם זו שאילתה שמחזירה נתונים
      BEGIN
        EXECUTE query INTO result;
        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'query', query
          );
      END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 