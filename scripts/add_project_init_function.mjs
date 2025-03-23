// סקריפט להוספת פונקציית init_project_tables_and_data למסד הנתונים
// הסקריפט מריץ את הפקודות SQL שבמיגרציה באמצעות REST API של סופאבייס

import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// טעינת משתני הסביבה מקובץ .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

async function addProjectInitFunction() {
  console.log('מתחיל תהליך הוספת פונקציית init_project_tables_and_data למסד הנתונים...');

  // מידע התחברות לסופאבייס
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !apiKey) {
    console.error('חסרים נתוני התחברות לסופאבייס בקובץ .env.local');
    process.exit(1);
  }

  // קריאת קובץ המיגרציה
  const migrationFilePath = resolve(__dirname, '../supabase/migrations/20250401000000_add_project_init_function.sql');
  let sqlCommands;
  
  try {
    sqlCommands = fs.readFileSync(migrationFilePath, 'utf8');
  } catch (err) {
    console.error('שגיאה בקריאת קובץ המיגרציה:', err);
    process.exit(1);
  }

  // חלוקת הקובץ לפקודות נפרדות לפי סימני ;
  const commands = sqlCommands
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0);
  
  // הרצת כל פקודה בנפרד
  for (let i = 0; i < commands.length; i++) {
    const sql = commands[i];
    
    try {
      console.log(`מריץ פקודה ${i+1} מתוך ${commands.length}...`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: sql
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('  הפקודה הורצה בהצלחה:', result);
      } else {
        console.error('  שגיאה בהרצת הפקודה:', result);
      }
    } catch (error) {
      console.error('  שגיאה בשליחת הבקשה:', error);
    }
  }

  console.log('הוספת פונקציית init_project_tables_and_data הושלמה!');
}

// הרצת הפונקציה הראשית
addProjectInitFunction().catch(error => {
  console.error('שגיאה כללית:', error);
  process.exit(1);
}); 