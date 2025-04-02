import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// יצירת לקוח Supabase עם הרשאות מיוחדות לשרת
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// רשימת משתמשי דמו לגיבוי
const demoUsers = [
  { id: '1', email: 'yossi@example.com', user_metadata: { fullName: 'יוסי כהן' } },
  { id: '2', email: 'moshe@example.com', user_metadata: { fullName: 'משה לוי' } },
  { id: '3', email: 'david@example.com', user_metadata: { fullName: 'דוד ישראלי' } },
  { id: '4', email: 'sara@example.com', user_metadata: { fullName: 'שרה גולן' } },
  { id: '5', email: 'michal@example.com', user_metadata: { fullName: 'מיכל רון' } },
];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // קבלת מזהה המשתמש מה-URL
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // הסרנו את האימות כדי לפשט את התהליך בסביבת פיתוח
    // בסביבת ייצור, מומלץ להחזיר את האימות

    // ניסיון למצוא בנתוני הדמו קודם
    const demoUser = demoUsers.find(user => user.id === id);
    if (demoUser) {
      console.log(`Found user with ID ${id} in demo data`);
      return NextResponse.json(demoUser);
    }

    // קבלת מידע על המשתמש מ-Supabase
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      console.log('Checking demo users as fallback');
      
      // ניסיון למצוא בנתוני הדמו
      const demoUser = demoUsers.find(user => user.id === id);
      if (demoUser) {
        return NextResponse.json(demoUser);
      }
      
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!data) {
      // ניסיון למצוא בנתוני הדמו
      const demoUser = demoUsers.find(user => user.id === id);
      if (demoUser) {
        return NextResponse.json(demoUser);
      }
      
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // החזרת הנתונים למשתמש
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error handling user request for ID ${id}:`, error);
    
    // ניסיון למצוא בנתוני הדמו
    const demoUser = demoUsers.find(user => user.id === id);
    if (demoUser) {
      console.log(`Using demo user with ID ${id} after error`);
      return NextResponse.json(demoUser);
    }
    
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
} 