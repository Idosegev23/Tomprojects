require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAccess() {
  console.log('בודק גישה לטבלאות...');
  
  // 1. entrepreneurs
  console.log('1. קריאת נתונים מטבלת entrepreneurs:');
  const entrResult = await supabase.from('entrepreneurs').select('*').limit(2);
  console.log(entrResult.data ? `הצלחה: ${entrResult.data.length} רשומות` : 'כישלון', entrResult.error);
  
  // 2. projects
  console.log('\n2. קריאת נתונים מטבלת projects:');
  const projResult = await supabase.from('projects').select('*').limit(2);
  console.log(projResult.data ? `הצלחה: ${projResult.data.length} רשומות` : 'כישלון', projResult.error);
  
  // 3. tasks
  console.log('\n3. קריאת נתונים מטבלת tasks:');
  const tasksResult = await supabase.from('tasks').select('*').limit(2);
  console.log(tasksResult.data ? `הצלחה: ${tasksResult.data.length} רשומות` : 'כישלון', tasksResult.error);
  
  // 4. stages
  console.log('\n4. קריאת נתונים מטבלת stages:');
  const stagesResult = await supabase.from('stages').select('*').limit(2);
  console.log(stagesResult.data ? `הצלחה: ${stagesResult.data.length} רשומות` : 'כישלון', stagesResult.error);
  
  // 5. project specific table
  const projectId = 'b80c8fef-a677-5340-85fb-2c162d75df03';
  const projectTable = `project_${projectId}_tasks`;
  console.log(`\n5. קריאת נתונים מטבלת פרויקט ספציפית (${projectTable}):`);
  const projectTasksResult = await supabase.from(projectTable).select('*').limit(2);
  console.log(projectTasksResult.data ? `הצלחה: ${projectTasksResult.data.length} רשומות` : 'כישלון', projectTasksResult.error);
}

testAccess().catch(console.error); 