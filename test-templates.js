require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTaskTemplates() {
  console.log('בודק תבניות משימות...');
  
  try {
    // בדיקת קריאה ישירה לטבלה עם סינון
    console.log('1. בדיקת קריאה ישירה מהטבלה עם סינון לתבניות:');
    const directResult = await supabase
      .from('tasks')
      .select('*')
      .eq('is_template', true)
      .eq('deleted', false);
    
    if (directResult.error) {
      console.error('שגיאה בקריאה ישירה:', directResult.error);
    } else {
      console.log(`נמצאו ${directResult.data.length} תבניות משימות בקריאה ישירה`);
      if (directResult.data.length > 0) {
        console.log('דוגמא לתבנית ראשונה:');
        const example = directResult.data[0];
        console.log(`ID: ${example.id}`);
        console.log(`כותרת: ${example.title}`);
        console.log(`סטטוס: ${example.status}`);
        console.log(`תגיות: ${example.labels?.join(', ') || 'אין'}`);
      }
    }
    
    // בדיקת פונקציית getAllTaskTemplates (דרך RPC)
    console.log('\n2. בדיקת פונקציית getAllTaskTemplates:');
    const rpcQuery = `
      SELECT * FROM get_all_task_templates()
    `;
    
    const rpcResult = await supabase.rpc('exec_sql', { query: rpcQuery });
    
    if (rpcResult.error) {
      console.error('שגיאה בקריאה מהפונקציה:', rpcResult.error);
      console.log('האם הפונקציה get_all_task_templates קיימת במסד הנתונים?');
      
      // בדיקה ישירה מול שדה is_template
      console.log('\nבדיקת SQL ישיר:');
      const sqlQuery = `
        SELECT * FROM tasks 
        WHERE is_template = true AND deleted = false
      `;
      
      const sqlResult = await supabase.rpc('exec_sql', { query: sqlQuery });
      
      if (sqlResult.error) {
        console.error('שגיאה בהרצת SQL ישיר:', sqlResult.error);
      } else {
        console.log('תוצאת SQL ישיר:', sqlResult.data);
      }
    } else {
      console.log('תוצאת הפונקציה:', rpcResult.data);
    }
    
    // בדיקת SQL להדגמת how the function is implemented
    console.log('\n3. תוכן פונקציית getAllTaskTemplates:');
    const functionSourceQuery = `
      SELECT pg_get_functiondef(oid) as source
      FROM pg_proc
      WHERE proname = 'get_all_task_templates'
    `;
    
    const sourceResult = await supabase.rpc('exec_sql', { query: functionSourceQuery });
    
    if (sourceResult.error) {
      console.error('שגיאה בהבאת מקור הפונקציה:', sourceResult.error);
    } else {
      console.log('מקור הפונקציה:', sourceResult.data);
    }
  } catch (err) {
    console.error('שגיאה כללית:', err);
  }
}

testTaskTemplates().catch(console.error); 