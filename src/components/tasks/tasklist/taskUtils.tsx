import { 
  FiClock, 
  FiActivity, 
  FiStar, 
  FiCheckCircle, 
  FiList, 
  FiAlertCircle, 
  FiFlag, 
  FiCheck 
} from 'react-icons/fi';

// פונקציה לקבלת צבע לפי סטטוס
export const getStatusColor = (status: string) => {
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

// פונקציה לקבלת אייקון לפי סטטוס
export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'לביצוע':
      return FiClock;
    case 'in_progress':
    case 'בתהליך':
      return FiActivity;
    case 'review':
    case 'לבדיקה':
      return FiStar;
    case 'done':
    case 'הושלם':
      return FiCheckCircle;
    default:
      return FiList;
  }
};

// פונקציה לקבלת טקסט סטטוס בעברית
export const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'todo':
      return 'לביצוע';
    case 'in_progress':
      return 'בתהליך';
    case 'review':
      return 'בבדיקה';
    case 'done':
      return 'הושלם';
    default:
      return status;
  }
};

// פונקציה לקבלת צבע לפי עדיפות
export const getPriorityColor = (priority: string) => {
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

// פונקציה לקבלת אייקון לפי עדיפות 
export const getPriorityIcon = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'גבוהה':
      return FiAlertCircle;
    case 'medium':
    case 'בינונית':
      return FiFlag;
    case 'low':
    case 'נמוכה':
      return FiCheck;
    default:
      return FiFlag;
  }
};

// פונקציה לקבלת טקסט עדיפות בעברית
export const getPriorityText = (priority: string) => {
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
export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'לא נקבע';
  
  try {
    return new Date(dateString).toLocaleDateString('he-IL');
  } catch (e) {
    return 'תאריך לא תקין';
  }
}; 