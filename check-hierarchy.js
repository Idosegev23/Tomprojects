// סקריפט לבדיקת המבנה ההיררכי של המשימות
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('חסרים פרטי התחברות לסופאבייס בקובץ .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTaskHierarchy() {
  try {
    // שאילתה לקבלת כל המשימות במבנה היררכי
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, hierarchical_number, parent_task_id, category, stage_id')
      .eq('deleted', false)
      .not('hierarchical_number', 'is', null)
      .order('hierarchical_number')
      .limit(100); // הגבלה למניעת עומס יתר
    
    if (error) {
      console.error('שגיאה בקריאת המשימות:', error);
      return;
    }
    
    // הצג רק את המשימות עם מספור היררכי תקין
    const validTasks = data.filter(task => task.hierarchical_number && task.hierarchical_number.trim() !== '');
    
    // אם אין נתונים, סיים
    if (validTasks.length === 0) {
      console.log('לא נמצאו משימות עם מספור היררכי תקין.');
      return;
    }
    
    // הצג את המבנה ההיררכי
    console.log(`מבנה היררכי של המשימות (מוצגות ${validTasks.length} משימות):`);
    console.log('==========================');
    
    // יצירת מילון משימות לפי ID לשימוש מהיר
    const tasksById = {};
    validTasks.forEach(task => {
      tasksById[task.id] = task;
    });
    
    // קבוצת משימות האב (ללא הורה)
    const rootTasks = validTasks.filter(task => !task.parent_task_id);
    console.log(`נמצאו ${rootTasks.length} משימות אב ראשיות`);
    
    // הצג רק את משימות האב ומשימות הרמה הראשונה תחתיהן
    rootTasks.forEach(rootTask => {
      // הצג את משימת האב
      console.log(`\n[${rootTask.hierarchical_number}] ${rootTask.title} (${rootTask.category})`);
      console.log(`   ID: ${rootTask.id}`);
      console.log('   Parent: None - משימת אב ראשית');
      console.log('---');
      
      // מצא את כל המשימות הישירות תחת משימת האב
      const childTasks = validTasks.filter(task => task.parent_task_id === rootTask.id);
      
      // הצג עד 5 משימות ילד לכל משימת אב
      childTasks.slice(0, 5).forEach(childTask => {
        console.log(`  [${childTask.hierarchical_number}] ${childTask.title} (${childTask.category})`);
        console.log(`     ID: ${childTask.id}`);
        console.log(`     Parent: ${childTask.parent_task_id}`);
        console.log('  ---');
      });
      
      // אם יש יותר מ-5 משימות ילד, הצג הודעה
      if (childTasks.length > 5) {
        console.log(`  ... עוד ${childTasks.length - 5} משימות נוספות`);
      }
    });
    
    // סיכום סטטיסטי
    console.log('\nסיכום:');
    console.log('======');
    
    // מספר משימות לפי קטגוריה
    const categoryCounts = {};
    validTasks.forEach(task => {
      categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
    });
    
    console.log('משימות לפי קטגוריה:');
    Object.keys(categoryCounts).sort().forEach(category => {
      console.log(`- ${category}: ${categoryCounts[category]} משימות`);
    });
    
    // סטטיסטיקה של עומק המבנה ההיררכי
    const depthCounts = {};
    validTasks.forEach(task => {
      const depth = (task.hierarchical_number.match(/\./g) || []).length;
      depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    });
    
    console.log('\nעומק היררכי:');
    Object.keys(depthCounts).sort((a, b) => a - b).forEach(depth => {
      console.log(`- רמה ${depth}: ${depthCounts[depth]} משימות`);
    });
    
    // מספר משימות אב ותת-משימות
    const subTasks = validTasks.filter(task => task.parent_task_id).length;
    
    console.log(`\nמשימות אב: ${rootTasks.length}`);
    console.log(`תת-משימות: ${subTasks}`);
    console.log(`סה"כ משימות: ${validTasks.length}`);
  } catch (err) {
    console.error('שגיאה כללית:', err);
  }
}

checkTaskHierarchy(); 