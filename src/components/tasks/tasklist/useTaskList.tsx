import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { Task, Stage } from '@/types/supabase';
import { ExtendedStage } from '@/types/extendedTypes';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';

// טיפוס למשימה עם שדות נוספים
export interface TaskWithStage extends Task {
  stageName?: string;
  stageColor?: string;
}

// פרמטרים עבור ההוק
interface UseTaskListParams {
  projectId: string;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

// ערך החזרה מההוק
interface UseTaskListReturn {
  tasks: TaskWithStage[];
  stages: ExtendedStage[];
  loading: boolean;
  error: string | null;
  selectedTasks: string[];
  selectedTask: Task | null;
  isTaskModalOpen: boolean;
  
  // פונקציות לניהול המודל
  setIsTaskModalOpen: (isOpen: boolean) => void;
  setSelectedTask: (task: Task | null) => void;
  
  // פונקציות לעבודה עם משימות
  handleCreateTask: () => void;
  handleEditTask: (task: Task) => void;
  handleTaskCreated: (newTask: Task) => void;
  handleTaskUpdated: (updatedTask: Task) => void;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleRefresh: () => Promise<void>;
  
  // פונקציות לעבודה עם בחירת משימות
  handleTaskSelection: (taskId: string, isSelected: boolean) => void;
  handleSelectAll: (isSelected: boolean) => void;
  handleDeleteSelected: () => Promise<void>;
  
  // פונקציות עזר
  getParentTask: (taskId: string | null) => Task | undefined;
}

export function useTaskList({
  projectId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted
}: UseTaskListParams): UseTaskListReturn {
  const [tasks, setTasks] = useState<TaskWithStage[]>([]);
  const [stages, setStages] = useState<ExtendedStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const toast = useToast();
  
  // פונקציה לטעינת הנתונים
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // טעינת שלבים
      const stagesData = await stageService.getProjectStages(projectId);
      
      // הוספת צבעים לשלבים אם אין להם
      const stagesWithColors = stagesData.map((stage, index) => {
        // צבעים ברירת מחדל
        const defaultColors = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'yellow', 'red', 'cyan'];
        
        // יצירת אובייקט מסוג ExtendedStage עם צבע
        return {
          ...stage,
          color: defaultColors[index % defaultColors.length]
        } as ExtendedStage;
      });
      
      setStages(stagesWithColors);
      
      // טעינת משימות
      const tasksData = await taskService.getProjectSpecificTasks(projectId);
      
      // הוספת שם השלב לכל משימה
      const tasksWithStage: TaskWithStage[] = tasksData.map(task => {
        const stage = stagesWithColors.find(s => s.id === task.stage_id);
        return {
          ...task,
          stageName: stage?.title || 'ללא שלב',
          stageColor: stage?.color || 'gray',
        };
      });
      
      setTasks(tasksWithStage);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('אירעה שגיאה בטעינת הנתונים');
      
