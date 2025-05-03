import { useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import taskTemplateService from '@/lib/services/taskTemplateService';
import { ExtendedTask } from './constants';

interface UseTaskFormActionsProps {
  formData: Partial<ExtendedTask>;
  isSubtask: boolean;
  potentialParentTasks: Task[];
  selectedParentId: string | null;
  selectedPath: string[];
  hierarchyPath: Array<{id: string, title: string}>;
  isEditMode: boolean;
  loading: boolean;
  task?: ExtendedTask | null;
  projectId: string;
  validateForm: () => boolean;
  setLoading: (value: boolean) => void;
  setChildTaskOptions: (tasks: Task[]) => void;
  setSelectedParentId: (id: string | null) => void;
  setFormData: (value: React.SetStateAction<Partial<ExtendedTask>>) => void;
  setSelectedPath: (value: React.SetStateAction<string[]>) => void;
  setHierarchyPath: (value: React.SetStateAction<Array<{id: string, title: string}>>) => void;
  setCreatedTaskData: (value: React.SetStateAction<ExtendedTask | null>) => void;
  setIsTemplateDialogOpen: (value: boolean) => void;
  setTemplateName: (value: string) => void;
  setTemplateSaveLoading: (value: boolean) => void;
  onClose: () => void;
  onTaskCreated?: (task: ExtendedTask) => void;
  onTaskUpdated?: (task: ExtendedTask) => void;
}

export const useTaskFormActions = ({
  formData,
  isSubtask,
  potentialParentTasks,
  selectedParentId,
  selectedPath,
  hierarchyPath,
  isEditMode,
  loading,
  task,
  projectId,
  validateForm,
  setLoading,
  setChildTaskOptions,
  setSelectedParentId,
  setFormData,
  setSelectedPath,
  setHierarchyPath,
  setCreatedTaskData,
  setIsTemplateDialogOpen,
  setTemplateName,
  setTemplateSaveLoading,
  onClose,
  onTaskCreated,
  onTaskUpdated,
}: UseTaskFormActionsProps) => {
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // טיפול בשינוי בחירת משימת האב
  const handleParentTaskChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parentId = e.target.value;
    
    // ניקוי מסלול ההיררכיה הקודם
    setSelectedPath([]);
    setHierarchyPath([]);
    setChildTaskOptions([]);
    
    if (!parentId) {
      setFormData(prev => ({ ...prev, parent_task_id: null }));
      setSelectedParentId(null);
      return;
    }
    
    // עדכון משימת האב הנבחרת
    setSelectedParentId(parentId);
    setFormData(prev => ({ ...prev, parent_task_id: parentId }));
    
    // מציאת משימת האב הנבחרת מתוך הרשימה
    const selectedParent = potentialParentTasks.find(task => task.id === parentId);
    if (selectedParent) {
      // הוספת המשימה למסלול ההיררכיה
      setHierarchyPath([{ id: parentId, title: selectedParent.title || '' }]);
      
      // בדיקה אם יש תתי-משימות למשימה זו
      try {
        const subTasks = potentialParentTasks.filter(task => 
          task.parent_task_id === parentId
        );
        
        // מיון תתי-המשימות על ידי שימוש במיון היררכי
        const sortedSubTasks = [...subTasks].sort((a, b) => {
          // מיון לפי hierarchical_number אם קיים
          if (a.hierarchical_number && b.hierarchical_number) {
            // בדיקה שהערכים הם מחרוזות תקינות
            if (typeof a.hierarchical_number === 'string' && typeof b.hierarchical_number === 'string') {
              return a.hierarchical_number.localeCompare(b.hierarchical_number);
            }
          }
          // אחרת מיון לפי כותרת
          return (a.title || '').localeCompare(b.title || '');
        });
        
        setChildTaskOptions(sortedSubTasks);
      } catch (error) {
        console.error('שגיאה בטעינת תתי-משימות:', error);
        toast({
          title: "שגיאה בטעינת תתי-משימות",
          description: "אירעה שגיאה בטעינת תתי-המשימות",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };
  
  // טיפול בשינוי בחירת תת-משימה
  const handleSubTaskSelection = async (level: number, taskId: string) => {
    if (!taskId) {
      // אם נבחר הערך הריק, נשאיר את ה-parent_task_id כמשימת האב הראשית
      const previousLevelTask = level === 0 ? selectedParentId : selectedPath[level - 1];
      setFormData(prev => ({ ...prev, parent_task_id: previousLevelTask }));
      
      // ניקוי השדות בכל הרמות שלאחר הרמה הנוכחית
      const newPath = selectedPath.slice(0, level);
      setSelectedPath(newPath);
      
      const newHierarchyPath = hierarchyPath.slice(0, level + 1);
      setHierarchyPath(newHierarchyPath);
      return;
    }
    
    // שמירת הבחירה בשלב הנוכחי
    const selectedTask = potentialParentTasks.find(task => task.id === taskId);
    if (!selectedTask) return;
    
    // עדכון מסלול ההיררכיה עד לרמה הנוכחית
    const newPath = [...selectedPath];
    newPath[level] = taskId;
    setSelectedPath(newPath);
    
    // עדכון התצוגה של מסלול ההיררכיה
    const newHierarchyPath = [...hierarchyPath];
    while (newHierarchyPath.length <= level + 1) {
      newHierarchyPath.push({ id: '', title: '' });
    }
    newHierarchyPath[level + 1] = { id: taskId, title: selectedTask.title || '' };
    setHierarchyPath(newHierarchyPath.filter(item => item.id !== '')); // ניקוי פריטים ריקים
    
    // עדכון parent_task_id למשימה הנבחרת האחרונה
    setFormData(prev => ({ ...prev, parent_task_id: taskId }));
    
    // בדיקה אם יש תתי-משימות למשימה זו
    try {
      const nextLevelTasks = potentialParentTasks.filter(task => 
        task.parent_task_id === taskId && task.id !== (task?.id || '')
      );
      
      // מיון תתי-המשימות לרמה הבאה
      const sortedNextLevelTasks = [...nextLevelTasks].sort((a, b) => {
        // מיון לפי hierarchical_number אם קיים
        if (a.hierarchical_number && b.hierarchical_number) {
          // בדיקה שהערכים הם מחרוזות תקינות
          if (typeof a.hierarchical_number === 'string' && typeof b.hierarchical_number === 'string') {
            return a.hierarchical_number.localeCompare(b.hierarchical_number);
          }
        }
        // אחרת מיון לפי כותרת
        return (a.title || '').localeCompare(b.title || '');
      });
      
      // עדכון אפשרויות תתי-המשימות לרמה הבאה
      if (level === 0) {
        setChildTaskOptions(sortedNextLevelTasks);
      }
    } catch (error) {
      console.error('שגיאה בטעינת תתי-משימות לרמה הבאה:', error);
    }
  };
  
  // שמירת המשימה
  const handleSubmit = async (event: React.FormEvent) => {
    console.log('handleSubmit נקרא!', { isEditMode, formData });
    event.preventDefault();
    if (loading) {
      console.log('המערכת במצב טעינה, דילוג על שליחת טופס');
      return;
    }
    
    if (!validateForm()) {
      console.log('הטופס לא תקין, דילוג על שליחה');
      return;
    }
    
    setLoading(true);
    console.log('מגדיר loading=true');
    
    try {
      let result;
      
      // הכנת אובייקט הנתונים לשליחה
      const taskData: Partial<ExtendedTask> = {
        ...formData,
        project_id: projectId,
      };
      
      // בדיקת האם יש צורך לעדכן את המספר ההיררכי
      if (isSubtask && formData.parent_task_id) {
        // וידוא שיש parent_task_id תקין
        taskData.parent_task_id = selectedParentId || formData.parent_task_id;
      } else {
        // משימת שורש ללא משימת אב
        taskData.parent_task_id = null;
      }
      
      console.log('מידע המשימה לשליחה:', taskData);
      
      if (isEditMode && task) {
        // עדכון משימה קיימת
        try {
          result = await taskService.updateTask(task.id, taskData);
          
          toast({
            title: "המשימה עודכנה בהצלחה",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onTaskUpdated) {
            onTaskUpdated(result);
          }
          
          // איפוס מצב הטעינה לפני סיום הפונקציה
          setLoading(false);
          onClose();
        } catch (updateError) {
          console.error('שגיאה בעדכון משימה:', updateError);
          
          const errorMessage = updateError instanceof Error ? updateError.message : 'שגיאה לא ידועה';
          
          // בדיקה אם השגיאה קשורה להרשאות או לבעיית טעינה
          if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || 
              errorMessage.includes('access') || errorMessage.includes('403')) {
            toast({
              title: "אין הרשאות לעריכת משימה",
              description: "אין לך הרשאות מתאימות לעריכת משימה זו.",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            toast({
              title: "המשימה לא נמצאה",
              description: "ייתכן שהמשימה נמחקה או שינתה את מיקומה במערכת.",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          } else {
            toast({
              title: "שגיאה בעדכון המשימה",
              description: errorMessage,
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }
          
          setLoading(false);
        }
      } else {
        // יצירת משימה חדשה
        if (!formData.title) {
          console.log('אין כותרת למשימה, מציג הודעת שגיאה');
          toast({
            title: "שגיאה",
            description: "כותרת המשימה היא שדה חובה",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          setLoading(false);
          return;
        }
        
        // וידוא שיש לנו את כל השדות הנדרשים ובפורמט הנכון
        const assigneesArray = Array.isArray(formData.assignees_info) ? formData.assignees_info : 
                              Array.isArray(formData.assignees) ? formData.assignees : [];
        
        // יצירת אובייקט נקי לשליחה לשרת
        const newTaskData = {
          title: formData.title || '',
          description: formData.description || null,
          project_id: projectId,
          status: formData.status || 'todo',
          priority: formData.priority || 'medium',
          parent_task_id: taskData.parent_task_id, // משתמש בערך שהוגדר למעלה
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
          responsible: formData.responsible || null,
          assignees_info: assigneesArray,
        };
        
        console.log('מנסה ליצור משימה חדשה:', newTaskData);
        
        try {
          // ביצוע קריאה לשרת ליצירת המשימה
          console.log('קורא לשירות taskService.createTask');
          result = await taskService.createTask(newTaskData);
          console.log('משימה נוצרה בהצלחה:', result);
          
          // שמירת המשימה שנוצרה לשימוש בפופאפ התבנית
          setCreatedTaskData(result);
          
          toast({
            title: "המשימה נוצרה בהצלחה",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onTaskCreated) {
            onTaskCreated(result);
          }
          
          // פתיחת פופאפ לשאלה האם לשמור כתבנית
          setTemplateName(result.title); // הצעה לשם התבנית
          
          // חשוב לאפס את מצב הטעינה לפני פתיחת הדיאלוג
          setLoading(false);
          setIsTemplateDialogOpen(true);
        } catch (error) {
          console.error('שגיאה ספציפית בקריאה ליצירת משימה:', error);
          
          // טיפול ספציפי בשגיאת TypeError: Load failed
          if (error instanceof TypeError && (error as Error).message.includes('Load failed')) {
            toast({
              title: "שגיאה בפורמט הנתונים",
              description: "אירעה שגיאה בעיבוד נתוני המשימה. נסה להסיר שדות מיוחדים או לפשט את הנתונים.",
              status: "error",
              duration: 7000,
              isClosable: true,
            });
            
            // ניסיון להסיר שדות בעייתיים ולנסות שוב
            try {
              // יצירת גרסה מפושטת של האובייקט
              const simplifiedData = {
                title: newTaskData.title,
                project_id: newTaskData.project_id,
                status: newTaskData.status,
                priority: newTaskData.priority,
                parent_task_id: newTaskData.parent_task_id,
              };
              
              // ניסיון שני עם אובייקט מפושט
              result = await taskService.createTask(simplifiedData);
              
              // אם הגענו לכאן, הניסיון השני הצליח
              setCreatedTaskData(result);
              
              toast({
                title: "המשימה נוצרה בהצלחה (ללא מידע נוסף)",
                description: "המשימה נוצרה, אך חלק מהשדות הושמטו כדי למנוע שגיאות.",
                status: "success",
                duration: 5000,
                isClosable: true,
              });
              
              if (onTaskCreated) {
                onTaskCreated(result);
              }
              
              setLoading(false);
              onClose();
              return;
            } catch (retryError) {
              console.error('גם הניסיון השני נכשל:', retryError);
              // נמשיך לזרוק את השגיאה המקורית
            }
          }
          
          const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
          
          toast({
            title: "שגיאה ביצירת המשימה",
            description: errorMessage,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('שגיאה בשמירת משימה:', err);
      
      toast({
        title: "שגיאה בשמירת המשימה",
        description: err instanceof Error ? err.message : 'אירעה שגיאה בלתי צפויה',
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      setLoading(false);
    }
  };
  
  // שמירת המשימה כתבנית ברירת מחדל
  const handleSaveAsTemplate = async () => {
    if (!formData.title) return;
    
    try {
      setTemplateSaveLoading(true);
      
      // הכנת המידע של התבנית - נוודא שהנתונים נקיים ותקינים
      const templateData = {
        name: formData.title,
        is_default: false,
        task_data: {
          title: formData.title,
          description: formData.description || null,
          status: formData.status || 'todo',
          priority: formData.priority || 'medium',
          parent_task_id: null, 
          hierarchical_number: null,
          category: formData.category || null,
          responsible: null,
          assignees_info: [],
        }
      };
      
      // שימוש בשירות האמיתי לשמירת התבנית
      await taskTemplateService.saveTemplate(templateData);
      
      toast({
        title: "התבנית נשמרה בהצלחה",
        description: `המשימה "${formData.title}" נשמרה כתבנית ברירת מחדל`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving task template:', error);
      toast({
        title: "שגיאה בשמירת התבנית",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      // וודא שמצב הטעינה מבוטל תמיד
      setTemplateSaveLoading(false);
      setIsTemplateDialogOpen(false);
      onClose();
    }
  };
  
  // סגירת פופאפ התבנית ללא שמירה
  const handleCloseTemplateDialog = () => {
    setIsTemplateDialogOpen(false);
    onClose();
  };
  
  return {
    cancelRef,
    handleParentTaskChange,
    handleSubTaskSelection,
    handleSubmit,
    handleSaveAsTemplate,
    handleCloseTemplateDialog,
  };
}; 