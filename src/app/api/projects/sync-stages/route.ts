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
    
    // שמות הטבלאות הספציפיות לפרויקט
    const tasksTableName = `project_${projectId}_tasks`;
    const stagesTableName = `project_${projectId}_stages`;
    
    console.log(`מתחיל תהליך סנכרון שלבים ומשימות עבור פרויקט ${projectId}`);
    
    // בדיקה אם טבלאות הפרויקט קיימות
    const tasksTableExists = await checkTableExists(supabase, tasksTableName);
    let stagesTableExists = await checkTableExists(supabase, stagesTableName);
    
    // יצירת טבלת השלבים אם היא לא קיימת
    if (!stagesTableExists) {
      console.log(`טבלת השלבים ${stagesTableName} לא קיימת. יוצר אותה...`);
      try {
        await supabase.rpc('create_project_stages_table', { project_id_param: projectId });
        stagesTableExists = true;
        console.log(`טבלת השלבים ${stagesTableName} נוצרה בהצלחה.`);
      } catch (error) {
        console.error(`שגיאה ביצירת טבלת השלבים ${stagesTableName}:`, error);
        return NextResponse.json(
          { error: `שגיאה ביצירת טבלת השלבים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
          { status: 500 }
        );
      }
    }
    
    if (!tasksTableExists) {
      console.log(`טבלת המשימות ${tasksTableName} לא קיימת. נדרש להגדיר משימות לפרויקט תחילה.`);
      return NextResponse.json({
        success: false,
        message: 'טבלת המשימות לא קיימת. יש להגדיר משימות לפרויקט תחילה.'
      }, { status: 404 });
    }
    
    // שלב 1: מציאת כל המשימות בפרויקט עם stage_id
    console.log(`מחפש משימות עם מזהי שלבים בטבלת ${tasksTableName}...`);
    const { data: tasksWithStageId, error: tasksError } = await supabase
      .from(tasksTableName)
      .select('id, stage_id, title')
      .not('stage_id', 'is', null);
      
    if (tasksError) {
      console.error('שגיאה בשליפת משימות עם stage_id:', tasksError);
      return NextResponse.json(
        { error: `שגיאה בשליפת משימות: ${tasksError.message}` },
        { status: 500 }
      );
    }
    
    if (!tasksWithStageId || tasksWithStageId.length === 0) {
      console.log('לא נמצאו משימות עם מזהי שלבים בפרויקט זה.');
      
      // אם אין משימות עם שלבים, ננסה לסנכרן שלבים באופן כללי
      try {
        const syncResult = await stageService.syncStagesToProjectTable(projectId);
        return NextResponse.json({
          success: true,
          message: 'לא נמצאו משימות עם מזהי שלבים, אך בוצע סנכרון שלבים כללי',
          ...syncResult
        });
      } catch (e) {
        console.error('שגיאה בסנכרון שלבים כללי:', e);
        return NextResponse.json({
          success: false,
          message: 'לא נמצאו משימות עם מזהי שלבים ונכשל סנכרון כללי',
          error: e instanceof Error ? e.message : 'שגיאה לא ידועה'
        }, { status: 500 });
      }
    }
    
    // שלב 2: איסוף כל מזהי השלבים הייחודיים מהמשימות
    const uniqueStageIds = Array.from(new Set(tasksWithStageId.map(task => task.stage_id)));
    console.log(`נמצאו ${uniqueStageIds.length} מזהי שלבים ייחודיים מ-${tasksWithStageId.length} משימות`);
    
    // שלב 3: שליפת מידע על כל השלבים הללו מהטבלה הכללית
    console.log('מושך מידע על השלבים מטבלה כללית...');
    const { data: stagesData, error: stagesError } = await supabase
      .from('stages')
      .select('*')
      .in('id', uniqueStageIds);
      
    if (stagesError || !stagesData) {
      console.error('שגיאה בשליפת מידע על השלבים:', stagesError);
      return NextResponse.json(
        { error: `שגיאה בשליפת מידע על השלבים: ${stagesError?.message || 'לא התקבלו נתונים'}` },
        { status: 500 }
      );
    }
    
    console.log(`נמצאו ${stagesData.length} שלבים בטבלה הכללית מתוך ${uniqueStageIds.length} שחיפשנו`);
    
    // שלב 4: העתקת השלבים לטבלה הספציפית של הפרויקט
    const stageIdMap = new Map(); // מיפוי בין מזהי שלבים ישנים לחדשים
    console.log(`מעתיק שלבים לטבלת ${stagesTableName}...`);
    
    for (const stage of stagesData) {
      // העתקת השלב לטבלה הספציפית
      try {
        // התאמת השלב - שדות שיכולים להיות שונים בין הטבלאות
        const adaptedStage = {
          ...stage,
          project_id: projectId, // וידוא שה-project_id הוא של הפרויקט הנוכחי
          updated_at: new Date().toISOString()
        };
        
        // העתקת השלב לטבלה הספציפית
        const { data: insertedStage, error: insertError } = await supabase
          .from(stagesTableName)
          .upsert(adaptedStage, { onConflict: 'id' })
          .select()
          .single();
          
        if (insertError) {
          console.error(`שגיאה בהעתקת שלב ${stage.id} לטבלה הספציפית:`, insertError);
          continue;
        }
        
        // שמירת המיפוי בין מזהה ישן למזהה חדש (במקרה זה הם אותו דבר, אבל להמשך גמישות)
        stageIdMap.set(stage.id, insertedStage.id);
        console.log(`שלב [${stage.title || stage.id}] הועתק בהצלחה`);
      } catch (error) {
        console.error(`שגיאה בהעתקת שלב ${stage.id}:`, error);
      }
    }
    
    // שלב 5: עדכון stage_id במשימות להצביע לשלבים החדשים
    console.log('מעדכן מזהי שלבים במשימות...');
    let updatedTasksCount = 0;
    
    // קודם כל נוודא שכל השלבים מהטבלה הכללית אכן הועתקו
    for (const stageId of uniqueStageIds) {
      if (!stageIdMap.has(stageId)) {
        try {
          console.log(`שלב ${stageId} לא הועתק עדיין, מנסה להעתיק אותו ישירות...`);
          
          // נבדוק אם השלב קיים בטבלה הכללית
          const { data: stageData, error: stageError } = await supabase
            .from('stages')
            .select('*')
            .eq('id', stageId)
            .single();
            
          if (stageError || !stageData) {
            console.error(`שלב ${stageId} לא נמצא בטבלה הכללית:`, stageError);
            continue;
          }
          
          // העתקת השלב לטבלה הייחודית
          const adaptedStage = {
            ...stageData,
            project_id: projectId,
            updated_at: new Date().toISOString()
          };
          
          const { data: insertedStage, error: insertError } = await supabase
            .from(stagesTableName)
            .upsert(adaptedStage, { onConflict: 'id' })
            .select()
            .single();
            
          if (insertError) {
            console.error(`שגיאה בהעתקת שלב ${stageId} לטבלה הספציפית:`, insertError);
            continue;
          }
          
          stageIdMap.set(stageId, insertedStage.id);
          console.log(`שלב [${stageData.title || stageId}] הועתק בהצלחה`);
        } catch (error) {
          console.error(`שגיאה בהעתקת שלב ${stageId}:`, error);
        }
      }
    }
    
    // עכשיו נעדכן את כל המשימות עם stage_id חדש
    const { data: allTasks, error: allTasksError } = await supabase
      .from(tasksTableName)
      .select('id, stage_id, title');
      
    if (allTasksError) {
      console.error('שגיאה בשליפת כל המשימות:', allTasksError);
    } else if (allTasks && allTasks.length > 0) {
      console.log(`נמצאו ${allTasks.length} משימות סה"כ לבדיקה`);
      
      // בדיקה האם המשימה מצביעה לשלב שקיים בטבלה הכללית
      for (const task of allTasks) {
        if (task.stage_id) {
          // אם יש stage_id, נבדוק אם הוא שייך לטבלה הכללית
          const stageExists = stageIdMap.has(task.stage_id);
          
          if (stageExists) {
            // המשימה מצביעה לשלב שקיים בטבלה הכללית, נעדכן אותה
            try {
              // הנקודה המרכזית: אנחנו לא משנים את ה-ID של השלב, 
              // אבל אנחנו עדיין צריכים לוודא שהמשימה מצביעה לשלב בטבלה הייחודית
              
              // בדיקה אם השלב קיים בטבלה הייחודית
              const { data: stageExistsInProjectTable, error: stageExistsError } = await supabase
                .from(stagesTableName)
                .select('id')
                .eq('id', task.stage_id)
                .single();
                
              if (stageExistsError) {
                // אם השלב לא קיים בטבלה הייחודית, נעדכן את המשימה לשלב חדש
                console.error(`שלב ${task.stage_id} לא קיים בטבלה הייחודית, מעדכן משימה ${task.id} עם שלב אחר`);
                
                // בחירת שלב ברירת מחדל מהטבלה הייחודית
                const { data: defaultStage, error: defaultStageError } = await supabase
                  .from(stagesTableName)
                  .select('id')
                  .limit(1)
                  .single();
                  
                if (defaultStageError || !defaultStage) {
                  console.error(`לא נמצא שלב ברירת מחדל בטבלה הייחודית:`, defaultStageError);
                  continue;
                }
                
                // עדכון המשימה עם שלב ברירת מחדל
                const { error: updateError } = await supabase
                  .from(tasksTableName)
                  .update({ stage_id: defaultStage.id })
                  .eq('id', task.id);
                  
                if (updateError) {
                  console.error(`שגיאה בעדכון משימה ${task.id} עם שלב ברירת מחדל:`, updateError);
                  continue;
                }
                
                updatedTasksCount++;
              }
            } catch (error) {
              console.error(`שגיאה בטיפול במשימה ${task.id}:`, error);
            }
          }
        }
      }
    }
    
    console.log(`עודכנו ${updatedTasksCount} משימות עם מזהי שלבים`);
    
    // נסיון נוסף לוודא סנכרון מלא - נקרא לפונקציית RPC
    try {
      const { data: syncData, error: syncError } = await supabase
        .rpc('sync_stages_and_tasks_by_project', { project_id_param: projectId });
        
      if (syncError) {
        console.error('שגיאה בסנכרון סופי:', syncError);
      } else {
        console.log('סנכרון סופי הושלם בהצלחה:', syncData);
        // נעדכן את מספר המשימות שעודכנו אם זה חזר מהפונקציה
        if (syncData && syncData.tasks_updated) {
          updatedTasksCount = syncData.tasks_updated;
        }
      }
    } catch (error) {
      console.error('שגיאה בקריאה לפונקציית סנכרון:', error);
      // לא נכשיל את כל הפעולה אם זה נכשל
    }
    
    // שליפת מידע על השלבים לאחר העדכון
    const { data: finalStages, error: finalStagesError } = await supabase
      .from(stagesTableName)
      .select('*');
      
    if (finalStagesError) {
      console.error(`שגיאה בספירת שלבים סופית:`, finalStagesError);
    }
    
    return NextResponse.json({
      success: true,
      message: `סנכרון השלבים הושלם בהצלחה`,
      total_stages_found: stagesData.length,
      total_stages_copied: stageIdMap.size,
      total_tasks_updated: updatedTasksCount,
      final_stages_count: finalStages?.length || 0,
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

// פונקציית עזר לבדיקה אם טבלה קיימת
async function checkTableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    // ניסיון שימוש בפונקציית RPC
    const { data, error } = await supabase.rpc('check_table_exists', {
      table_name_param: tableName
    });
    
    if (error) {
      console.error(`שגיאה בבדיקת קיום הטבלה ${tableName} באמצעות RPC:`, error);
      
      // אם יש שגיאת RPC, ננסה בדיקה ישירה
      try {
        // ננסה לעשות שאילתה פשוטה על הטבלה
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('count(*)')
          .limit(1);
          
        if (testError) {
          // אם לקבלנו שגיאה שמרמזת שהטבלה לא קיימת
          if (testError.code === '42P01' || testError.message.includes('does not exist') || (testError as any).status === 400) {
            return false;
          }
          
          // שגיאה אחרת - לא בטוח אם הטבלה קיימת
          console.error(`שגיאה לא צפויה בבדיקת קיום הטבלה ${tableName}:`, testError);
          return false;
        }
        
        // אם לא התקבלה שגיאה, הטבלה קיימת
        return true;
      } catch (testErr) {
        console.error(`כשלון מוחלט בבדיקת קיום הטבלה ${tableName}:`, testErr);
        return false;
      }
    }
    
    return !!data;
  } catch (err) {
    console.error(`שגיאה בלתי צפויה בבדיקת קיום הטבלה ${tableName}:`, err);
    return false;
  }
} 