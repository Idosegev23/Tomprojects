import { Task } from '@/types/supabase';
import { DueStatus } from './types';

// פונקציה לקבלת צבע לפי סטטוס
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'לביצוע':
      return 'gray';
    case 'in_progress':
    case 'בתהליך':
      return 'blue';
    case 'review':
    case 'לבדיקה':
      return 'orange';
    case 'done':
    case 'הושלם':
      return 'green';
    default:
      return 'gray';
  }
};

// פונקציה לקבלת צבע לפי עדיפות
export const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'גבוהה':
      return 'red';
    case 'medium':
    case 'בינונית':
      return 'orange';
    case 'low':
    case 'נמוכה':
      return 'green';
    default:
      return 'gray';
  }
};

// פונקציה לקבלת תווית עדיפות בעברית
export const getPriorityLabel = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'גבוהה';
    case 'medium':
      return 'בינונית';
    case 'low':
      return 'נמוכה';
    default:
      return priority;
  }
};

// פונקציה להמרת תאריך לפורמט מקומי
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'לא נקבע';
  
  try {
    return new Date(dateString).toLocaleDateString('he-IL');
  } catch (e) {
    return 'תאריך לא תקין';
  }
};

// פונקציה לחישוב זמן שנותר עד לתאריך היעד
export const getDueStatus = (dueDate: string | null): DueStatus | null => {
  if (!dueDate) return null;
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'overdue', text: 'באיחור', color: 'red' };
    } else if (diffDays === 0) {
      return { status: 'today', text: 'היום', color: 'orange' };
    } else if (diffDays === 1) {
      return { status: 'tomorrow', text: 'מחר', color: 'yellow' };
    } else if (diffDays <= 3) {
      return { status: 'soon', text: `בעוד ${diffDays} ימים`, color: 'blue' };
    } else {
      return { status: 'future', text: formatDate(dueDate), color: 'gray' };
    }
  } catch (e) {
    return { status: 'invalid', text: 'תאריך לא תקין', color: 'gray' };
  }
};

// פונקציה לקיבוץ משימות לפי סטטוס
export const groupTasksByStatus = (tasks: Task[], statuses: string[]): Record<string, Task[]> => {
  const grouped: Record<string, Task[]> = {};
  
  // יצירת מערך ריק לכל סטטוס
  statuses.forEach(status => {
    grouped[status] = [];
  });
  
  // מיון המשימות לפי סטטוס
  tasks.forEach(task => {
    const status = task.status.toLowerCase();
    if (grouped[status]) {
      grouped[status].push(task);
    } else {
      // אם הסטטוס לא קיים, נוסיף אותו לקבוצת ברירת המחדל
      grouped['todo'].push(task);
    }
  });
  
  return grouped;
};

// פונקציה לקיבוץ משימות לפי שלב
export const groupTasksByStage = (tasks: Task[], stageIds: string[]): Record<string, Task[]> => {
  const grouped: Record<string, Task[]> = {};
  
  // יצירת מערך ריק לכל שלב
  stageIds.forEach(stageId => {
    grouped[stageId] = [];
  });
  
  // מערך למשימות ללא שלב
  grouped['unassigned'] = [];
  
  // מיון המשימות לפי שלב
  tasks.forEach(task => {
    if (task.stage_id && grouped[task.stage_id]) {
      grouped[task.stage_id].push(task);
    } else {
      // אם אין שלב או השלב לא קיים, נוסיף למשימות ללא שלב
      grouped['unassigned'].push(task);
    }
  });
  
  return grouped;
}; 