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

  // קבלת מזהה המשתמש מה-URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // אימות שהמשתמש מחובר (אופציונלי, תלוי בדרישות האבטחה שלך)
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // קבלת מידע על המשתמש מ-Supabase
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // החזרת הנתונים למשתמש
    return res.status(200).json(user);
  } catch (error) {
    console.error(`Error handling user request for ID ${id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 