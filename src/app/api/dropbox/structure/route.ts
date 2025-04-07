import { NextResponse } from 'next/server';
import { dropboxService } from '@/lib/services/dropboxService';

// פונקציה שתחזיר את מבנה התיקיות בדרופבוקס
export async function GET(request: Request) {
  try {
    // קבלת הנתיב מפרמטרים של URL (אם יש)
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '';
    const depthParam = url.searchParams.get('depth');
    const depth = depthParam ? parseInt(depthParam) : 2;
    
    // בדיקה שחיבור לדרופבוקס תקין
    const isConnected = await dropboxService.validateConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'לא ניתן להתחבר לדרופבוקס. אנא בדוק את הגדרות החיבור.' },
        { status: 500 }
      );
    }

    // קבלת מבנה התיקיות
    const recursive = url.searchParams.get('recursive') === 'true';
    const structure = recursive 
      ? await dropboxService.getRecursiveFolderStructure(path, depth)
      : await dropboxService.getFolderStructure(path);
    
    return NextResponse.json(structure);
  } catch (error: any) {
    console.error('Error getting Dropbox folder structure:', error);
    return NextResponse.json(
      { error: `שגיאה בקבלת מבנה התיקיות: ${error.message}` },
      { status: 500 }
    );
  }
} 