require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicateTasks() {
  console.log('בודק כפילויות משימות בטבלה...');
  
  // בדיקת כפילויות לפי כותרת וגם פרויקט
  const { data, error } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        title,
        project_id,
        COUNT(*) as count_duplicates
      FROM 
        tasks
      WHERE 
        deleted = false
      GROUP BY 
        title, project_id
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        count_duplicates DESC,
        title
      LIMIT 20;
    `
  });
  
  if (error) {
    console.error('שגיאה בבדיקת כפילויות:', error);
    return;
  }
  
  if (!data.results || data.results.length === 0) {
    console.log('לא נמצאו כפילויות לפי title ו-project_id');
  } else {
    console.log('נמצאו כפילויות:');
    console.log(data.results);
  }
  
  // בדיקת כפילויות לפי כותרת בלבד (ללא חלוקה לפי פרויקט)
  console.log('\nבדיקת כפילויות לפי כותרת בלבד (ללא התייחסות לפרויקט):');
  const { data: globalDups, error: globalError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        title,
        COUNT(*) as count_duplicates
      FROM 
        tasks
      WHERE 
        deleted = false
      GROUP BY 
        title
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        count_duplicates DESC,
        title
      LIMIT 20;
    `
  });
  
  if (globalError) {
    console.error('שגיאה בבדיקת כפילויות גלובליות:', globalError);
    return;
  }
  
  if (!globalDups.results || globalDups.results.length === 0) {
    console.log('לא נמצאו כפילויות לפי title בלבד');
  } else {
    console.log('נמצאו כפילויות גלובליות (לפי title בלבד):');
    console.log(globalDups.results);
  }
  
  // הצגת דוגמה מפורטת לכפילויות הראשונות
  if (globalDups.results && globalDups.results.length > 0) {
    const title = globalDups.results[0].title;
    
    console.log(`\nדוגמה מפורטת של הכפילויות עבור הכותרת "${title}":`);
    const { data: exampleDups, error: exampleError } = await supabase.rpc('exec_sql', { 
      query: `
        SELECT 
          id, title, project_id, created_at, updated_at, deleted
        FROM 
          tasks
        WHERE 
          title = '${title}'
        ORDER BY 
          created_at DESC;
      `
    });
    
    if (exampleError) {
      console.error('שגיאה בשליפת דוגמה:', exampleError);
    } else {
      console.log(exampleDups.results);
    }
  }
}

checkDuplicateTasks().catch(console.error); 