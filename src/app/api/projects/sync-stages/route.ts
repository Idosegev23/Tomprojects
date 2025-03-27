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
      // שימוש בפונקציה החדשה syncStagesToProjectTable מתוך stageService
      console.log('מסנכרן שלבים מהטבלה הכללית לטבלה הספציפית של הפרויקט באמצעות stageService...');
      const syncResult = await stageService.syncStagesToProjectTable(projectId);
      
      if (!syncResult.success) {
        console.error('שגיאה בסנכרון שלבים באמצעות stageService:', syncResult.error);
        throw new Error(syncResult.error);
      }
      
      success = true;
      result = syncResult;
    } catch (syncError) {
      console.error('שגיאה בסנכרון שלבים באמצעות stageService:', syncError);
      
      // מצב חירום: נשתמש בניסיון ישיר באמצעות RPC
      try {
        console.log('מנסה לסנכרן שלבים באמצעות RPC כגיבוי...');
        const { data, error } = await supabase.rpc(
          'copy_stages_to_project',
          { project_id: projectId }
        );
        
        if (error) {
          console.error('שגיאה בסנכרון שלבים באמצעות RPC:', error);
          
          // ניסיון אחרון: בדיקה אם יש שלבים קיימים
          const existingStages = await stageService.getProjectStages(projectId);
          
          if (!existingStages || existingStages.length === 0) {
            // אם אין שלבים, ניצור שלבי ברירת מחדל
            console.log('אין שלבים קיימים, יוצר שלבי ברירת מחדל...');
            const defaultStages = await stageService.createDefaultStages(projectId);
            success = true;
            result = { 
              success: true,
              message: 'נוצרו שלבי ברירת מחדל',
              project_stages_count: defaultStages.length 
            };
          } else {
            // אם יש שלבים קיימים, נשתמש בהם
            success = true;
            result = { 
              success: true,
              message: 'נמצאו שלבים קיימים',
              project_stages_count: existingStages.length 
            };
          }
        } else {
          success = true;
          result = data;
        }
      } catch (finalError) {
        console.error('כל ניסיונות הסנכרון נכשלו:', finalError);
        throw new Error('כל ניסיונות הסנכרון נכשלו');
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