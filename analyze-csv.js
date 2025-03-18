const fs = require('fs');
const { parse } = require('csv-parse/sync');

// קריאת הקובץ
const csvFilePath = './tasks_rows.csv';

function analyzeCSV() {
  try {
    // קריאת הקובץ
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // פירוק ה-CSV לשורות
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`נמצאו ${records.length} רשומות בקובץ CSV`);
    
    // ניתוח כפילויות לפי שם המשימה (title)
    const titleMap = new Map();
    records.forEach(record => {
      const title = record.title;
      if (!titleMap.has(title)) {
        titleMap.set(title, []);
      }
      titleMap.get(title).push(record);
    });
    
    // מציאת כפילויות לפי title
    console.log("\nכפילויות לפי כותרת המשימה (title):");
    let duplicatesByTitle = 0;
    titleMap.forEach((records, title) => {
      if (records.length > 1) {
        duplicatesByTitle++;
        console.log(`\nכותרת: "${title}" (${records.length} מופעים):`);
        
        // בחינה האם יש כפילויות שאינן מחוקות
        const activeTasks = records.filter(r => r.deleted === 'false');
        console.log(`- מתוכם פעילים (deleted=false): ${activeTasks.length}`);
        
        if (activeTasks.length > 1) {
          console.log("- פירוט משימות פעילות:");
          activeTasks.forEach(task => {
            console.log(`  * ID: ${task.id}, פרויקט: ${task.project_id}, נוצר ב: ${task.created_at}`);
          });
        }
      }
    });
    console.log(`\nסה"כ נמצאו ${duplicatesByTitle} כפילויות לפי כותרת המשימה`);
    
    // ניתוח כפילויות לפי כותרת ופרויקט
    const titleProjectMap = new Map();
    records.forEach(record => {
      const key = `${record.title}-${record.project_id}`;
      if (!titleProjectMap.has(key)) {
        titleProjectMap.set(key, []);
      }
      titleProjectMap.get(key).push(record);
    });
    
    // מציאת כפילויות לפי title ו-project_id
    console.log("\nכפילויות לפי כותרת ופרויקט (title + project_id):");
    let duplicatesByTitleProject = 0;
    titleProjectMap.forEach((records, key) => {
      if (records.length > 1) {
        duplicatesByTitleProject++;
        const title = records[0].title;
        const projectId = records[0].project_id;
        console.log(`\nכותרת: "${title}", פרויקט: ${projectId} (${records.length} מופעים):`);
        
        // בחינה האם יש כפילויות שאינן מחוקות
        const activeTasks = records.filter(r => r.deleted === 'false');
        console.log(`- מתוכם פעילים (deleted=false): ${activeTasks.length}`);
        
        if (activeTasks.length > 1) {
          console.log("- פירוט משימות פעילות:");
          activeTasks.forEach(task => {
            console.log(`  * ID: ${task.id}, נוצר ב: ${task.created_at}`);
          });
        }
      }
    });
    console.log(`\nסה"כ נמצאו ${duplicatesByTitleProject} כפילויות לפי כותרת ופרויקט`);
    
    // ניתוח כפילויות לפי original_task_id
    const originalTaskMap = new Map();
    records.forEach(record => {
      if (record.original_task_id && record.original_task_id.trim() !== '') {
        if (!originalTaskMap.has(record.original_task_id)) {
          originalTaskMap.set(record.original_task_id, []);
        }
        originalTaskMap.get(record.original_task_id).push(record);
      }
    });
    
    // מציאת כפילויות לפי original_task_id
    console.log("\nכפילויות לפי original_task_id:");
    let duplicatesByOriginalId = 0;
    originalTaskMap.forEach((records, originalId) => {
      if (records.length > 1) {
        duplicatesByOriginalId++;
        console.log(`\nOriginal Task ID: ${originalId} (${records.length} מופעים):`);
        
        // בחינה האם יש כפילויות שאינן מחוקות
        const activeTasks = records.filter(r => r.deleted === 'false');
        console.log(`- מתוכם פעילים (deleted=false): ${activeTasks.length}`);
        
        if (activeTasks.length > 1) {
          console.log("- פירוט משימות פעילות:");
          activeTasks.forEach(task => {
            console.log(`  * ID: ${task.id}, כותרת: "${task.title}", פרויקט: ${task.project_id}`);
          });
        }
      }
    });
    console.log(`\nסה"כ נמצאו ${duplicatesByOriginalId} כפילויות לפי original_task_id`);
    
    // סיכום הממצאים
    console.log("\n===== סיכום הממצאים =====");
    console.log(`סה"כ רשומות בקובץ: ${records.length}`);
    console.log(`סה"כ רשומות פעילות: ${records.filter(r => r.deleted === 'false').length}`);
    console.log(`סה"כ רשומות מחוקות: ${records.filter(r => r.deleted === 'true').length}`);
    console.log(`כפילויות לפי כותרת: ${duplicatesByTitle}`);
    console.log(`כפילויות לפי כותרת ופרויקט: ${duplicatesByTitleProject}`);
    console.log(`כפילויות לפי original_task_id: ${duplicatesByOriginalId}`);
    
  } catch (error) {
    console.error('שגיאה בניתוח הקובץ:', error);
  }
}

analyzeCSV(); 