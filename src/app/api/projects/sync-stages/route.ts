import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stageService } from '@/lib/services/stageService';

export async function POST(req: NextRequest) {
  try {
    // קבלת נתוני הבקשה
    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'חסר מזהה פרויקט' },
        { status: 400 }
      );
    }
    
    // יצירת לקוח supabase עם הקוקיז של הבקשה
    const supabase = createRouteHandlerClient({ cookies });
    
    console.log(`מתחיל תהליך סנכרון שלבים ומשימות עבור פרויקט ${projectId}`);
    
    // נבצע קריאה ישירה לפונקציית הסנכרון המתוקנת
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_stages_and_tasks_by_project', { project_id_param: projectId });
      
    if (syncError) {
      console.error(`שגיאה בסנכרון שלבים ומשימות עבור פרויקט ${projectId}:`, syncError);
      return NextResponse.json(
        { 
          error: 'שגיאה בסנכרון שלבים ומשימות', 
          details: syncError.message 
        },
        { status: 500 }
      );
    }
    
    // בדיקה אם הסנכרון הצליח
    if (!syncResult.success) {
      console.error(`כישלון בסנכרון שלבים ומשימות עבור פרויקט ${projectId}:`, syncResult.error);
      return NextResponse.json(
        { 
          error: 'כישלון בסנכרון שלבים ומשימות', 
          details: syncResult.error 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'סנכרון שלבים ומשימות הושלם בהצלחה',
      ...syncResult
    });
    
  } catch (error: any) {
    console.error('שגיאה בלתי צפויה בסנכרון שלבים:', error);
    
    return NextResponse.json(
      { 
        error: 'אירעה שגיאה בסנכרון שלבים',
        details: error.message
      },
      { status: 500 }
    );
  }
} 