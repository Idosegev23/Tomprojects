import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'חסר מזהה פרויקט' },
        { status: 400 }
      );
    }
    
    // יצירת לקוח supabase
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log(`סנכרון מלא של טבלאות פרויקט ${projectId}`);

    // שלב 1: ניקוי טבלאות כפולות אם יש כאלו
    console.log('בודק ומנקה טבלאות כפולות...');
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_duplicate_project_tables', { project_id_param: projectId });

    if (cleanupError) {
      console.error(`שגיאה בניקוי טבלאות כפולות לפרויקט ${projectId}:`, cleanupError);
      console.log('ממשיך לשלב הסנכרון למרות השגיאה...');
    } else {
      console.log('תוצאת ניקוי טבלאות כפולות:', cleanupResult);
    }
    
    // שלב 2: קריאה לפונקציית סנכרון שלבים ומשימות
    console.log('מבצע סנכרון שלבים ומשימות...');
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_stages_and_tasks_by_project', { project_id_param: projectId });
      
    if (syncError) {
      console.error(`שגיאה בסנכרון טבלאות פרויקט ${projectId}:`, syncError);
      return NextResponse.json(
        { 
          error: 'שגיאה בסנכרון טבלאות פרויקט', 
          details: syncError.message,
          code: syncError.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'סנכרון טבלאות הפרויקט הושלם בהצלחה',
      cleanup_result: cleanupResult,
      sync_result: syncResult
    });
    
  } catch (error: any) {
    console.error('שגיאה בסנכרון טבלאות פרויקט:', error);
    
    return NextResponse.json(
      { 
        error: 'שגיאה בסנכרון טבלאות פרויקט',
        details: error.message
      },
      { status: 500 }
    );
  }
} 