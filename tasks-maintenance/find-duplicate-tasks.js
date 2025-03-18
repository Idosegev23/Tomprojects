// סקריפט לאיתור כפילויות בטבלת tasks על פי שדה title
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// יצירת חיבור ל-Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findDuplicateTasks() {
  console.log('מתחיל לחפש כפילויות בטבלת tasks...');
  
  try {
    // קבלת כל המשימות מטבלת tasks
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, project_id, created_at, updated_at')
      .order('title');
    
    if (error) {
      throw error;
    }
    
    console.log(`נמצאו ${tasks.length} משימות בסך הכל בטבלה`);
    
    // קיבוץ המשימות לפי title
    const tasksByTitle = {};
    tasks.forEach(task => {
      if (!tasksByTitle[task.title]) {
        tasksByTitle[task.title] = [];
      }
      tasksByTitle[task.title].push(task);
    });
    
    // מציאת כפילויות
    let duplicateCount = 0;
    let duplicatesFound = false;
    const duplicates = {};
    
    for (const title in tasksByTitle) {
      if (tasksByTitle[title].length > 1) {
        duplicatesFound = true;
        duplicates[title] = tasksByTitle[title];
        duplicateCount += tasksByTitle[title].length - 1; // מספר הכפילויות (מעבר למקור)
      }
    }
    
    if (duplicatesFound) {
      console.log(`🚨 נמצאו ${duplicateCount} כפילויות בטבלת tasks!`);
      console.log('להלן רשימת הכפילויות לפי כותרת:');
      console.log('=======================================');
      
      // הדפסת הכפילויות עם פירוט
      for (const title in duplicates) {
        const items = duplicates[title];
        console.log(`\nכותרת: "${title}" (${items.length} פריטים):`);
        items.forEach((task, index) => {
          console.log(`  ${index + 1}. ID: ${task.id}, פרויקט: ${task.project_id || 'ללא פרויקט'}, נוצר: ${new Date(task.created_at).toLocaleString('he-IL')}`);
        });
      }
      
      // הצעת פתרון
      console.log('\n=======================================');
      console.log('המלצה:');
      console.log('כדי לתקן את הכפילויות, רצוי:');
      console.log('1. להשאיר רק את המשימות שהן גלובליות (ללא project_id)');
      console.log('2. או להשאיר רק את המשימות המעודכנות ביותר בכל קבוצת כפילויות');
      console.log('3. לוודא שכל המשימות הספציפיות לפרויקט נמצאות רק בטבלאות הייחודיות של הפרויקטים');
      
      // שאלה אם לתקן את הכפילויות
      console.log('\nהאם ברצונך להפעיל את סקריפט תיקון הכפילויות? (y/n)');
      process.stdin.once('data', (data) => {
        const input = data.toString().trim().toLowerCase();
        if (input === 'y' || input === 'yes') {
          console.log('מפעיל את סקריפט תיקון הכפילויות...');
          // הפעלת הסקריפט השני
          require('./fix-duplicate-tasks');
        } else {
          console.log('ביטול הפעלת סקריפט התיקון.');
          process.exit(0);
        }
      });
    } else {
      console.log('✅ לא נמצאו כפילויות בטבלת tasks!');
    }
  } catch (err) {
    console.error('שגיאה בחיפוש כפילויות:', err);
  }
}

// הרצת הפונקציה
findDuplicateTasks(); 