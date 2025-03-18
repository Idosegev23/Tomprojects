require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAddTaskFunction() {
  console.log('בודק את פונקציית add_tasks_to_project_table...');
  
  const projectId = 'b80c8fef-a677-5340-85fb-2c162d75df03';
  
  // יצירת מערך של משימה אחת לבדיקה
  const newTask = {
    title: "משימת בדיקה חדשה - " + new Date().toISOString(),
    description: "תיאור למשימת בדיקה שנוצרה בתאריך " + new Date().toLocaleString('he-IL'),
    status: "todo",
    priority: "medium",
    project_id: projectId
  };
  
  const tasksArray = [newTask];
  
  console.log('משימה לתוספת:', newTask);
  console.log('\nקורא לפונקציה add_tasks_to_project_table:');
  
  try {
    // ננסה עם מחרוזת JSON
    const jsonString = JSON.stringify(tasksArray);
    console.log('JSON להוספה:', jsonString);
    
    const addResult = await supabase.rpc('add_tasks_to_project_table', { 
      tasks_data: jsonString,
      project_id: projectId
    });
    
    if (addResult.error) {
      console.error('שגיאה:', addResult.error);
    } else {
      console.log('הצליח!', addResult.data);
    }
  } catch (err) {
    console.error('שגיאה כללית:', err);
  }
  
  // בדיקת הטבלה לאחר הניסיון להוסיף משימה
  console.log('\nבודק את הטבלה לאחר ההוספה:');
  const projectTable = `project_${projectId}_tasks`;
  
  const taskResult = await supabase.from(projectTable)
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (taskResult.error) {
    console.error('שגיאה בקריאת הטבלה:', taskResult.error);
  } else {
    console.log('המשימות האחרונות שנוספו:');
    taskResult.data.forEach((task, index) => {
      console.log(`[${index + 1}] ${task.id}: ${task.title} (${task.created_at})`);
    });
  }
}

testAddTaskFunction().catch(console.error); 