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
    
    let success = false;
    let result: any = null;

    try {
      // 1. נסיון ראשון: קריאה לפונקציית RPC להעתקת שלבים מהטבלה הכללית לטבלה הייחודית של הפרויקט
      console.log('ניסיון קריאה לפונקציית copy_stages_to_project...');
      const { data, error } = await supabase.rpc(
        'copy_stages_to_project',
        { project_id: projectId }
      );
      
      if (error) {
        console.error('שגיאה בסנכרון שלבים באמצעות copy_stages_to_project:', error);
        throw error;
      }
      
      success = true;
      result = data;
    } catch (rpcError) {
      console.log('ניסיון קריאה לפונקציית copy_stages_to_project_table כגיבוי...');
      try {
        // 2. נסיון שני: קריאה לפונקציית RPC הישנה כגיבוי
        const { data, error } = await supabase.rpc(
          'copy_stages_to_project_table',
          { project_id: projectId }
        );
        
        if (error) {
          console.error('שגיאה גם בסנכרון שלבים באמצעות copy_stages_to_project_table:', error);
          throw error;
        }
        
        success = true;
        result = { project_stages_count: 0 }; // אין מידע על מספר השלבים מהפונקציה הישנה
      } catch (oldRpcError) {
        console.log('שני ניסיונות RPC נכשלו, עובר לשימוש ישיר ב-stageService...');
        
        // 3. מצב חירום: נשתמש ב-stageService באופן ישיר
        try {
          // קודם נבדוק אם כבר יש שלבים
          const existingStages = await stageService.getProjectStages(projectId);
          
          // אם אין שלבים, ניצור שלבי ברירת מחדל
          if (!existingStages || existingStages.length === 0) {
            const newStages = await stageService.createDefaultStages(projectId);
            success = true;
            result = { project_stages_count: newStages.length };
          } else {
            // אם כבר יש שלבים, נחזיר הצלחה עם מספר השלבים הקיימים
            success = true;
            result = { project_stages_count: existingStages.length };
          }
        } catch (serviceError) {
          console.error('כל ניסיונות הסנכרון נכשלו:', serviceError);
          throw new Error('כל ניסיונות הסנכרון נכשלו');
        }
      }
    }
    
    // שליפת השלבים מהטבלה הייחודית של הפרויקט לצורך הצגת המספר הסופי
    try {
      const stages = await stageService.getProjectStages(projectId);
      result = { ...result, project_stages_count: stages.length };
    } catch (e) {
      console.warn('שגיאה בקבלת מספר השלבים הסופי:', e);
    }
    
    // סנכרון מזהי השלבים בטבלת המשימות הספציפית של הפרויקט
    try {
      console.log('סנכרון מזהי שלבים בטבלת המשימות הספציפית...');
      
      // 1. הגדרת שמות הטבלאות
      const tasksTableName = `project_${projectId}_tasks`;
      const stagesTableName = `project_${projectId}_stages`;
      
      // 2. בדיקה אם הטבלאות קיימות באמצעות ניסיון ישיר לבצע שאילתה
      let tasksTableExists = false;
      let stagesTableExists = false;
      
      try {
        // בדיקת טבלת המשימות
        const { data: tasksExists, error: tasksCheckError } = await supabase
          .rpc('check_table_exists', { table_name_param: tasksTableName });
          
        if (tasksCheckError) {
          console.error(`שגיאה בבדיקת קיום טבלת המשימות ${tasksTableName}:`, tasksCheckError);
        } else {
          tasksTableExists = !!tasksExists;
        }
      } catch (e) {
        console.log(`שגיאה בבדיקת טבלת המשימות ${tasksTableName}:`, e);
      }
      
      try {
        // בדיקת טבלת השלבים
        const { data: stagesExists, error: stagesCheckError } = await supabase
          .rpc('check_table_exists', { table_name_param: stagesTableName });
          
        if (stagesCheckError) {
          console.error(`שגיאה בבדיקת קיום טבלת השלבים ${stagesTableName}:`, stagesCheckError);
        } else {
          stagesTableExists = !!stagesExists;
        }
      } catch (e) {
        console.log(`שגיאה בבדיקת טבלת השלבים ${stagesTableName}:`, e);
      }
      
      // אם שתי הטבלאות קיימות, נבצע סנכרון
      if (tasksTableExists && stagesTableExists) {
        // 3. שליפת הנתונים מטבלת המשימות ומטבלת השלבים
        const { data: tasksWithStageId, error: tasksError } = await supabase
          .from(tasksTableName)
          .select('id, stage_id, title')
          .not('stage_id', 'is', null);
          
        if (tasksError) {
          console.error('שגיאה בשליפת משימות עם stage_id:', tasksError);
          throw tasksError;
        }
        
        // 4. שליפת שלבים מהטבלה הכללית
        const { data: generalStages, error: generalStagesError } = await supabase
          .from('stages')
          .select('id, title');
          
        if (generalStagesError) {
          console.error('שגיאה בשליפת שלבים מהטבלה הכללית:', generalStagesError);
          throw generalStagesError;
        }
        
        // 5. שליפת שלבים מהטבלה הספציפית
        const { data: projectStages, error: projectStagesError } = await supabase
          .from(stagesTableName)
          .select('id, title');
          
        if (projectStagesError) {
          console.error('שגיאה בשליפת שלבים מהטבלה הספציפית:', projectStagesError);
          throw projectStagesError;
        }
        
        // יצירת מיפוי בין כותרות שלבים למזהים בטבלה הספציפית
        const stageMap = new Map();
        if (projectStages) {
          projectStages.forEach(stage => {
            stageMap.set(stage.title.toLowerCase().trim(), stage.id);
          });
        }
        
        // 6. עדכון ה-stage_id של המשימות לפי כותרת השלב
        if (tasksWithStageId && tasksWithStageId.length > 0 && generalStages && generalStages.length > 0) {
          let updatedCount = 0;
          
          for (const task of tasksWithStageId) {
            // מציאת השלב המקורי לפי המזהה
            const originalStage = generalStages.find(s => s.id === task.stage_id);
            
            if (originalStage) {
              // חיפוש שלב תואם בטבלה הספציפית לפי כותרת
              const matchingStageId = stageMap.get(originalStage.title.toLowerCase().trim());
              
              if (matchingStageId && matchingStageId !== task.stage_id) {
                // עדכון המזהה של השלב במשימה
                const { error: updateError } = await supabase
                  .from(tasksTableName)
                  .update({ stage_id: matchingStageId })
                  .eq('id', task.id);
                  
                if (updateError) {
                  console.error(`שגיאה בעדכון stage_id עבור משימה ${task.id}:`, updateError);
                } else {
                  updatedCount++;
                }
              }
            }
          }
          
          console.log(`עודכנו ${updatedCount} מתוך ${tasksWithStageId.length} משימות עם מזהי שלבים חדשים`);
          result = { ...result, updated_tasks_count: updatedCount };
        }
      } else {
        console.log('לא כל הטבלאות הדרושות קיימות, מדלג על סנכרון המשימות.');
      }
    } catch (syncError) {
      console.error('שגיאה בסנכרון מזהי השלבים במשימות:', syncError);
      // לא מפסיקים את הפעולה אם יש שגיאה בסנכרון מזהי השלבים
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
        error: 'אירעה שגיאה בסנכרון שלבים',
        details: error.message
      },
      { status: 500 }
    );
  }
} 