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

  // קבלת האימייל מהפרמטרים
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
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
      console.error(`Error fetching users to find email ${email}:`, error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    if (!allUsers || !allUsers.users) {
      return res.status(404).json({ error: 'No users found' });
    }

    // חיפוש המשתמש לפי אימייל
    const user = allUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // החזרת המשתמש שנמצא
    return res.status(200).json(user);
  } catch (error) {
    console.error(`Error handling user request for email ${email}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 