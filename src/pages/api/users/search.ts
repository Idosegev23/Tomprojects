import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// יצירת לקוח Supabase עם הרשאות מיוחדות לשרת
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // וידוא שהבקשה היא מסוג GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // קבלת מונח החיפוש מהפרמטרים
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // אימות שהמשתמש מחובר (אופציונלי, תלוי בדרישות האבטחה שלך)
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // קבלת כל המשתמשים מ-Supabase
    const { data: allUsers, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users for search:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    if (!allUsers || !allUsers.users) {
      return res.status(200).json([]);
    }

    // חיפוש משתמשים שמתאימים למונח החיפוש
    const lowercaseQuery = q.toLowerCase();
    const filteredUsers = allUsers.users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const fullName = (
        user.user_metadata?.fullName || 
        user.user_metadata?.full_name || 
        ''
      ).toLowerCase();
      
      return email.includes(lowercaseQuery) || fullName.includes(lowercaseQuery);
    });

    // החזרת התוצאות המסוננות
    return res.status(200).json(filteredUsers);
  } catch (error) {
    console.error(`Error handling user search for query "${q}":`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 