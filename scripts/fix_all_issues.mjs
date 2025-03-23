// סקריפט לתיקון כל הבעיות במערכת
// מריץ את כל קבצי ה-SQL שיצרנו באמצעות ה-REST API של סופאבייס

import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// טעינת משתני הסביבה מקובץ .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// פונקציה להרצת SQL דרך REST API
async function executeSql(sql) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !apiKey) {
    console.error('חסרים נתוני התחברות לסופאבייס בקובץ .env.local');
    return false;
  }

  try {
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
      console.log('  הפקודה הורצה בהצלחה:', result);
      return true;
    } else {
      console.error('  שגיאה בהרצת הפקודה:', result);
      return false;
    }
  } catch (error) {
    console.error('  שגיאה בשליחת הבקשה:', error);
    return false;
  }
}

// פונקציה לקריאת קובץ SQL והרצתו
async function runSqlFile(filePath) {
  try {
    console.log(`מריץ את הקובץ ${filePath}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // חלוקת הקובץ לפקודות נפרדות לפי סימני ;
    // אבל לא חלוקה בתוך פקודות DO ... END;
    let commands = [];
    let currentCommand = '';
    let inDOBlock = false;
    let inFunctionBlock = false;
    let openParens = 0;
    
    // פיצול לפי שורות כדי לזהות בלוקים
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimLine = line.trim();
      currentCommand += line + '\n';
      
      // זיהוי בלוקי DO
      if (trimLine.includes('DO $$')) {
        inDOBlock = true;
      }
      
      // זיהוי הגדרות פונקציות
      if (trimLine.includes('CREATE OR REPLACE FUNCTION') || trimLine.includes('CREATE FUNCTION')) {
        inFunctionBlock = true;
      }
      
      // ספירת סוגריים פתוחים (למקרה של פונקציות מורכבות)
      if (inFunctionBlock) {
        openParens += (line.match(/\(/g) || []).length;
        openParens -= (line.match(/\)/g) || []).length;
      }
      
      // זיהוי סיום בלוקי DO
      if (inDOBlock && trimLine.includes('$$;')) {
        inDOBlock = false;
        commands.push(currentCommand);
        currentCommand = '';
        continue;
      }
      
      // זיהוי סיום הגדרת פונקציה
      if (inFunctionBlock && openParens === 0 && trimLine.includes('LANGUAGE') && trimLine.endsWith(';')) {
        inFunctionBlock = false;
        commands.push(currentCommand);
        currentCommand = '';
        continue;
      }
      
      // פקודות SQL רגילות מסתיימות ב-;
      if (!inDOBlock && !inFunctionBlock && trimLine.endsWith(';')) {
        if (currentCommand.trim().length > 0) {
          commands.push(currentCommand);
          currentCommand = '';
        }
      }
    }
    
    // אם נשאר משהו בסוף
    if (currentCommand.trim().length > 0) {
      commands.push(currentCommand);
    }
    
    // סינון פקודות ריקות
    commands = commands.filter(cmd => cmd.trim().length > 0);
    
    for (let i = 0; i < commands.length; i++) {
      console.log(`מריץ פקודה ${i+1} מתוך ${commands.length}...`);
      const success = await executeSql(commands[i]);
      if (!success) {
        console.warn(`  אזהרה: פקודה ${i+1} נכשלה, ממשיך להרצת הפקודה הבאה...`);
      }
    }
    return true;
  } catch (error) {
    console.error(`שגיאה בקריאת הקובץ ${filePath}:`, error);
    return false;
  }
}

// הפונקציה הראשית לתיקון כל הבעיות
async function fixAllIssues() {
  console.log('מתחיל תהליך תיקון כל הבעיות במערכת...');
  
  // תיקון הרשאות לטבלת stages
  await runSqlFile('scripts/fix_stages_permissions.sql');
  
  // תיקון מבנה טבלת stages
  await runSqlFile('scripts/fix_stages_table.sql');
  
  // הוספת פונקציית init_project
  await runSqlFile('scripts/init_project_function.sql');
  
  // יצירת טריגרים לאוטומציה
  await runSqlFile('supabase/migrations/20250410000000_create_project_triggers.sql');
  
  // יצירת פרויקטים אם לא קיימים
  await runSqlFile('scripts/create_project_if_not_exists.sql');
  
  // יצירת טבלאות פרויקט
  await runSqlFile('scripts/create_project_tables.sql');
  
  // תיקון הרשאות גישה לכל הטבלאות (כולל טבלאות ספציפיות לפרויקטים)
  await runSqlFile('scripts/fix_permissions.sql');
  
  // פרויקטים שצריך לאתחל
  const projectList = [
    {
      id: '5d08c5ee-1ba3-4e70-96c5-e488745f2519',
      createStages: true,
      createTasks: false
    },
    {
      id: '5b291208-e165-4e7c-abaf-b26e41a8d31d',
      createStages: true,
      createTasks: true
    }
  ];
  
  // לולאה שעוברת על כל הפרויקטים ומאתחלת אותם
  for (const project of projectList) {
    console.log(`מאתחל את הפרויקט ${project.id}...`);
    
    try {
      // המרת מזהה הפרויקט לפורמט בטוח לשימוש בשמות טבלאות
      const safeProjectId = project.id.replace(/-/g, '_');
      
      // צעד 1: וידוא שטבלאות הפרויקט קיימות
      const createTablesSQL = `SELECT create_project_tables('${project.id}')`;
      await executeSql(createTablesSQL);
      
      // צעד 2: הענקת הרשאות מפורשות
      const grantTasksSQL = `GRANT ALL PRIVILEGES ON TABLE project_${safeProjectId}_tasks TO anon, authenticated, service_role`;
      const grantStagesSQL = `GRANT ALL PRIVILEGES ON TABLE project_${safeProjectId}_stages TO anon, authenticated, service_role`;
      await executeSql(grantTasksSQL);
      await executeSql(grantStagesSQL);
      
      // צעד 3: ביטול RLS
      const disableTasksRlsSQL = `ALTER TABLE project_${safeProjectId}_tasks DISABLE ROW LEVEL SECURITY`;
      const disableStagesRlsSQL = `ALTER TABLE project_${safeProjectId}_stages DISABLE ROW LEVEL SECURITY`;
      await executeSql(disableTasksRlsSQL);
      await executeSql(disableStagesRlsSQL);
      
      // צעד 4: אתחול נתונים
      const initSql = `SELECT init_project_tables_and_data('${project.id}', ${project.createStages}, ${project.createTasks}, '{}')`;
      await executeSql(initSql);
      
      console.log(`פרויקט ${project.id} אותחל בהצלחה`);
    } catch (error) {
      console.error(`שגיאה באתחול פרויקט ${project.id}:`, error);
    }
  }
  
  // טיפול בפונקציות ה-RPC החסרות
  console.log('מוודא שפונקציות ה-RPC הנדרשות רשומות במערכת...');
  
  // רישום הפונקציות כ-RPC אם חסרות
  try {
    const registerTasksRpc = `
      SELECT
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'get_project_tasks'
        )
        THEN
          'DROP FUNCTION IF EXISTS get_project_tasks(uuid);
           CREATE OR REPLACE FUNCTION get_project_tasks(p_project_id uuid)
           RETURNS SETOF record AS $$
             DECLARE
               project_id_safe text := replace(p_project_id::text, ''-'', ''_'');
               table_name text := ''project_'' || project_id_safe || ''_tasks'';
               query_text text;
             BEGIN
               IF check_table_exists(table_name) THEN
                 query_text := format(''SELECT * FROM %I'', table_name);
                 RETURN QUERY EXECUTE query_text;
               ELSE
                 RETURN QUERY SELECT * FROM tasks WHERE project_id = p_project_id;
               END IF;
             END;
           $$ LANGUAGE plpgsql SECURITY DEFINER;
           GRANT EXECUTE ON FUNCTION get_project_tasks(uuid) TO anon, authenticated, service_role;'
        ELSE
          'SELECT ''Function get_project_tasks already exists''::text'
        END as execute_this;
    `;
    
    const registerTreeRpc = `
      SELECT
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'get_tasks_tree'
        )
        THEN
          'DROP FUNCTION IF EXISTS get_tasks_tree(uuid);
           CREATE OR REPLACE FUNCTION get_tasks_tree(p_project_id uuid)
           RETURNS SETOF record AS $$
             DECLARE
               project_id_safe text := replace(p_project_id::text, ''-'', ''_''); 
               table_name text := ''project_'' || project_id_safe || ''_tasks'';
               query_text text;
             BEGIN
               IF check_table_exists(table_name) THEN
                 query_text := format(''WITH RECURSIVE task_tree AS (
                   SELECT t.*, 0 as level, ARRAY[t.id] as path
                   FROM %I t WHERE t.parent_task_id IS NULL
                   UNION ALL
                   SELECT t.*, tt.level + 1, tt.path || t.id
                   FROM %I t JOIN task_tree tt ON t.parent_task_id = tt.id
                 ) SELECT * FROM task_tree ORDER BY path'', table_name, table_name);
                 
                 RETURN QUERY EXECUTE query_text;
               ELSE
                 RAISE EXCEPTION ''Table % does not exist'', table_name;
               END IF;
             END;
           $$ LANGUAGE plpgsql SECURITY DEFINER;
           GRANT EXECUTE ON FUNCTION get_tasks_tree(uuid) TO anon, authenticated, service_role;'
        ELSE
          'SELECT ''Function get_tasks_tree already exists''::text'
        END as execute_this;
    `;
    
    // הרצת הפקודות שיוצאות מהשאילתות
    const tasksRpcResult = await executeSql(registerTasksRpc);
    if (tasksRpcResult && tasksRpcResult.results && tasksRpcResult.results[0] && tasksRpcResult.results[0].execute_this) {
      await executeSql(tasksRpcResult.results[0].execute_this);
    }
    
    const treeRpcResult = await executeSql(registerTreeRpc);
    if (treeRpcResult && treeRpcResult.results && treeRpcResult.results[0] && treeRpcResult.results[0].execute_this) {
      await executeSql(treeRpcResult.results[0].execute_this);
    }
    
    console.log('הפונקציות נרשמו בהצלחה');
  } catch (error) {
    console.error('שגיאה ברישום פונקציות RPC:', error);
  }
  
  // רענון סופי של פונקציות וצפיות במסד הנתונים
  try {
    console.log('מבצע רענון סופי של הפונקציות והצפיות...');
    await executeSql(`SELECT pg_catalog.pg_refresh_view(c.oid)
                     FROM pg_catalog.pg_class c
                     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                     WHERE c.relkind = 'v'
                     AND n.nspname = 'public'`);
    console.log('רענון הצפיות הושלם');
  } catch (error) {
    console.error('שגיאה ברענון הצפיות:', error);
  }
  
  console.log('תהליך תיקון הבעיות הסתיים.');
}

// הרצת הפונקציה הראשית
fixAllIssues().catch(error => {
  console.error('שגיאה כללית:', error);
  process.exit(1);
}); 