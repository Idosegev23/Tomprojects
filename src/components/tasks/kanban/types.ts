import { Task as BaseTask, Stage, Project } from '@/types/supabase';

// הרחבת הטיפוס של משימה לכלול מידע נוסף
export interface Task extends Omit<BaseTask, 'assignees'> {
  // מחליף את assignees המקורי
  assignees?: string[] | null;
  
  // תת-משימות
  subtasks?: Task[];
  
  // שדות נוספים
  tags?: string[];
  collaborators?: string[];
  
  // שדות עזר לתצוגה
  stageName?: string;
  stageColor?: string;
}

// טיפוסים משותפים לקומפוננטות הקנבן
export interface TaskKanbanProps {
  projectId: string;
  tasks: Task[];
  stages: Stage[];
  projects?: Project[];
  isLoading?: boolean;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskCreated?: (task: Task) => void;
  getProjectName?: (projectId: string) => string;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onStageChange?: (taskId: string, stageId: string) => void;
}

// טיפוס לעמודת קנבן
export interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  isCollapsed: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onToggleCollapse: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  getProjectName: (projectId: string) => string;
}

// טיפוס לכרטיס משימה
export interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  getProjectName: (projectId: string) => string;
}

// טיפוס לכותרת הקנבן
export interface TaskKanbanHeaderProps {
  viewMode: 'status' | 'stage' | 'category';
  setViewMode: (mode: 'status' | 'stage' | 'category') => void;
  hasStages: boolean;
}

// טיפוס למידע על תאריך יעד
export interface DueStatus {
  status: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future' | 'invalid';
  text: string;
  color: string;
}

// מיפוי סטטוסים לתצוגה בעברית
export const statusLabels: Record<string, string> = {
  'todo': 'לביצוע',
  'in_progress': 'בתהליך',
  'review': 'בבדיקה',
  'done': 'הושלם'
};

// הגדרת הסטטוסים האפשריים
export const statuses = ['todo', 'in_progress', 'review', 'done']; 