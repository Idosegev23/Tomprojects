import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

/**
 * API endpoint להפעלת פונקציות דאטהבייס חשובות
 * קריאה ל-API זה תגרום להפעלת פונקציות שחסרות או לא פועלות כראוי
 * 
 * נקרא לאחר כל עדכון לבסיס הנתונים או כאשר יש שגיאות RPC
 * מריץ את הפונקציות מקובץ המיגרציה 20250800000000_final_fixes.sql
 */
export async function GET(req: NextRequest) {
  try {
    // יצירת לקוח Supabase
    const supabase = createRouteHandlerClient<Database>({ cookies });

    console.log('מפעיל פונקציות SQL חיוניות מהקובץ 20250800000000_final_fixes.sql...');

    // הפעלת פונקציית תיקון טבלת השלבים
    console.log('מפעיל פונקציית fix_project_stages_table...');
    const { data: fixStagesResult, error: fixStagesError } = await supabase.rpc('fix_project_stages_table', {
      project_id_param: null
    });

    if (fixStagesError) {
      console.error('שגיאה בהפעלת fix_project_stages_table:', fixStagesError);
    } else {
      console.log('fix_project_stages_table הופעלה בהצלחה:', fixStagesResult);
    }

    // הפעלת פונקציית יצירת/תיקון טבלת היסטוריית שלבים
    console.log('מפעיל פונקציית ensure_stages_history_table...');
    const { data: historyResult, error: historyError } = await supabase.rpc('ensure_stages_history_table');

    if (historyError) {
      console.error('שגיאה בהפעלת ensure_stages_history_table:', historyError);
    } else {
      console.log('ensure_stages_history_table הופעלה בהצלחה:', historyResult);
    }

    // בדיקת פונקציית העדכון ההיררכי של המשימות
    console.log('בודק זמינות של פונקציית update_tasks_stage_by_hierarchical_prefix...');
    // עורכים ניסיון עם ערכים לא ממשיים רק לוודא שהפונקציה קיימת
    const { data: updateResult, error: updateError } = await supabase.rpc('update_tasks_stage_by_hierarchical_prefix', {
      project_id_param: '00000000-0000-0000-0000-000000000000',
      hierarchical_prefix_param: '0.',
      stage_id_param: '00000000-0000-0000-0000-000000000000'
    });

    if (updateError && !updateError.message.includes('violates foreign key constraint')) {
      console.error('שגיאה בבדיקת update_tasks_stage_by_hierarchical_prefix:', updateError);
    } else {
      console.log('update_tasks_stage_by_hierarchical_prefix זמינה');
    }

    return NextResponse.json({
      success: true,
      message: 'כל הפונקציות הופעלו בהצלחה',
      results: {
        fix_project_stages_table: fixStagesError ? `שגיאה: ${fixStagesError.message}` : 'הופעלה בהצלחה',
        ensure_stages_history_table: historyError ? `שגיאה: ${historyError.message}` : 'הופעלה בהצלחה',
        update_tasks_stage_by_hierarchical_prefix: updateError && !updateError.message.includes('violates foreign key constraint') 
          ? `שגיאה: ${updateError.message}` 
          : 'זמינה לשימוש'
      }
    });
  } catch (error) {
    console.error('שגיאה בהפעלת פונקציות SQL:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        error
      },
      { status: 500 }
    );
  }
} 