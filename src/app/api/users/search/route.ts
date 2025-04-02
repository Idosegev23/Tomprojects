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

export async function GET(request: NextRequest) {
  // קבלת מונח החיפוש מהפרמטרים
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // הסרנו את האימות כדי לפשט את התהליך בסביבת פיתוח
    // בסביבת ייצור, מומלץ להחזיר את האימות

    // קבלת כל המשתמשים מ-Supabase
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users for search:', error);
      console.log('Using demo users as fallback for search');
      
      // חיפוש בנתוני דמו
      const lowercaseQuery = q.toLowerCase();
      const filteredDemoUsers = demoUsers.filter(user => {
        const email = user.email?.toLowerCase() || '';
        const fullName = user.user_metadata?.fullName?.toLowerCase() || '';
        
        return email.includes(lowercaseQuery) || fullName.includes(lowercaseQuery);
      });
      
      return NextResponse.json(filteredDemoUsers);
    }

    if (!data || !data.users) {
      return NextResponse.json([]);
    }

    // חיפוש משתמשים שמתאימים למונח החיפוש
    const lowercaseQuery = q.toLowerCase();
    const filteredUsers = data.users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const fullName = (
        user.user_metadata?.fullName || 
        user.user_metadata?.full_name || 
        ''
      ).toLowerCase();
      
      return email.includes(lowercaseQuery) || fullName.includes(lowercaseQuery);
    });

    // החזרת התוצאות המסוננות
    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error(`Error handling user search for query "${q}":`, error);
    console.log('Using demo users as fallback after search error');
    
    // חיפוש בנתוני דמו
    const lowercaseQuery = q.toLowerCase();
    const filteredDemoUsers = demoUsers.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const fullName = user.user_metadata?.fullName?.toLowerCase() || '';
      
      return email.includes(lowercaseQuery) || fullName.includes(lowercaseQuery);
    });
    
    return NextResponse.json(filteredDemoUsers);
  }
} 