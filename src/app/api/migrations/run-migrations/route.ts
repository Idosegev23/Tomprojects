import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    // רצים את המיגרציה - מוסיפים עמודת dropbox_folder_path לטבלת projects
    const migrationQuery = `
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'projects' 
              AND column_name = 'dropbox_folder_path'
          ) THEN
              -- הוספת עמודת dropbox_folder_path לטבלת projects
              ALTER TABLE public.projects 
              ADD COLUMN dropbox_folder_path text DEFAULT NULL;
              
              RAISE NOTICE 'עמודת dropbox_folder_path נוספה בהצלחה לטבלת projects';
          ELSE
              RAISE NOTICE 'עמודת dropbox_folder_path כבר קיימת בטבלת projects';
          END IF;
      END $$;
    `;

    // הרצת השאילתה בסופרבייס
    const { error } = await supabase.rpc('exec_sql', { sql: migrationQuery });

    if (error) {
      console.error('שגיאה בהרצת המיגרציה:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'המיגרציה הורצה בהצלחה' 
    });
  } catch (error) {
    console.error('שגיאה לא צפויה בהרצת המיגרציה:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה' 
    }, { status: 500 });
  }
} 