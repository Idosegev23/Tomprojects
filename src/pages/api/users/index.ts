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

  try {
    // אימות שהמשתמש מחובר (אופציונלי, תלוי בדרישות האבטחה שלך)
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // קבלת רשימת המשתמשים מ-Supabase
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // החזרת הנתונים למשתמש
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error handling user request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 