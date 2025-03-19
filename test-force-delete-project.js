require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testForceDeleteProject() {
  console.log('בודק מחיקת פרויקט מאולצת...');
  
  // 1. יצירת פרויקט חדש לבדיקה
  const testProjectName = `פרויקט בדיקה למחיקה מאולצת - ${new Date().toISOString()}`;
  const projectId = uuidv4();
  console.log(`1. יוצר פרויקט חדש: "${testProjectName}" עם מזהה: ${projectId}`);
  
  const { data: newProject, error: createError } = await supabase
    .from('projects')
    .insert({
      id: projectId,
      name: testProjectName,
      status: 'planning',
      priority: 'medium',
      progress: 0
    })
    .select()
    .single();
  
  if (createError) {
    console.error('שגיאה ביצירת פרויקט:', createError);
    return;
  }
  
  console.log(`פרויקט נוצר בהצלחה. מזהה: ${newProject.id}`);
  
  // 2. הוספת משימה לפרויקט
  console.log('\n2. הוספת משימה לפרויקט:');
  
  const { data: newTask, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: `משימת בדיקה לפרויקט ${testProjectName}`,
      description: 'תיאור משימת בדיקה למחיקת פרויקט',
      project_id: newProject.id,
      status: 'todo',
      priority: 'medium'
    })
    .select()
    .single();
  
  if (taskError) {
    console.error('שגיאה בהוספת משימה:', taskError);
  } else {
    console.log(`משימה נוספה בהצלחה. מזהה: ${newTask.id}`);
  }
  
  // 3. בדיקה שטבלת הפרויקט נוצרה
  const projectTable = `project_${newProject.id}_tasks`;
  console.log(`\n3. בדיקת קיום טבלת הפרויקט ${projectTable}:`);
  
  const checkTableQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = '${projectTable}'
    );
  `;
  
  const { data: tableExists, error: tableError } = await supabase.rpc('exec_sql', { query: checkTableQuery });
  
  if (tableError) {
    console.error('שגיאה בבדיקת קיום הטבלה:', tableError);
  } else {
    console.log(`טבלת הפרויקט ${tableExists && tableExists.exists ? 'קיימת' : 'לא קיימת'}`);
    
    // אם הטבלה לא קיימת, ננסה לסנכרן אותה
    if (tableExists && !tableExists.exists) {
      console.log('מנסה ליצור את טבלת הפרויקט עם סנכרון:');
      const { data: syncResult, error: syncError } = await supabase.rpc('sync_project_tasks', { p_project_id: newProject.id });
      
      if (syncError) {
        console.error('שגיאה בסנכרון הטבלה:', syncError);
      } else {
        console.log('סנכרון הטבלה הצליח:', syncResult);
      }
    }
  }
  
  // 4. מחיקת הפרויקט באמצעות הפונקציה המאולצת
  console.log(`\n4. מחיקת פרויקט ${newProject.id} באמצעות force_delete_project:`);
  
  const { data: deleteResult, error: deleteError } = await supabase.rpc('force_delete_project', {
    project_id_param: newProject.id
  });
  
  if (deleteError) {
    console.error('שגיאה במחיקת פרויקט מאולצת:', deleteError);
  } else {
    console.log('פרויקט נמחק בהצלחה!', deleteResult);
  }
  
  // 5. בדיקה שהמשימה נמחקה
  console.log('\n5. בדיקה שהמשימה נמחקה:');
  
  const { data: taskAfterDelete, error: taskCheckError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', newTask.id);
  
  if (taskCheckError) {
    console.error('שגיאה בבדיקת המשימה לאחר מחיקה:', taskCheckError);
  } else {
    console.log(`לאחר מחיקת הפרויקט, נמצאו ${taskAfterDelete.length} משימות. ${taskAfterDelete.length === 0 ? 'המשימה נמחקה בהצלחה!' : 'שים לב: המשימה לא נמחקה אוטומטית!'}`);
  }
  
  // 6. בדיקה שטבלת הפרויקט נמחקה
  console.log(`\n6. בדיקה שטבלת הפרויקט נמחקה:`);
  
  const checkTableAfterDeleteQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = '${projectTable}'
    );
  `;
  
  const { data: tableExistsAfter, error: tableCheckError } = await supabase.rpc('exec_sql', { query: checkTableAfterDeleteQuery });
  
  if (tableCheckError) {
    console.error('שגיאה בבדיקת קיום הטבלה לאחר מחיקה:', tableCheckError);
  } else {
    console.log(`לאחר מחיקת הפרויקט, טבלת הפרויקט ${tableExistsAfter && tableExistsAfter.exists ? 'עדיין קיימת!' : 'נמחקה בהצלחה!'}`);
  }
}

testForceDeleteProject().catch(console.error); 