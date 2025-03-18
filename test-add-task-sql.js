require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addTaskWithSQL() {
  console.log('מוסיף משימה חדשה באמצעות SQL ישיר...');
  
  const projectId = 'b80c8fef-a677-5340-85fb-2c162d75df03';
  const projectTable = `project_${projectId}_tasks`;
  const timestamp = new Date().toISOString();
  
  // יצירת משימה חדשה באמצעות SQL
  const sqlQuery = `
    INSERT INTO "${projectTable}" 
      (title, description, status, priority, project_id) 
    VALUES 
      ('משימה חדשה דרך SQL - ${timestamp}', 
       'תיאור משימה שנוצרה בתאריך ${new Date().toLocaleString('he-IL')}', 
       'todo', 'medium', '${projectId}')
    RETURNING id, title, created_at;
  `;
  
  console.log('מריץ SQL:');
  console.log(sqlQuery);
  
  const sqlResult = await supabase.rpc('exec_sql', { query: sqlQuery });
  
  if (sqlResult.error) {
    console.error('שגיאה בהרצת SQL:', sqlResult.error);
  } else {
    console.log('משימה נוספה בהצלחה:', sqlResult.data);
  }
  
  // בדיקת המשימות האחרונות שנוספו לטבלה
  console.log('\nבודק את המשימות האחרונות בטבלה:');
  
  const taskResult = await supabase.from(projectTable)
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (taskResult.error) {
    console.error('שגיאה בקריאת הטבלה:', taskResult.error);
  } else {
    console.log('המשימות האחרונות:');
    taskResult.data.forEach((task, index) => {
      console.log(`[${index + 1}] ${task.id}: ${task.title} (${task.created_at})`);
    });
  }
  
  // בדיקת מספר המשימות הכולל בטבלה
  const countResult = await supabase.from(projectTable).select('*', { count: 'exact', head: true });
  
  if (countResult.error) {
    console.error('שגיאה בספירת משימות:', countResult.error);
  } else {
    console.log(`\nסה"כ משימות בטבלה: ${countResult.count}`);
  }
}

addTaskWithSQL().catch(console.error); 