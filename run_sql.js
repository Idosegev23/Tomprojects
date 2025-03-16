// סקריפט להרצת קובץ SQL מול סופאבייס
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('חסרים פרטי התחברות לסופאבייס בקובץ .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSqlFile(filePath) {
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`מריץ קובץ SQL: ${filePath}`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: sqlContent
    });
    
    if (error) {
      console.error('שגיאה בהרצת SQL:', error);
      return;
    }
    
    console.log('הקובץ הורץ בהצלחה:', data);
  } catch (err) {
    console.error('שגיאה:', err);
  }
}

// הרץ את הקובץ שצוין בארגומנט הראשון או את הקובץ המתוקן כברירת מחדל
const filePath = process.argv[2] || 'fix_project_table_functions_v3.sql';
runSqlFile(filePath); 