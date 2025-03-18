require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllTasks() {
  console.log('בדיקה מפורטת של המשימות בטבלה...');
  
  // 1. בדיקת מספר הרשומות בטבלה, כולל מחוקות
  const { data: totalCount, error: countError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN deleted = false THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN deleted = true THEN 1 ELSE 0 END) as deleted
      FROM 
        tasks;
    `
  });
  
  if (countError) {
    console.error('שגיאה בספירת רשומות:', countError);
  } else if (totalCount && totalCount.results && totalCount.results.length > 0) {
    console.log('מספר רשומות בטבלת tasks:');
    console.log(totalCount.results[0]);
  } else {
    console.log('לא התקבלו תוצאות מספירת רשומות:', totalCount);
  }
  
  // 2. בדיקה אם יש כפילויות שכוללות גם רשומות מחוקות
  console.log('\nבדיקת כפילויות כולל רשומות מחוקות:');
  const { data: duplicatesWithDeleted, error: dupError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        title,
        project_id,
        COUNT(*) as total,
        SUM(CASE WHEN deleted = false THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN deleted = true THEN 1 ELSE 0 END) as deleted
      FROM 
        tasks
      GROUP BY 
        title, project_id
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        total DESC
      LIMIT 20;
    `
  });
  
  if (dupError) {
    console.error('שגיאה בבדיקת כפילויות:', dupError);
  } else if (!duplicatesWithDeleted || !duplicatesWithDeleted.results || duplicatesWithDeleted.results.length === 0) {
    console.log('לא נמצאו כפילויות');
    console.log('תוצאות מלאות:', duplicatesWithDeleted);
  } else {
    console.log('נמצאו כפילויות (כולל רשומות מחוקות):');
    console.log(duplicatesWithDeleted.results);
    
    // בדיקה מפורטת של הכפילה הראשונה
    if (duplicatesWithDeleted.results.length > 0) {
      const firstDup = duplicatesWithDeleted.results[0];
      console.log(`\nדוגמה מפורטת של הכפילויות עבור הכותרת "${firstDup.title}":`)
      
      const { data: examples, error: exampleError } = await supabase.rpc('exec_sql', { 
        query: `
          SELECT 
            id, title, project_id, deleted, created_at, updated_at
          FROM 
            tasks
          WHERE 
            title = '${firstDup.title}' AND
            project_id ${firstDup.project_id ? `= '${firstDup.project_id}'` : 'IS NULL'}
          ORDER BY 
            created_at DESC;
        `
      });
      
      if (exampleError) {
        console.error('שגיאה בשליפת דוגמאות:', exampleError);
      } else if (examples && examples.results) {
        console.log(examples.results);
      } else {
        console.log('לא התקבלו דוגמאות:', examples);
      }
    }
  }
  
  // 3. נבדוק אם יש כפילויות בטבלה הראשית ללא התייחסות לדגל deleted
  console.log('\nבדיקת כפילויות בטבלה הראשית (tasks) ללא התייחסות לדגל deleted:');
  const { data: duplicatesAll, error: allDupError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        title,
        COUNT(*) as total
      FROM 
        tasks
      GROUP BY 
        title
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        total DESC
      LIMIT 20;
    `
  });
  
  if (allDupError) {
    console.error('שגיאה בבדיקת כל הכפילויות:', allDupError);
  } else if (!duplicatesAll || !duplicatesAll.results || duplicatesAll.results.length === 0) {
    console.log('לא נמצאו כפילויות ללא התייחסות לדגל deleted');
  } else {
    console.log('נמצאו כפילויות ללא התייחסות לדגל deleted:');
    console.log(duplicatesAll.results);
  }
  
  // 4. בדיקת טבלאות פרויקט ספציפיות
  console.log('\nבדיקת טבלאות פרויקט ספציפיות:');
  
  // 4.1 קבלת רשימת טבלאות פרויקט
  const { data: projectTables, error: tablesError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'project_%_tasks'
      ORDER BY table_name;
    `
  });
  
  if (tablesError) {
    console.error('שגיאה בקבלת רשימת טבלאות פרויקט:', tablesError);
    return;
  } else if (!projectTables || !projectTables.results) {
    console.log('לא התקבלו טבלאות פרויקט:', projectTables);
    return;
  }
  
  console.log(`נמצאו ${projectTables.results.length} טבלאות פרויקט:`);
  console.log(projectTables.results);
  
  // 4.2 בדיקת כפילויות בכל טבלת פרויקט
  for (const tableRecord of projectTables.results) {
    const tableName = tableRecord.table_name;
    console.log(`\nבדיקת כפילויות בטבלה ${tableName}:`);
    
    const { data: projectDups, error: projectDupError } = await supabase.rpc('exec_sql', { 
      query: `
        SELECT 
          title,
          COUNT(*) as total,
          SUM(CASE WHEN deleted = false THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN deleted = true THEN 1 ELSE 0 END) as deleted
        FROM 
          "${tableName}"
        GROUP BY 
          title
        HAVING 
          COUNT(*) > 1
        ORDER BY 
          total DESC
        LIMIT 5;
      `
    });
    
    if (projectDupError) {
      console.error(`שגיאה בבדיקת כפילויות בטבלה ${tableName}:`, projectDupError);
    } else if (!projectDups || !projectDups.results || projectDups.results.length === 0) {
      console.log(`אין כפילויות בטבלה ${tableName}`);
    } else {
      console.log(`נמצאו כפילויות בטבלה ${tableName}:`);
      console.log(projectDups.results);
      
      // מראה דוגמה מפורטת לכפילה הראשונה
      if (projectDups.results.length > 0) {
        const firstTitle = projectDups.results[0].title;
        
        const { data: examples, error: exampleError } = await supabase.rpc('exec_sql', { 
          query: `
            SELECT 
              id, title, deleted, created_at, updated_at
            FROM 
              "${tableName}"
            WHERE 
              title = '${firstTitle}'
            ORDER BY 
              created_at DESC;
          `
        });
        
        if (exampleError) {
          console.error(`שגיאה בשליפת דוגמאות מטבלה ${tableName}:`, exampleError);
        } else if (examples && examples.results) {
          console.log(`דוגמאות מפורטות לכפילות "${firstTitle}" בטבלה ${tableName}:`);
          console.log(examples.results);
        } else {
          console.log(`לא התקבלו דוגמאות מטבלה ${tableName}:`, examples);
        }
      }
    }
  }
  
  // 5. בדיקת כפילויות לפי original_task_id
  console.log('\nבדיקת כפילויות לפי original_task_id:');
  const { data: originalIdDups, error: originalIdError } = await supabase.rpc('exec_sql', { 
    query: `
      SELECT 
        original_task_id,
        COUNT(*) as total,
        array_agg(id) as task_ids,
        array_agg(title) as titles
      FROM 
        tasks
      WHERE 
        original_task_id IS NOT NULL AND
        deleted = false
      GROUP BY 
        original_task_id
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        total DESC
      LIMIT 10;
    `
  });
  
  if (originalIdError) {
    console.error('שגיאה בבדיקת כפילויות לפי original_task_id:', originalIdError);
  } else if (!originalIdDups || !originalIdDups.results || originalIdDups.results.length === 0) {
    console.log('לא נמצאו כפילויות לפי original_task_id');
  } else {
    console.log('נמצאו כפילויות לפי original_task_id:');
    console.log(originalIdDups.results);
  }
}

checkAllTasks().catch(console.error); 