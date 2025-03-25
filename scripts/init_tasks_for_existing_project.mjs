import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// יצירת ממשק שאלות למשתמש
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// פונקציה לקבלת קלט מהמשתמש עם הבטחות
function question(query) {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

async function initTasksForExistingProject() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('כלי לאתחול משימות בפרויקט קיים');
  console.log('===================================');
  
  // קבלת מזהה הפרויקט מהמשתמש
  const projectId = await question('הכנס את מזהה הפרויקט (UUID): ');
  if (!projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.error('מזהה הפרויקט אינו בפורמט UUID תקין!');
    rl.close();
    return;
  }

  console.log(`\nמאחזר משימות זמינות מטבלת tasks...`);
  // קבלת כל המשימות הזמינות מטבלת tasks
  try {
    const tasksResponse = await fetch(`${supabaseUrl}/rest/v1/tasks?select=id,title,description&limit=50`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`שגיאה בקבלת המשימות: ${await tasksResponse.text()}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`נמצאו ${tasks.length} משימות בטבלת tasks.`);
    
    // הצגת המשימות בפורמט מספור עם פרטים חשובים
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - ${task.id}`);
      console.log(`   ${task.description?.substring(0, 70) || '(אין תיאור)'} ${task.description?.length > 70 ? '...' : ''}`);
    });
    
    // בחירת המשימות על ידי המשתמש
    console.log('\nבחר משימות להוסיף לפרויקט (הכנס מספרים מופרדים בפסיק, למשל: 1,3,5):');
    const selectedIndicesStr = await question('בחירתך: ');
    
    // המרת בחירת המשתמש למערך של מזהי משימות
    const selectedIndices = selectedIndicesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= tasks.length);
    const selectedTaskIds = selectedIndices.map(index => tasks[index - 1].id);
    
    if (selectedTaskIds.length === 0) {
      console.log('לא נבחרו משימות. התהליך הופסק.');
      rl.close();
      return;
    }
    
    console.log(`\nנבחרו ${selectedTaskIds.length} משימות: ${selectedIndices.join(', ')}`);
    console.log('מזהי המשימות הנבחרות:');
    console.log(JSON.stringify(selectedTaskIds));
    
    // אישור סופי לפני אתחול המשימות
    const confirmation = await question('\nהאם להמשיך באתחול המשימות בפרויקט? (כן/לא): ');
    if (confirmation.toLowerCase() !== 'כן' && confirmation.toLowerCase() !== 'yes') {
      console.log('התהליך בוטל על ידי המשתמש.');
      rl.close();
      return;
    }
    
    // הרצת פונקציית אתחול הפרויקט עם המשימות הנבחרות
    console.log(`\nמאתחל טבלאות הפרויקט ${projectId} עם ${selectedTaskIds.length} משימות...`);
    
    const initResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/init_project_tables_and_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        project_id: projectId,
        create_default_stages: true,
        create_default_tasks: true,
        selected_task_ids: selectedTaskIds
      })
    });
    
    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      throw new Error(`שגיאה באתחול הפרויקט: ${errorText}`);
    }
    
    console.log('✅ טבלאות הפרויקט אותחלו בהצלחה עם המשימות הנבחרות!');
    
    // בדיקה שהמשימות אכן הועתקו
    console.log('\nבודק שהמשימות אכן הועתקו לטבלת המשימות של הפרויקט...');
    
    const projectTasksResponse = await fetch(`${supabaseUrl}/rest/v1/project_${projectId}_tasks?select=id,title,description,status,stage_id`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!projectTasksResponse.ok) {
      const errorText = await projectTasksResponse.text();
      throw new Error(`שגיאה בבדיקת משימות הפרויקט: ${errorText}`);
    }
    
    const projectTasks = await projectTasksResponse.json();
    console.log(`נמצאו ${projectTasks.length} משימות בטבלת המשימות של הפרויקט.`);
    
    if (projectTasks.length > 0) {
      console.log('\nהמשימות שהועתקו:');
      projectTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.title} - ${task.id}`);
        console.log(`   סטטוס: ${task.status || '(לא מוגדר)'}, שלב: ${task.stage_id || '(לא מוגדר)'}`);
      });
    } else {
      console.log('❌ לא נמצאו משימות בטבלת המשימות של הפרויקט! יתכן שיש בעיה באתחול.');
    }
    
  } catch (error) {
    console.error('שגיאה:', error.message);
  } finally {
    rl.close();
  }
}

// הרצת הפונקציה הראשית
initTasksForExistingProject(); 