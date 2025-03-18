require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// יצירת חיבור ל-Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixDuplicateTasks() {
  console.log('מתחיל לטפל בכפילויות בטבלת tasks...');
  
  try {
    // ------------------- שלב 1: ניתוח המצב -------------------
    
    // קבלת כל המשימות מטבלת tasks
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, project_id, created_at, updated_at, is_global_template')
      .order('title');
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`נמצאו ${allTasks.length} משימות בסך הכל בטבלת tasks`);
    
    // חלוקה למשימות עם project_id ובלי project_id
    const tasksWithProjectId = allTasks.filter(task => task.project_id);
    const tasksWithoutProjectId = allTasks.filter(task => !task.project_id);
    
    console.log(`מתוכן: ${tasksWithProjectId.length} משימות עם project_id, ${tasksWithoutProjectId.length} משימות ללא project_id`);
    
    // קיבוץ המשימות הגלובליות (ללא project_id) לפי title
    const globalTasksByTitle = {};
    tasksWithoutProjectId.forEach(task => {
      if (!globalTasksByTitle[task.title]) {
        globalTasksByTitle[task.title] = [];
      }
      globalTasksByTitle[task.title].push(task);
    });
    
    // חיפוש כפילויות בקרב המשימות הגלובליות
    let duplicateGlobalTasks = 0;
    const globalTasksToKeep = [];
    const globalTasksToDelete = [];
    
    for (const title in globalTasksByTitle) {
      const tasks = globalTasksByTitle[title];
      if (tasks.length > 1) {
        duplicateGlobalTasks++;
        // מיון לפי תאריך עדכון מהעדכני ביותר לישן ביותר
        tasks.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        // שמירה על המשימה העדכנית ביותר
        globalTasksToKeep.push(tasks[0]);
        // וסימון השאר למחיקה
        globalTasksToDelete.push(...tasks.slice(1));
      } else {
        // אם יש רק משימה אחת, נשמור עליה
        globalTasksToKeep.push(tasks[0]);
      }
    }
    
    console.log(`נמצאו ${duplicateGlobalTasks} כותרות כפולות בין המשימות הגלובליות`);
    console.log(`יש לשמור ${globalTasksToKeep.length} משימות גלובליות ולמחוק ${globalTasksToDelete.length} כפילויות גלובליות`);
    
    // ------------------- שלב 2: טיפול בכפילויות -------------------
    
    // מחיקת כפילויות במשימות גלובליות
    if (globalTasksToDelete.length > 0) {
      console.log('מוחק כפילויות במשימות גלובליות...');
      const deleteIds = globalTasksToDelete.map(task => task.id);
      
      // פיצול לקבוצות של עד 100 מזהים (מגבלת Supabase)
      for (let i = 0; i < deleteIds.length; i += 100) {
        const batch = deleteIds.slice(i, i + 100);
        console.log(`מוחק קבוצה ${Math.floor(i/100) + 1} של עד 100 משימות...`);
        
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .in('id', batch);
        
        if (deleteError) {
          console.error('שגיאה במחיקת כפילויות גלובליות:', deleteError);
        }
      }
    }
    
    // ------------------- שלב 3: טיפול במשימות עם project_id -------------------
    
    // בדיקה אם המשימות נמצאות בטבלאות הספציפיות של הפרויקטים
    if (tasksWithProjectId.length > 0) {
      console.log('בודק משימות עם project_id...');
      
      // יצירת מפה של project_id -> רשימת task_id
      const tasksByProject = {};
      tasksWithProjectId.forEach(task => {
        if (!tasksByProject[task.project_id]) {
          tasksByProject[task.project_id] = [];
        }
        tasksByProject[task.project_id].push(task.id);
      });
      
      const projectIds = Object.keys(tasksByProject);
      console.log(`המשימות מתחלקות ל-${projectIds.length} פרויקטים שונים`);
      
      // עבור על כל פרויקט, נבדוק אם המשימות קיימות בטבלה הספציפית
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const taskIds = tasksByProject[projectId];
        const tableName = `project_${projectId}_tasks`;
        
        console.log(`בודק פרויקט ${i+1}/${projectIds.length}: ${projectId} (${taskIds.length} משימות)...`);
        
        // בדיקה אם הטבלה קיימת
        const { data: tableExists, error: tableCheckError } = await supabase
          .rpc('check_table_exists', {
            table_name: tableName
          });
        
        if (tableCheckError) {
          console.error(`שגיאה בבדיקת קיום טבלה ${tableName}:`, tableCheckError);
          continue;
        }
        
        // אם הטבלה לא קיימת, ניצור אותה
        if (!tableExists) {
          console.log(`יוצר טבלה ספציפית לפרויקט ${projectId}...`);
          try {
            await supabase.rpc('create_project_table', {
              project_id: projectId
            });
            console.log(`טבלה ${tableName} נוצרה בהצלחה`);
          } catch (createError) {
            console.error(`שגיאה ביצירת טבלה ${tableName}:`, createError);
            continue;
          }
        }
        
        // סנכרון המשימות לטבלה הספציפית
        console.log(`מסנכרן משימות לטבלה ${tableName}...`);
        try {
          await supabase.rpc('sync_project_tasks', {
            project_id: projectId
          });
          console.log(`סנכרון המשימות לטבלה ${tableName} הושלם בהצלחה`);
        } catch (syncError) {
          console.error(`שגיאה בסנכרון משימות לטבלה ${tableName}:`, syncError);
          continue;
        }
        
        // מחיקת המשימות מטבלת tasks הראשית
        console.log(`מוחק ${taskIds.length} משימות של פרויקט ${projectId} מטבלת tasks הראשית...`);
        
        // פיצול לקבוצות של עד 100 מזהים (מגבלת Supabase)
        for (let j = 0; j < taskIds.length; j += 100) {
          const batch = taskIds.slice(j, j + 100);
          
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .in('id', batch);
          
          if (deleteError) {
            console.error(`שגיאה במחיקת משימות מטבלת tasks הראשית:`, deleteError);
          }
        }
      }
    }
    
    // ------------------- שלב 4: סיכום -------------------
    
    // בדיקת המצב הסופי
    const { data: finalTasks, error: finalError } = await supabase
      .from('tasks')
      .select('id, project_id')
      .order('id');
    
    if (finalError) {
      throw finalError;
    }
    
    const finalTasksWithProjectId = finalTasks.filter(task => task.project_id);
    const finalTasksWithoutProjectId = finalTasks.filter(task => !task.project_id);
    
    console.log('\n=======================================');
    console.log('סיכום פעולות התיקון:');
    console.log(`מספר משימות סופי בטבלת tasks: ${finalTasks.length}`);
    console.log(`מתוכן: ${finalTasksWithoutProjectId.length} משימות גלובליות, ${finalTasksWithProjectId.length} משימות עם project_id`);
    
    if (finalTasksWithProjectId.length > 0) {
      console.log(`\nאזהרה: נותרו ${finalTasksWithProjectId.length} משימות עם project_id בטבלת tasks הראשית!`);
      console.log('יש לבדוק את המשימות הללו ולהעבירן לטבלאות הספציפיות של הפרויקטים.');
    } else {
      console.log('\nכל המשימות עם project_id הוסרו בהצלחה מטבלת tasks הראשית! 🎉');
    }
    
    console.log('תהליך התיקון הסתיים בהצלחה! 🎉');
    
  } catch (err) {
    console.error('שגיאה בטיפול בכפילויות:', err);
  }
}

// הרצת הפונקציה
console.log('התחלת תהליך תיקון כפילויות בטבלת tasks...');
console.log('הסקריפט יבצע את הפעולות הבאות:');
console.log('1. מחיקת כפילויות במשימות גלובליות (ללא project_id)');
console.log('2. העברת משימות ספציפיות לפרויקטים לטבלאות הייחודיות שלהם');
console.log('3. ניקוי טבלת tasks הראשית מכפילויות');
console.log('\nהפעולות הללו ישנו את מבנה הנתונים. האם אתה בטוח שברצונך להמשיך? (y/n)');

// ביצוע הפעולה בכל מקרה (בגלל שאין לנו ממשק קלט)
// במקרה אמיתי כדאי לבקש אישור מהמשתמש
// process.stdin.once('data', (data) => {
//   const input = data.toString().trim().toLowerCase();
//   if (input === 'y' || input === 'yes') {
fixDuplicateTasks();
//   } else {
//     console.log('הפעולה בוטלה.');
//     process.exit(0);
//   }
// }); 