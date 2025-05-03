import { FaList, FaClock, FaClipboardCheck } from 'react-icons/fa';
import { CheckIcon } from '@chakra-ui/icons';
import { Task } from '@/types/supabase';
import React from 'react';

// מדרג עדיפויות עם צבעים
export const PRIORITY_MAP = {
  urgent: { color: "red.500", label: "דחוף" },
  high: { color: "orange.400", label: "גבוהה" },
  medium: { color: "yellow.400", label: "בינונית" },
  low: { color: "green.400", label: "נמוכה" },
};

// מדרג סטטוסים עם צבעים
export const STATUS_MAP = {
  todo: { color: "gray.400", label: "לביצוע", iconType: "FaList" },
  in_progress: { color: "blue.400", label: "בתהליך", iconType: "FaClock" },
  review: { color: "purple.400", label: "בבדיקה", iconType: "FaClipboardCheck" },
  done: { color: "green.400", label: "הושלם", iconType: "CheckIcon" },
};

// הרחבת הטיפוס של המשימה כדי להכיל את כל השדות הדרושים
export interface ExtendedTask extends Task {
  // assignees_info וגם assignees זמינים דרך ה-Task שהורחב
  dropbox_folder?: string;
}

export interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  projectId: string;
  initialData?: Partial<ExtendedTask>;
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (task: any) => void;
}

// פונקציית עזר למיון משימות לפי מספר היררכי
export const sortTasksByHierarchicalNumber = (taskA: Task, taskB: Task) => {
  // פונקציית עזר לבדיקה האם ערך הוא מחרוזת תקינה
  const isValidString = (value: any): boolean => {
    return typeof value === 'string' && value !== null && value.length > 0;
  };
  
  // מיון לפי מספר היררכי אם קיים בשני הפריטים
  if (isValidString(taskA.hierarchical_number) && isValidString(taskB.hierarchical_number)) {
    try {
      const aParts = (taskA.hierarchical_number as string).split('.').map(Number);
      const bParts = (taskB.hierarchical_number as string).split('.').map(Number);
      
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i] - bParts[i];
        }
      }
      
      return aParts.length - bParts.length;
    } catch (error) {
      console.error('שגיאה במיון לפי מספר היררכי:', error, { a: taskA.hierarchical_number, b: taskB.hierarchical_number });
      // במקרה של שגיאה, נחזור למיון לפי כותרת
      return isValidString(taskA.title) && isValidString(taskB.title) ? 
        taskA.title.localeCompare(taskB.title) : 0;
    }
  } else if (isValidString(taskA.hierarchical_number)) {
    return -1; // a מופיע קודם
  } else if (isValidString(taskB.hierarchical_number)) {
    return 1; // b מופיע קודם
  }
  
  // מיון לפי כותרת כברירת מחדל
  return isValidString(taskA.title) && isValidString(taskB.title) ? 
    taskA.title.localeCompare(taskB.title) : 0;
};

// פונקציות עזר לצבעים וסטטוסים
export const getStatusColor = (status: string): string => {
  return STATUS_MAP[status as keyof typeof STATUS_MAP]?.color || "gray.500";
};

export const getStatusLabel = (status: string): string => {
  return STATUS_MAP[status as keyof typeof STATUS_MAP]?.label || status;
};

export const getPriorityColor = (priority: string): string => {
  return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.color || "gray.500";
};

export const getPriorityLabel = (priority: string): string => {
  return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.label || priority;
}; 