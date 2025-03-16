-- פונקציה להרצת שאילתות SQL דינמיות - גרסה מתוקנת שמחזירה תוצאות מרובות
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS JSONB AS $$
DECLARE
  result_json jsonb;
BEGIN
  -- ניסיון להריץ את השאילתה ולקבל תוצאה כ-JSON
  BEGIN
    EXECUTE 'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (' || query || ') t' INTO result_json;
    
    IF result_json IS NULL THEN
      -- אם אין תוצאות, ננסה להריץ את השאילתה ללא החזרת נתונים
      EXECUTE query;
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Query executed successfully, no results returned'
      );
    ELSE
      -- אם יש תוצאות, נחזיר אותן
      RETURN jsonb_build_object(
        'success', true,
        'results', result_json
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- אם יש שגיאה, ננסה להריץ את השאילתה ללא החזרת נתונים
      BEGIN
        EXECUTE query;
        RETURN jsonb_build_object(
          'success', true,
          'message', 'Query executed successfully'
        );
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