// סקריפט להפעלת פקודות ביטול הגבלות הרשאה על טבלת tasks
// הסקריפט מריץ את הפקודות SQL שבמיגרציה באמצעות REST API של סופאבייס

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function fixTasksPermissions() {
  console.log('מתחיל תהליך הסרת הגבלות הרשאה מטבלת המשימות...');

  // מידע התחברות לסופאבייס
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !apiKey) {
    console.error('חסרים נתוני התחברות לסופאבייס בקובץ .env.local');
    process.exit(1);
  }

  // פקודות SQL להסרת הגבלות הרשאה
  const permissionCommands = [
    // ביטול RLS על טבלת tasks הראשית
    "ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Enable read access for all users\" ON public.tasks;",
    "DROP POLICY IF EXISTS \"Enable insert for authenticated users only\" ON public.tasks;",
    "DROP POLICY IF EXISTS \"Enable update for authenticated users only\" ON public.tasks;",
    "DROP POLICY IF EXISTS \"Enable delete for authenticated users only\" ON public.tasks;",

    // הענקת הרשאות גישה מלאות לטבלת tasks
    "GRANT ALL PRIVILEGES ON TABLE public.tasks TO anon;",
    "GRANT ALL PRIVILEGES ON TABLE public.tasks TO authenticated;",
    "GRANT ALL PRIVILEGES ON TABLE public.tasks TO service_role;",

    // וידוא שכל המשתמשים יכולים לקרוא מהטבלה
    "COMMENT ON TABLE public.tasks IS 'טבלת המשימות - כל המשתמשים יכולים לגשת אליה ללא הגבלות';",
  ];

  // שאילתה להסרת RLS מטבלאות הפרויקטים הספציפיות
  const disableRLSForProjectTables = `
    DO $$
    DECLARE
        table_record RECORD;
    BEGIN
        FOR table_record IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'project_%_tasks'
        LOOP
            EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', table_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS select_policy ON public.%I', table_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS insert_policy ON public.%I', table_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS update_policy ON public.%I', table_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS delete_policy ON public.%I', table_record.table_name);
        END LOOP;
    END
    $$;
  `;

  // שאילתה להענקת הרשאות לטבלאות הפרויקטים הספציפיות
  const grantPrivilegesForProjectTables = `
    DO $$
    DECLARE
        project_table RECORD;
    BEGIN
        FOR project_table IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'project_%_tasks'
        LOOP
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO anon', project_table.table_name);
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO authenticated', project_table.table_name);
            EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', project_table.table_name);
        END LOOP;
    END
    $$;
  `;

  // שאילתה להענקת הרשאות לפונקציות
  const grantPrivilegesToFunctions = `
    DO $$
    DECLARE
        func_record RECORD;
    BEGIN
        FOR func_record IN 
            SELECT proname, oidvectortypes(proargtypes) AS argtypes 
            FROM pg_proc 
            WHERE pronamespace = 'public'::regnamespace 
            AND (proname LIKE '%task%' OR proname LIKE '%project%')
        LOOP
            BEGIN
                EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', 
                            func_record.proname, func_record.argtypes);
                EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', 
                            func_record.proname, func_record.argtypes);
                EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', 
                            func_record.proname, func_record.argtypes);
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to grant permissions on function %: %', func_record.proname, SQLERRM;
            END;
        END LOOP;
    END
    $$;
  `;

  // הוספת השאילתות המורכבות
  permissionCommands.push(disableRLSForProjectTables);
  permissionCommands.push(grantPrivilegesForProjectTables);
  permissionCommands.push(grantPrivilegesToFunctions);

  // הרצת כל פקודה בנפרד
  for (const sql of permissionCommands) {
    try {
      console.log(`מריץ פקודה: ${sql.substring(0, 50)}${sql.length > 50 ? '...' : ''}`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: sql
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('  הפקודה הורצה בהצלחה');
      } else {
        console.error('  שגיאה בהרצת הפקודה:', result);
      }
    } catch (error) {
      console.error('  שגיאה בשליחת הבקשה:', error);
    }
  }

  console.log('הסרת הגבלות ההרשאה מטבלת המשימות הושלמה!');
}

// הרצת הפונקציה הראשית
fixTasksPermissions().catch(error => {
  console.error('שגיאה כללית:', error);
  process.exit(1);
}); 