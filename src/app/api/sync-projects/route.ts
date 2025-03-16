import { NextResponse } from 'next/server';
import projectService from '@/lib/services/projectService';

export async function GET() {
  try {
    // סנכרון כל הפרויקטים
    await projectService.syncAllProjectTables();
    
    return NextResponse.json({ 
      success: true, 
      message: 'כל הפרויקטים סונכרנו בהצלחה' 
    });
  } catch (error) {
    console.error('Error syncing projects:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'אירעה שגיאה בסנכרון הפרויקטים',
        error: error
      },
      { status: 500 }
    );
  }
} 