-- פונקציה להרצת שאילתות SQL דינמיות - גרסה מתוקנת
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS JSONB AS $$
DECLARE
  result_text text;
BEGIN
  -- ניסיון להריץ את השאילתה ולקבל תוצאה כטקסט
  BEGIN
    EXECUTE query INTO result_text;
    RETURN jsonb_build_object(
      'success', true,
      'result', result_text
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- אם יש שגיאה בהרצה עם החזרת נתונים, ננסה להריץ ללא החזרת נתונים
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