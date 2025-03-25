import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
    
    // 1. קריאה לפונקציית RPC להעתקת שלבים מהטבלה הכללית לטבלה הייחודית של הפרויקט
    const { data: result, error } = await supabase.rpc(
      'copy_stages_to_project',
      { project_id: projectId }
    );
    
    if (error) {
      console.error('שגיאה בסנכרון שלבים:', error);
      
      // בדיקה אם הפונקציה לא קיימת וניסיון להשתמש בפונקציה הישנה כגיבוי
      if (error.message?.includes('function copy_stages_to_project')) {
        const { data: oldResult, error: oldError } = await supabase.rpc(
          'copy_stages_to_project_table',
          { project_id: projectId }
        );
        
        if (oldError) {
          return NextResponse.json(
            { 
              error: 'שגיאה בסנכרון שלבים', 
              details: oldError.message,
              code: oldError.code
            },
            { status: 500 }
          );
        }
        
        // שליפת השלבים מהטבלה הייחודית של הפרויקט
        const stagesTableName = `project_${projectId}_stages`;
        const { data: stages, error: stagesError } = await supabase
          .from(stagesTableName)
          .select('*');
        
        if (stagesError) {
          return NextResponse.json(
            { 
              error: `אירעה שגיאה בגישה לטבלת השלבים ${stagesTableName}`,
              details: stagesError.message
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: `סנכרון השלבים הושלם בהצלחה (גיבוי)`,
          project_stages_count: stages?.length || 0,
          legacy_mode: true
        });
      }
      
      return NextResponse.json(
        { 
          error: 'שגיאה בסנכרון שלבים', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `סנכרון השלבים הושלם בהצלחה`,
      ...result
    });
  } catch (error: any) {
    console.error('שגיאה בלתי צפויה בסנכרון שלבים:', error);
    
    return NextResponse.json(
      { 
        error: 'אירעה שגיאה בלתי צפויה',
        details: error.message
      },
      { status: 500 }
    );
  }
} 