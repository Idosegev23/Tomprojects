import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import taskService from '@/lib/services/taskService';

// פונקציה לקבלת נתיב התיקייה בדרופבוקס עבור משימה מסוימת
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  
  if (!taskId) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // קבלת המשימה ממסד הנתונים
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
      
    if (taskError || !task) {
      console.error(`Error fetching task details: ${taskError?.message || 'Task not found'}`);
      
      // בדיקה נוספת בטבלאות הספציפיות של הפרויקטים
      if (task && task.project_id) {
        const projectTableName = `project_${task.project_id}_tasks`;
        
        // בדיקה האם הטבלה קיימת
        const { data: tableExists } = await supabase.rpc('check_table_exists', { 
          table_name_param: projectTableName 
        });
        
        if (tableExists) {
          const { data: projectTask, error: projectTaskError } = await supabase
            .from(projectTableName)
            .select('*')
            .eq('id', taskId)
            .single();
            
          if (!projectTaskError && projectTask) {
            return NextResponse.json({
              id: projectTask.id,
              dropbox_folder: projectTask.dropbox_folder
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: `Task not found: ${taskError?.message || 'Unknown error'}` },
        { status: 404 }
      );
    }
    
    // אם יש נתיב תיקייה במשימה, נחזיר אותו
    if (task.dropbox_folder) {
      return NextResponse.json({
        id: task.id,
        dropbox_folder: task.dropbox_folder
      });
    }
    
    // אם אין נתיב תיקייה, ננסה ליצור אותו עבור המשימה
    if (task.project_id) {
      // פיתרון 1 - שימוש בפונקציה מ-taskService
      try {
        const projectTableName = `project_${task.project_id}_tasks`;
        const { data: tableExists } = await supabase.rpc('check_table_exists', { 
          table_name_param: projectTableName 
        });
        const useProjectTable = !!tableExists;
        
        // קריאה לפונקציה שיוצרת תיקייה למשימה אם היא לא קיימת
        await taskService.createDropboxFolderForTask(task, useProjectTable, projectTableName);
        
        // קבלת הנתיב המעודכן
        const folderPath = await taskService.getTaskDropboxPath(task, useProjectTable, projectTableName);
        
        return NextResponse.json({
          id: task.id,
          dropbox_folder: folderPath
        });
      } catch (error) {
        console.error(`Error creating Dropbox folder for task ${taskId}:`, error);
        return NextResponse.json(
          { error: `Failed to create Dropbox folder: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
    
    // אם אין project_id, לא ניתן ליצור תיקייה
    return NextResponse.json(
      { error: 'Task has no project assigned' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Error in get-dropbox-path endpoint:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get Dropbox folder path', 
        details: error?.message || 'Unknown error',
        stack: error?.stack || null
      },
      { status: 500 }
    );
  }
} 