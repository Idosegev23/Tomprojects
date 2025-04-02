import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import { ExtendedTask, sortTasksByHierarchicalNumber } from './constants';

interface UseTaskFormProps {
  task?: ExtendedTask | null;
  projectId: string;
  onClose: () => void;
  onTaskCreated?: (task: ExtendedTask) => void;
  onTaskUpdated?: (task: ExtendedTask) => void;
}

export const useTaskForm = ({
  task,
  projectId,
  onClose,
  onTaskCreated,
  onTaskUpdated,
}: UseTaskFormProps) => {
  const isEditMode = !!task;
  
  // פורמט תאריך עבור input מסוג date
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };
  
  // הכנת התאריך הנוכחי בפורמט המתאים ל-input מסוג date
  const getCurrentDateFormatted = (): string => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [formData, setFormData] = useState<Partial<ExtendedTask>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: getCurrentDateFormatted(), // אתחול תאריך ההתחלה לתאריך הנוכחי
    due_date: '',
    project_id: projectId,
    parent_task_id: null,
    responsible: null,
    assignees_info: [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [templateSaveLoading, setTemplateSaveLoading] = useState(false);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [isSubtask, setIsSubtask] = useState(false);
  const [newAssignee, setNewAssignee] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [potentialParentTasks, setPotentialParentTasks] = useState<Task[]>([]);
  const [childTaskOptions, setChildTaskOptions] = useState<Task[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [hierarchyPath, setHierarchyPath] = useState<Array<{id: string, title: string}>>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [createdTaskData, setCreatedTaskData] = useState<ExtendedTask | null>(null);
  
  const toast = useToast();
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      // טיפול ב-assignees_info כמערך (לא כמחרוזת JSON)
      let assigneesInfoArray: string[] = [];
      
      // בדיקה אם יש assignees_info ומהו הפורמט שלו
      if (task.assignees_info) {
        // אם זה כבר מערך, נשתמש בו כמו שהוא
        if (Array.isArray(task.assignees_info)) {
          assigneesInfoArray = [...task.assignees_info];
        } 
        // אם זה מחרוזת JSON, ננסה לפרסר אותה
        else if (typeof task.assignees_info === 'string') {
          try {
            assigneesInfoArray = JSON.parse(task.assignees_info);
            if (!Array.isArray(assigneesInfoArray)) {
              assigneesInfoArray = []; // אם התוצאה אינה מערך, נאפס
            }
          } catch (e) {
            console.error('שגיאה בפירסור assignees_info:', e);
            assigneesInfoArray = [];
          }
        }
      }
      // גיבוי: אם assignees_info ריק אך יש assignees, נשתמש בהם
      else if (Array.isArray(task.assignees)) {
        assigneesInfoArray = [...task.assignees];
      }
      
      // עדכון הפורמט
      setFormData({
        ...task,
        start_date: formatDateForInput(task.start_date),
        due_date: formatDateForInput(task.due_date),
        assignees_info: assigneesInfoArray,
        assignees: assigneesInfoArray, // גם assignees לתאימות לאחור
      });
      
      setIsSubtask(!!task.parent_task_id);
      
      // קביעת רמת המשימה בהתבסס על hierarchical_number או parent_task_id
      if (task.parent_task_id) {
        let level = 2; // ברירת מחדל
        try {
          if (task.hierarchical_number) {
            level = (task.hierarchical_number as string).split('.').length;
          }
        } catch (error) {
          console.error('שגיאה בחישוב רמת המשימה:', error, task.hierarchical_number);
        }
        setSelectedPath([task.id]);
        setHierarchyPath([{ id: task.id, title: task.title || '' }]);
        setChildTaskOptions([]);
        setSelectedParentId(task.parent_task_id);
      } else {
        setSelectedPath([]);
        setHierarchyPath([]);
        setChildTaskOptions([]);
        setSelectedParentId(null);
      }
    } else {
      // איפוס הטופס בעת יצירת משימה חדשה
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        start_date: getCurrentDateFormatted(), // תאריך התחלה הוא תאריך הנוכחי
        due_date: '',
        project_id: projectId,
        parent_task_id: null,
        responsible: null,
        assignees_info: [],
        assignees: [],
      });
      setIsSubtask(false);
      setSelectedPath([]);
      setHierarchyPath([]);
      setChildTaskOptions([]);
      setSelectedParentId(null);
    }
    
    // טעינת משימות אב פוטנציאליות
    const loadParentTasks = async () => {
      try {
        // שימוש בפונקציה הייחודית לטעינת משימות של פרויקט
        const tasks = await taskService.getProjectSpecificTasks(projectId);
        
        // טעינת כל המשימות שיכולות לשמש כמשימות אב
        const potentialTasks = tasks.filter(t => {
          // לא להציג את המשימה הנוכחית כמשימת אב פוטנציאלית
          if (task && t.id === task.id) return false;
          
          // לא להציג משימות שכבר הן תת-משימות של המשימה הנוכחית (אם יש)
          if (task && t.parent_task_id === task.id) return false;
          
          return true;
        });
        
        // מיפוי לפי id לצורך גישה מהירה
        const tasksMap = new Map();
        potentialTasks.forEach(t => tasksMap.set(t.id, t));
        
        // מיון ושמירת כל המשימות הפוטנציאליות לפי מספר היררכי
        setPotentialParentTasks(potentialTasks.sort(sortTasksByHierarchicalNumber));
        
        // סינון משימות שורש (ללא parent_task_id)
        const rootTasks = potentialTasks.filter(t => 
          t.parent_task_id === null || t.parent_task_id === undefined
        );
        
        // מיון המשימות השורשיות לפי מספר היררכי
        const sortedRootTasks = rootTasks.sort(sortTasksByHierarchicalNumber);
        
        setParentTasks(sortedRootTasks);
        
        // אם זה מצב עריכה וכבר יש משימת אב, טען את תתי-המשימות שלה
        if (task && task.parent_task_id) {
          const parentTask = tasksMap.get(task.parent_task_id);
          if (parentTask) {
            // מצא את כל תתי-המשימות של משימת האב
            const subTasks = potentialTasks.filter(t => 
              t.parent_task_id === task.parent_task_id && t.id !== task.id
            );
            
            // מיון תתי-המשימות לפי מספר היררכי
            const sortedSubTasks = subTasks.sort(sortTasksByHierarchicalNumber);
            
            setChildTaskOptions(sortedSubTasks);
          }
        }
      } catch (error) {
        console.error('Error loading parent tasks:', error);
        toast({
          title: "שגיאה בטעינת משימות אב",
          description: "אירעה שגיאה בטעינת משימות שיכולות להיות משימות אב",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    loadParentTasks();
  }, [task, projectId, toast]);
  
  // טיפול במשתפי פעולה
  const handleAddAssignee = () => {
    if (!newAssignee.trim()) return;
    
    // וידוא שיש לנו מערך תקין
    const currentAssignees = Array.isArray(formData.assignees_info) ? 
      [...formData.assignees_info] : [];
    
    // בדיקה אם המשתתף כבר קיים במערך
    if (currentAssignees.includes(newAssignee)) {
      setNewAssignee('');
      return;
    }
    
    // עדכון מצב הטופס עם המערך המעודכן
    setFormData(prev => {
      // יצירת מערך חדש עם המשתתף החדש
      const updatedAssigneesInfo = [...currentAssignees, newAssignee];
      
      return {
        ...prev,
        assignees_info: updatedAssigneesInfo,
        assignees: updatedAssigneesInfo, // גם עדכון שדה assignees לתאימות לאחור
      };
    });
    
    setNewAssignee('');
  };
  
  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setFormData(prev => {
      // וידוא שעובדים עם מערך תקין
      const currentAssignees = Array.isArray(prev.assignees_info) ? 
        [...prev.assignees_info] : [];
      
      // הסרת המשתתף מהמערך
      const updatedAssignees = currentAssignees.filter(a => a !== assigneeToRemove);
      
      return {
        ...prev,
        assignees_info: updatedAssignees,
        assignees: updatedAssignees, // גם עדכון שדה assignees לתאימות לאחור
      };
    });
  };
  
  // טיפול בשינויים בטופס
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ניקוי שגיאות בעת שינוי
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // טיפול בשינוי סוג המשימה (רגילה/תת-משימה)
  const handleSubtaskToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSubtask(isChecked);
    
    if (!isChecked) {
      // אם זו לא תת-משימה, מאפסים את משימת האב
      setFormData(prev => ({ ...prev, parent_task_id: null }));
      setSelectedParentId(null);
      setSelectedPath([]);
      setHierarchyPath([]);
      setChildTaskOptions([]);
    }
  };
  
  // פונקציה לוולידציה של הטופס
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'כותרת המשימה היא שדה חובה';
    }
    
    if (isSubtask && !formData.parent_task_id) {
      newErrors.parent_task_id = 'יש לבחור משימת אב';
    }
    
    if (formData.start_date && formData.due_date && new Date(formData.start_date) > new Date(formData.due_date)) {
      newErrors.due_date = 'תאריך היעד חייב להיות אחרי תאריך ההתחלה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  return {
    formData,
    errors,
    loading,
    templateSaveLoading,
    isSubtask,
    newAssignee, 
    activeTab,
    parentTasks,
    potentialParentTasks,
    childTaskOptions,
    selectedParentId,
    selectedPath,
    hierarchyPath,
    isTemplateDialogOpen,
    templateName,
    createdTaskData,
    isEditMode,
    
    setFormData,
    setErrors,
    setLoading,
    setActiveTab,
    setNewAssignee,
    setTemplateSaveLoading,
    setIsTemplateDialogOpen,
    setTemplateName,
    setCreatedTaskData,
    setChildTaskOptions,
    setSelectedParentId,
    setSelectedPath,
    setHierarchyPath,
    
    handleChange,
    handleAddAssignee,
    handleRemoveAssignee,
    handleSubtaskToggle,
    validateForm,
  };
}; 