import { NextRequest, NextResponse } from 'next/server';
import taskService from '@/lib/services/taskService';
import supabase from '@/lib/supabase';

// פונקציה ליצירת מבנה תיקיות בדרופבוקס עבור פרויקט
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  
  // לוג פעולה
  console.log(`API call to create Dropbox folder structure for project: ${projectId}`);
  
  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // קבלת פרטי הפרויקט
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (projectError || !project) {
      console.error(`Error fetching project details: ${projectError?.message || 'Project not found'}`);
      return NextResponse.json(
        { error: `Project not found: ${projectError?.message || 'Unknown error'}` },
        { status: 404 }
      );
    }
    
    console.log(`Creating Dropbox folder structure for project: ${project.name} (${projectId})`);
    
    // בדיקה שהפונקציה קיימת
    if (!taskService.createFullHierarchicalFolderStructureForProject) {
      throw new Error('הפונקציה createFullHierarchicalFolderStructureForProject לא קיימת בשירות המשימות');
    }
    
    // יצירת מבנה התיקיות ההיררכי
    const createdFolders = await taskService.createFullHierarchicalFolderStructureForProject(project);
    
    // עדכון הפרויקט עם מידע על מבנה התיקיות שנוצר
    try {
      await supabase
        .from('projects')
        .update({
          dropbox_structure_created: true,
          dropbox_structure_created_at: new Date().toISOString(),
          dropbox_structure_status: 'success',
          dropbox_root_folder: createdFolders?.project?.path || '',
        })
        .eq('id', projectId);
    } catch (updateError) {
      console.error('Error updating project with Dropbox structure information:', updateError);
      // ממשיכים למרות השגיאה
    }
    
    // החזרת תוצאה חיובית
    return NextResponse.json({ 
      success: true, 
      message: 'Dropbox folder structure created successfully',
      folders: createdFolders
    });
    
  } catch (error: any) {
    console.error('Error creating Dropbox folder structure:', error);
    
    // עדכון הפרויקט עם מידע על הכישלון
    try {
      await supabase
        .from('projects')
        .update({
          dropbox_structure_status: 'error',
          dropbox_structure_error: error?.message || 'Unknown error',
        })
        .eq('id', projectId);
    } catch (updateError) {
      console.error('Error updating project with Dropbox structure error:', updateError);
    }
    
    // החזרת תוצאה שלילית
    return NextResponse.json(
      { 
        error: 'Failed to create Dropbox folder structure', 
        details: error?.message || 'Unknown error',
        stack: error?.stack || null
      },
      { status: 500 }
    );
  }
} 