      toast({
        title: 'שגיאה בטעינת נתונים',
        description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);
  
  // טעינת נתונים בטעינה ראשונית
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // פונקציה לפתיחת מודל יצירת משימה חדשה
  const handleCreateTask = () => {
    console.log('handleCreateTask נקרא - פתיחת מודל יצירת משימה');
    setSelectedTask(null);
    setIsTaskModalOpen(true);
    console.log('isTaskModalOpen שונה ל-true:', isTaskModalOpen);
  };
  
  // פונקציה לטיפול ביצירת משימה חדשה
  const handleTaskCreated = (newTask: Task) => {
    // בדיקה אם המשימה שייכת לפרויקט הנוכחי
    if (newTask.project_id !== projectId) {
      return;
    }
  
    // הוספת השלב למשימה החדשה
    const stage = stages.find(s => s.id === newTask.stage_id);
    const taskWithStage: TaskWithStage = {
      ...newTask,
      stageName: stage?.title || 'ללא שלב',
      stageColor: stage?.color || 'gray',
    };
    
    setTasks(prev => [...prev, taskWithStage]);
    
    if (onTaskCreated) {
      onTaskCreated(newTask);
    }
    
    toast({
      title: 'משימה נוצרה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציה לטיפול בעדכון משימה
  const handleTaskUpdated = (updatedTask: Task) => {
    // בדיקה אם המשימה שייכת לפרויקט הנוכחי
    if (updatedTask.project_id !== projectId) {
      return;
    }
    
    // הוספת השלב למשימה המעודכנת
    const stage = stages.find(s => s.id === updatedTask.stage_id);
    const taskWithStage: TaskWithStage = {
      ...updatedTask,
      stageName: stage?.title || 'ללא שלב',
      stageColor: stage?.color || 'gray',
    };
    
    setTasks(tasks.map(task => (task.id === updatedTask.id ? taskWithStage : task)));
    setSelectedTask(null);
    setIsTaskModalOpen(false);
    
    if (onTaskUpdated) {
      onTaskUpdated(updatedTask);
    }
    
    toast({
      title: 'משימה עודכנה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  // פונקציה לטיפול במחיקת משימה
  const handleDeleteTask = async (taskId: string) => {
    try {
      // מציאת המשימה כדי לקבל את ה-project_id שלה
      const taskToDelete = tasks.find(task => task.id === taskId);
      
      // בדיקה אם יש תת-משימות
      const childTasks = tasks.filter(task => task.parent_task_id === taskId);
      
      let shouldDelete = true;
      if (childTasks.length > 0) {
        shouldDelete = window.confirm(`האם אתה בטוח שברצונך למחוק משימה זו? המשימה כוללת ${childTasks.length} תתי-משימות שיימחקו גם הן.`);
      } else {
        shouldDelete = window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?');
      }
      
      if (shouldDelete) {
        console.log(`[useTaskList] מנסה למחוק משימה ${taskId} מפרויקט ${taskToDelete?.project_id || projectId}`);
        
        // שימוש ב-project_id של המשימה או של הפרויקט הנוכחי
        const result = await taskService.deleteTask(taskId, taskToDelete?.project_id || projectId);
        
        setTasks(tasks.filter(task => task.id !== taskId && task.parent_task_id !== taskId));
        
        if (onTaskDeleted) {
          onTaskDeleted(taskId);
        }
        
        // הצגת הודעה על מחיקת המשימה ותתי-המשימות
        if (result.deletedSubtasks && result.deletedSubtasks.length > 0) {
          toast({
            title: 'המשימה נמחקה בהצלחה',
            description: `נמחקו גם ${result.deletedSubtasks.length} תתי-משימות`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'משימה נמחקה בהצלחה',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
        
        // עדכון ההיררכיה אחרי המחיקה
        if (taskToDelete && taskToDelete.parent_task_id) {
          // אם נמחקה תת-משימה, עדכון ההיררכיה של האחיות
          await updateHierarchyAfterDelete(taskToDelete.parent_task_id);
        } else {
          // אם נמחקה משימת-אב, עדכון ההיררכיה של משימות אב אחרות
          await updateHierarchyAfterDelete(null);
        }
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      
      toast({
        title: 'שגיאה במחיקת המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // פונקציה לפתיחת מודל עריכת משימה
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  // פונקציה לטיפול בבחירת משימה
  const handleTaskSelection = (taskId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };
  
  // פונקציה לטיפול בבחירת כל המשימות
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasks(tasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };
  
  // פונקציה לטיפול במחיקת משימות נבחרות
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;
    
    // בדיקה אם יש תתי-משימות שיימחקו
    const childTaskIds = selectedTasks.flatMap(selectedId => 
      tasks.filter(task => task.parent_task_id === selectedId).map(t => t.id)
    );
    
    // הסרת כפילויות - ייתכן שתת-משימה כבר מסומנת למחיקה
    const additionalChildTasks = childTaskIds.filter(id => !selectedTasks.includes(id));
    
    let shouldDelete = true;
    if (additionalChildTasks.length > 0) {
      shouldDelete = window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedTasks.length} משימות? פעולה זו תמחק גם ${additionalChildTasks.length} תתי-משימות נוספות.`);
    } else {
      shouldDelete = window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedTasks.length} משימות?`);
    }
    
    if (shouldDelete) {
      try {
        // מחיקת כל המשימות הנבחרות
        const results = await Promise.all(selectedTasks.map(taskId => {
          const task = tasks.find(t => t.id === taskId);
          return taskService.deleteTask(taskId, task?.project_id || projectId);
        }));
        
        // עדכון הרשימה המקומית
        setTasks(tasks.filter(task => !selectedTasks.includes(task.id) && !additionalChildTasks.includes(task.id)));
        
        // עדכון ההורה
        if (onTaskDeleted) {
          selectedTasks.forEach(taskId => onTaskDeleted(taskId));
        }
        
        // איפוס הבחירה
        setSelectedTasks([]);
        
        // חישוב כמה תתי-משימות נמחקו בסך הכל
        const totalDeletedSubtasks = results.reduce((total, result) => 
          total + (result.deletedSubtasks?.length || 0), 0
        );
        
        // הצגת הודעה על מחיקת המשימות ותתי-המשימות
        if (totalDeletedSubtasks > 0 || additionalChildTasks.length > 0) {
          toast({
            title: 'המשימות נמחקו בהצלחה',
            description: `נמחקו ${selectedTasks.length} משימות ו-${totalDeletedSubtasks} תתי-משימות`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'המשימות נמחקו בהצלחה',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
        
        // עדכון ההיררכיה אחרי המחיקה - מעדכנים את כל התרשים
        await updateHierarchyAfterDelete(null);
        
      } catch (err) {
        console.error('Error deleting tasks:', err);
        
        toast({
          title: 'שגיאה במחיקת המשימות',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  // פונקציה לטעינת הנתונים מחדש
  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadData();
      
      toast({
        title: 'הנתונים רועננו בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error refreshing data:', err);
      toast({
        title: 'שגיאה ברענון נתונים',
        description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // פונקציה שתחזיר את המשימה הראשית של משימה
  const getParentTask = (taskId: string | null): Task | undefined => {
    if (!taskId) return undefined;
    return tasks.find(t => t.id === taskId);
  };
  
  // פונקציה לעדכון ההיררכיה לאחר מחיקת משימה
  const updateHierarchyAfterDelete = async (parentTaskId: string | null) => {
    try {
      setLoading(true);
      
      // ביצוע בקשה לשרת לעדכון ההיררכיה
      await taskService.reorderTasks(projectId, parentTaskId, []);
      
      // טעינת המשימות מחדש עם ההיררכיה המעודכנת
      await loadData();
      
      console.log(`היררכיית המשימות עודכנה לאחר מחיקה של משימה ${parentTaskId ? `תחת הורה ${parentTaskId}` : 'ראשית'}`);
    } catch (err) {
      console.error('שגיאה בעדכון ההיררכיה לאחר מחיקה:', err);
      toast({
        title: 'שגיאה בעדכון ההיררכיה',
        description: 'המשימה נמחקה, אך היררכיית המשימות לא עודכנה. יש לרענן ידנית.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  return {
    tasks,
    stages,
    loading,
    error,
    selectedTasks,
    selectedTask,
    isTaskModalOpen,
    setIsTaskModalOpen,
    setSelectedTask,
    handleCreateTask,
    handleEditTask,
    handleTaskCreated,
    handleTaskUpdated,
    handleDeleteTask,
    handleRefresh,
    handleTaskSelection,
    handleSelectAll,
    handleDeleteSelected,
    getParentTask
  };
} 