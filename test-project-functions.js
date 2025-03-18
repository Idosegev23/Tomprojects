require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testProjectFunctions() {
  console.log('בודק פונקציות של פרויקט...');
  
  // 1. בדיקת הפונקציה sync_project_tasks
  const projectId = 'b80c8fef-a677-5340-85fb-2c162d75df03';
  console.log(`1. קורא לפונקציה sync_project_tasks עבור פרויקט ${projectId}:`);
  
  const syncResult = await supabase.rpc('sync_project_tasks', { p_project_id: projectId });
  console.log('תוצאת הסנכרון:', syncResult.error ? `שגיאה: ${syncResult.error.message}` : 'הצליח');
  
  // 2. בדיקת טבלת המשימות של הפרויקט לאחר הסנכרון
  const projectTable = `project_${projectId}_tasks`;
  console.log(`\n2. קריאת נתונים מטבלת פרויקט ${projectTable} לאחר סנכרון:`);
  
  const taskResult = await supabase.from(projectTable).select('*');
  console.log(`נמצאו ${taskResult.data ? taskResult.data.length : 0} משימות בטבלת הפרויקט`);
  
  if (taskResult.error) {
    console.error('שגיאה בקריאת טבלת הפרויקט:', taskResult.error);
  }

  // 3. בדיקת פעולות SQL ישירות על טבלת הפרויקט
  console.log('\n3. בדיקת פעולות SQL ישירות:');
  
  // הוספת משימה חדשה ישירות עם SQL
  const sqlQuery = `
    INSERT INTO "project_${projectId}_tasks" 
      (title, description, status, priority, project_id) 
    VALUES 
      ('משימת SQL ישירה - ${new Date().toISOString()}', 
       'תיאור למשימה שנוצרה דרך SQL בתאריך ${new Date().toLocaleString('he-IL')}', 
       'todo', 'medium', '${projectId}')
    RETURNING id, title;
  `;
  
  const sqlResult = await supabase.rpc('exec_sql', { query: sqlQuery });
  
  if (sqlResult.error) {
    console.error('שגיאה בהרצת SQL:', sqlResult.error);
  } else {
    console.log('תוצאת הוספת המשימה עם SQL:', sqlResult.data);
  }
  
  // 4. בדיקת קריאת משימות הפרויקט ישירות מהטבלה
  console.log('\n4. קריאת משימות ישירות מטבלת הפרויקט:');
  
  const directQueryResult = await supabase.from(projectTable).select('id, title, status').limit(5);
  
  if (directQueryResult.error) {
    console.error('שגיאה בקריאת משימות ישירות:', directQueryResult.error);
  } else {
    console.log(`נמצאו ${directQueryResult.data.length} משימות בפרויקט. דוגמאות:`);
    directQueryResult.data.forEach((task, index) => {
      console.log(`[${index + 1}] ${task.id}: ${task.title} (${task.status})`);
    });
  }
}

testProjectFunctions().catch(console.error); 