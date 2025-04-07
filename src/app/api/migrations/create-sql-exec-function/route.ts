import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
  try {
    // יצירת פונקציית SQL להרצת שאילתות SQL
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- הענקת הרשאות להרצת הפונקציה
      GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
      GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
    `;

    // הרצת השאילתה עם הרשאות בסיסיות
    const { error } = await supabase.from('_rpc').select('*').limit(1);

    if (error) {
      console.error('שגיאה בבדיקת החיבור לסופרבייס:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // עכשיו, נריץ את השאילתה ליצירת הפונקציה באמצעות פנייה ישירה ל-PostgreSQL
    const result = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
      },
      body: JSON.stringify({ sql: createFunctionQuery }),
    });

    if (!result.ok) {
      if (result.status === 404) {
        // אם הפונקציה לא קיימת, ננסה ליצור אותה ידנית במקום
        console.log('פונקציית exec_sql אינה קיימת, מנסה ליצור אותה באמצעות פקודת SQL ישירה');
        
        // ניתן להוסיף כאן קוד לשימוש ב-prisma או דרך אחרת ליצירת הפונקציה
        return NextResponse.json({ 
          success: false, 
          message: 'צריך ליצור את פונקציית exec_sql ידנית בממשק של סופרבייס. ראה את הפקודה בקונסול.' 
        }, { status: 200 });
      }
      
      const errorText = await result.text();
      console.error('שגיאה ביצירת פונקציית exec_sql:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: errorText 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'פונקציית exec_sql נוצרה בהצלחה' 
    });
  } catch (error) {
    console.error('שגיאה לא צפויה ביצירת פונקציית exec_sql:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה' 
    }, { status: 500 });
  }
} 