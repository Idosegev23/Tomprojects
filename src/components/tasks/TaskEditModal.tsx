import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  FormErrorMessage,
  VStack,
  HStack,
  useToast,
  Badge,
  useColorModeValue,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Icon,
  Switch,
  Tag,
  TagLabel,
  Avatar,
  Wrap,
  WrapItem,
  CloseButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  Box,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { Task } from '@/types/supabase';
import taskService from '@/lib/services/taskService';
import taskTemplateService from '@/lib/services/taskTemplateService';
import { FaCalendarAlt, FaClock, FaClipboardCheck, FaList, FaTasks, FaUserCircle, FaUsers, FaChevronLeft, FaSave } from 'react-icons/fa';
import { CheckIcon } from '@chakra-ui/icons';

// מדרג עדיפויות עם צבעים
const PRIORITY_MAP = {
  urgent: { color: "red.500", label: "דחוף" },
  high: { color: "orange.400", label: "גבוהה" },
  medium: { color: "yellow.400", label: "בינונית" },
  low: { color: "green.400", label: "נמוכה" },
};

// מדרג סטטוסים עם צבעים
const STATUS_MAP = {
  todo: { color: "gray.400", label: "לביצוע", icon: <FaList /> },
  in_progress: { color: "blue.400", label: "בתהליך", icon: <FaClock /> },
  review: { color: "purple.400", label: "בבדיקה", icon: <FaClipboardCheck /> },
  done: { color: "green.400", label: "הושלם", icon: <CheckIcon /> },
};

// הרחבת הטיפוס של המשימה כדי להכיל את כל השדות הדרושים
interface ExtendedTask extends Task {
  // assignees_info וגם assignees זמינים דרך ה-Task שהורחב
}

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: ExtendedTask | null;
  projectId: string;
  initialData?: Partial<ExtendedTask>;
  onTaskCreated?: (task: ExtendedTask) => void;
  onTaskUpdated?: (task: ExtendedTask) => void;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  initialData,
  onTaskCreated,
  onTaskUpdated,
}) => {
  const isEditMode = !!task;
  const [formData, setFormData] = useState<Partial<ExtendedTask>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    start_date: '',
    due_date: '',
    project_id: projectId,
    parent_task_id: null,
    responsible: null,
    assignees_info: [], // שימוש ב-assignees_info במקום assignees
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
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  // צבעי רקע לפי מצב התצוגה החשוכה/בהירה
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // טעינת נתוני המשימה בעת עריכה
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        assignees_info: Array.isArray(task.assignees_info) ? task.assignees_info : 
                        Array.isArray(task.assignees) ? task.assignees : [],
      });
      setIsSubtask(!!task.parent_task_id);
      
      // קביעת רמת המשימה בהתבסס על hierarchical_number או parent_task_id
      if (task.parent_task_id) {
        let level = 2; // ברירת מחדל
        try {
          if (task.hierarchical_number) {
            level = task.hierarchical_number.split('.').length;
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
        start_date: '',
        due_date: '',
        project_id: projectId,
        parent_task_id: null,
        responsible: null,
        assignees_info: [], // שימוש ב-assignees_info במקום assignees
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
        
        console.log("כל המשימות שנטענו:", tasks.length);
        
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
        
        // רישום מידע דיבוג על היררכיית המשימות
        console.log("--------- מידע משימות ---------");
        potentialTasks.forEach(t => {
          console.log(`משימה: ${t.title} (ID: ${t.id}), parent_id: ${t.parent_task_id || 'אין'}, מספר היררכי: ${t.hierarchical_number || 'אין'}`);
        });
        console.log("--------------------------------");
        
        setPotentialParentTasks(potentialTasks);
        
        // סינון משימות שורש (ללא parent_task_id)
        const rootTasks = potentialTasks.filter(t => 
          t.parent_task_id === null || t.parent_task_id === undefined
        );
        
        // מיון המשימות לפי כותרת
        const sortedRootTasks = rootTasks.sort((a, b) => {
          // מיון לפי מספר היררכי אם קיים, אחרת לפי כותרת
          if (a.hierarchical_number && b.hierarchical_number) {
            // שימוש במיון מספרי במקום localeCompare למנוע שגיאות
            const aNum = a.hierarchical_number.split('.').map(Number);
            const bNum = b.hierarchical_number.split('.').map(Number);
            
            for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
              if (aNum[i] !== bNum[i]) {
                return aNum[i] - bNum[i];
              }
            }
            
            return aNum.length - bNum.length;
          } else if (a.hierarchical_number) {
            return -1; // a מופיע קודם
          } else if (b.hierarchical_number) {
            return 1; // b מופיע קודם
          }
          return a.title.localeCompare(b.title);
        });
        
        setParentTasks(sortedRootTasks);
        
        console.log('מספר משימות אב שורשיות:', sortedRootTasks.length);
        
        // אם זה מצב עריכה וכבר יש משימת אב, טען את תתי-המשימות שלה
        if (task && task.parent_task_id) {
          const parentTask = tasksMap.get(task.parent_task_id);
          if (parentTask) {
            console.log(`טוען תתי-משימות של ${parentTask.title} (משימת האב הנוכחית)`);
            
            // מצא את כל תתי-המשימות של משימת האב
            const subTasks = potentialTasks.filter(t => 
              t.parent_task_id === task.parent_task_id && t.id !== task.id
            );
            
            console.log(`נמצאו ${subTasks.length} תתי-משימות למשימת האב ${parentTask.title}`);
            setChildTaskOptions(subTasks);
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
  }, [task, projectId]);
  
  // טיפול במשתפי פעולה
  const handleAddAssignee = () => {
    if (!newAssignee.trim()) return;
    
    const currentAssignees = Array.isArray(formData.assignees_info) ? formData.assignees_info : [];
    
    if (currentAssignees.includes(newAssignee)) {
      setNewAssignee('');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      assignees_info: [...currentAssignees, newAssignee],
      assignees: [...currentAssignees, newAssignee], // עדכון שדה ה-assignees לתאימות לאחור
    }));
    
    setNewAssignee('');
  };
  
  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setFormData(prev => {
      const currentAssignees = Array.isArray(prev.assignees_info) ? prev.assignees_info : [];
      const updatedAssignees = currentAssignees.filter(a => a !== assigneeToRemove);
      return {
        ...prev,
        assignees_info: updatedAssignees,
        assignees: updatedAssignees, // עדכון שדה ה-assignees לתאימות לאחור
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
      
      console.log(`נבחרה משימת אב: ${selectedParent.title} (ID: ${parentId})`);
      console.log(`מחפש תתי-משימות של ${selectedParent.title}...`);
      
      // הדפסת כל המשימות לצורך דיבוג
      console.log("כל המשימות הפוטנציאליות:");
      potentialParentTasks.forEach(t => {
        console.log(`משימה: ${t.title} (ID: ${t.id}), parent_id: ${t.parent_task_id || 'אין'}`);
      });
      
      // בדיקה אם יש תתי-משימות למשימה זו
      try {
        // שיפור הסינון: אנחנו רוצים את כל המשימות שה-parent_task_id שלהן הוא parentId
        const subTasks = potentialParentTasks.filter(task => 
          task.parent_task_id === parentId
        );
        
        // הדפסת כל תתי-המשימות שנמצאו (דיבוג)
        console.log(`----- תתי-משימות של ${selectedParent.title} -----`);
        subTasks.forEach(st => {
          console.log(`תת-משימה: ${st.title} (ID: ${st.id}), parent_id: ${st.parent_task_id}`);
        });
        console.log(`סה"כ נמצאו ${subTasks.length} תתי-משימות`);
        console.log(`----------------------------------------`);
        
        // מיון לפי מספר היררכי או כותרת
        const sortedSubTasks = subTasks.sort((a, b) => {
          if (a.hierarchical_number && b.hierarchical_number) {
            // שימוש במיון מספרי במקום localeCompare למנוע שגיאות
            const aNum = a.hierarchical_number.split('.').map(Number);
            const bNum = b.hierarchical_number.split('.').map(Number);
            
            for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
              if (aNum[i] !== bNum[i]) {
                return aNum[i] - bNum[i];
              }
            }
            
            return aNum.length - bNum.length;
          } else if (a.hierarchical_number) {
            return -1; // a מופיע קודם
          } else if (b.hierarchical_number) {
            return 1; // b מופיע קודם
          }
          return a.title?.localeCompare(b.title || '') || 0;
        });
        
        console.log(`נמצאו ${sortedSubTasks.length} תתי-משימות למשימה ${selectedParent.title}`);
        setChildTaskOptions(sortedSubTasks);
        
        // אם אין תתי-משימות, מציג הודעה בלוג
        if (sortedSubTasks.length === 0) {
          console.log(`אין תתי-משימות למשימה ${selectedParent.title}`);
        }
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
      
      // מיון לפי מספר היררכי או כותרת
      const sortedNextLevelTasks = nextLevelTasks.sort((a, b) => {
        if (a.hierarchical_number && b.hierarchical_number) {
          // שימוש במיון מספרי במקום localeCompare למנוע שגיאות
          const aNum = a.hierarchical_number.split('.').map(Number);
          const bNum = b.hierarchical_number.split('.').map(Number);
          
          for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
            if (aNum[i] !== bNum[i]) {
              return aNum[i] - bNum[i];
            }
          }
          
          return aNum.length - bNum.length;
        } else if (a.hierarchical_number) {
          return -1; // a מופיע קודם
        } else if (b.hierarchical_number) {
          return 1; // b מופיע קודם
        }
        return a.title?.localeCompare(b.title || '') || 0;
      });
      
      console.log(`נמצאו ${sortedNextLevelTasks.length} תתי-משימות לתת-משימה ${selectedTask.title}`);
      
      // עדכון אפשרויות תתי-המשימות לרמה הבאה
      if (level === 0) {
        setChildTaskOptions(sortedNextLevelTasks);
      } else {
        // אם זו רמה שנייה או גבוהה יותר, נעדכן את האפשרויות בצורה מתאימה
        // (במקרה זה אפשר להוסיף לוגיקה מורכבת יותר אם צריך)
      }
    } catch (error) {
      console.error('שגיאה בטעינת תתי-משימות לרמה הבאה:', error);
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
  
  // שמירת המשימה
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let result;
      
      // הכנת אובייקט הנתונים לשליחה
      const taskData: Partial<ExtendedTask> = {
        ...formData,
        project_id: projectId,
      };
      
      // בדיקת האם יש צורך לעדכן את המספר ההיררכי
      if (isSubtask && formData.parent_task_id) {
        console.log(`יוצר/מעדכן תת-משימה ברמה: ${selectedPath.length - 1}, עם משימת אב: ${selectedParentId}`);
        
        // לא צריך להגדיר את hierarchical_number ידנית - השרת יחשב אותו
        // אבל אנחנו כן מגדירים את parent_task_id
        taskData.parent_task_id = formData.parent_task_id;
      } else {
        // משימת שורש ללא משימת אב
        taskData.parent_task_id = null;
        
        // hierarchical_number יחושב על ידי השרת
      }
      
      if (isEditMode && task) {
        // עדכון משימה קיימת
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
      } else {
        // יצירת משימה חדשה
        if (!formData.title) {
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
        
        // וידוא שיש לנו את כל השדות הנדרשים
        const newTaskData = {
          title: formData.title || '',
          description: formData.description || null,
          project_id: projectId,
          status: formData.status || 'todo',
          priority: formData.priority || 'medium',
          parent_task_id: taskData.parent_task_id,
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
          responsible: formData.responsible || null,
          assignees: Array.isArray(formData.assignees) ? formData.assignees : 
                     Array.isArray(formData.assignees_info) ? formData.assignees_info : [],
        };
        
        // ביצוע קריאה לשרת ליצירת המשימה
        result = await taskService.createTask(newTaskData);
        
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
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "שגיאה בשמירת המשימה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // תמיד לאפס את מצב הטעינה גם במקרה של שגיאה
      setLoading(false);
    }
  };
  
  // שמירת המשימה כתבנית ברירת מחדל
  const handleSaveAsTemplate = async () => {
    if (!createdTaskData) return;
    
    try {
      setTemplateSaveLoading(true);
      
      // הכנת המידע של התבנית
      const templateData = {
        name: templateName || createdTaskData.title,
        is_default: false, // שינוי להסרת השימוש ב-is_default כי העמודה לא קיימת
        task_data: {
          title: createdTaskData.title,
          description: createdTaskData.description,
          status: createdTaskData.status,
          priority: createdTaskData.priority,
          parent_task_id: createdTaskData.parent_task_id,
          hierarchical_number: createdTaskData.hierarchical_number, // שמירת המספר ההיררכי אם קיים
          category: createdTaskData.category,
          responsible: null, // שינוי מ-"מערכת" ל-null כדי למנוע שגיאת סינטקס UUID
          // שדות נוספים שאתה רוצה לשמור בתבנית
        }
      };
      
      console.log('שומר תבנית משימה:', templateData);
      
      // שימוש בשירות האמיתי לשמירת התבנית
      await taskTemplateService.saveTemplate(templateData);
      
      toast({
        title: "התבנית נשמרה בהצלחה",
        description: `המשימה "${templateName || createdTaskData.title}" נשמרה כתבנית ברירת מחדל`,
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
  
  // פונקציות עזר לצבעים וסטטוסים
  const getStatusColor = (status: string) => {
    return STATUS_MAP[status as keyof typeof STATUS_MAP]?.color || "gray.500";
  };
  
  const getStatusLabel = (status: string): string => {
    return STATUS_MAP[status as keyof typeof STATUS_MAP]?.label || status;
  };
  
  const getPriorityColor = (priority: string): string => {
    return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.color || "gray.500";
  };
  
  const getPriorityLabel = (priority: string): string => {
    return PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]?.label || priority;
  };
  
  // רינדור הכותרת של המודל
  const renderModalHeader = () => (
    <ModalHeader 
      bg={getPriorityColor(formData.priority || 'medium')} 
      color="white" 
      borderTopRadius="md"
      display="flex"
      alignItems="center"
      p={4}
    >
      <Icon as={FaTasks} mr={2} />
      {isEditMode ? 'עריכת משימה' : 'יצירת משימה חדשה'}
      {isEditMode && (
        <Badge ml={2} colorScheme={getStatusColor(formData.status || 'todo').split('.')[0]}>
          {getStatusLabel(formData.status || 'todo')}
        </Badge>
      )}
    </ModalHeader>
  );
  
  // רינדור החלק הבסיסי של המשימה
  const renderBasicInfo = () => (
    <VStack spacing={4} align="stretch">
      <FormControl isRequired isInvalid={!!errors.title}>
        <FormLabel fontWeight="bold">כותרת</FormLabel>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaTasks} color="gray.400" />
          </InputLeftElement>
          <Input 
            name="title" 
            value={formData.title || ''} 
            onChange={handleChange} 
            placeholder="הזן כותרת למשימה"
            borderRadius="md"
          />
        </InputGroup>
        {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
      </FormControl>
      
      <FormControl>
        <FormLabel fontWeight="bold">תיאור</FormLabel>
        <Textarea 
          name="description" 
          value={formData.description || ''} 
          onChange={handleChange} 
          placeholder="הזן תיאור למשימה"
          rows={3}
          borderRadius="md"
        />
      </FormControl>
      
      <SimpleGrid columns={2} spacing={4}>
        <FormControl>
          <FormLabel fontWeight="bold">סטטוס</FormLabel>
          <Select 
            name="status" 
            value={formData.status || 'todo'} 
            onChange={handleChange}
            borderRadius="md"
          >
            {Object.entries(STATUS_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
        
        <FormControl>
          <FormLabel fontWeight="bold">עדיפות</FormLabel>
          <Select 
            name="priority" 
            value={formData.priority || 'medium'} 
            onChange={handleChange}
            borderRadius="md"
          >
            {Object.entries(PRIORITY_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>
    </VStack>
  );
  
  // רינדור תאריכים
  const renderSchedule = () => (
    <VStack spacing={4} align="stretch">
      <SimpleGrid columns={2} spacing={4}>
        <FormControl>
          <FormLabel fontWeight="bold">תאריך התחלה</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaCalendarAlt} color="gray.400" />
            </InputLeftElement>
            <Input 
              type="date" 
              name="start_date" 
              value={formData.start_date || ''} 
              onChange={handleChange}
              borderRadius="md"
            />
          </InputGroup>
        </FormControl>
        
        <FormControl isInvalid={!!errors.due_date}>
          <FormLabel fontWeight="bold">תאריך יעד</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaCalendarAlt} color="gray.400" />
            </InputLeftElement>
            <Input 
              type="date" 
              name="due_date" 
              value={formData.due_date || ''} 
              onChange={handleChange}
              borderRadius="md"
            />
          </InputGroup>
          {errors.due_date && <FormErrorMessage>{errors.due_date}</FormErrorMessage>}
        </FormControl>
      </SimpleGrid>
      
      <FormControl>
        <FormLabel fontWeight="bold">אחראי ביצוע</FormLabel>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaUserCircle} color="gray.400" />
          </InputLeftElement>
          <Input 
            name="responsible" 
            value={formData.responsible || ''} 
            onChange={handleChange}
            placeholder="שם האחראי על המשימה"
            borderRadius="md"
          />
        </InputGroup>
      </FormControl>
      
      <FormControl>
        <FormLabel fontWeight="bold">משתתפים</FormLabel>
        <HStack mb={2}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaUsers} color="gray.400" />
            </InputLeftElement>
            <Input 
              value={newAssignee} 
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="הוסף משתתף"
              borderRadius="md"
              onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
            />
          </InputGroup>
          <Button
            aria-label="הוסף משתתף"
            leftIcon={<AddIcon />}
            onClick={handleAddAssignee}
            colorScheme="blue"
            size="md"
          >
            הוסף
          </Button>
        </HStack>
        
        {formData.assignees_info && Array.isArray(formData.assignees_info) && formData.assignees_info.length > 0 && (
          <Wrap spacing={2} mt={2}>
            {formData.assignees_info.map((assignee, index) => (
              <WrapItem key={index}>
                <Tag colorScheme="blue" borderRadius="full" size="md">
                  <Avatar
                    src=""
                    name={assignee}
                    size="xs"
                    ml={-1}
                    mr={2}
                  />
                  <TagLabel>{assignee}</TagLabel>
                  <CloseButton 
                    size="sm" 
                    ml={1} 
                    onClick={() => handleRemoveAssignee(assignee)}
                  />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </FormControl>
    </VStack>
  );
  
  // רינדור תת-משימה
  const renderRelationships = () => (
    <VStack spacing={4} align="stretch">
      <Box mb={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>קשרים היררכיים</Text>
        <Text fontSize="sm" color="gray.600">
          משימות יכולות להיות מסודרות בצורה היררכית. בחר משימת אב ואז תוכל לבחור גם תת-משימה מתוך הרשימה אם קיימות תתי-משימות.
        </Text>
      </Box>
      
      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0} htmlFor="subtask-toggle" fontWeight="bold">
          הגדר כתת-משימה
        </FormLabel>
        <Switch 
          id="subtask-toggle"
          isChecked={isSubtask} 
          onChange={handleSubtaskToggle}
          colorScheme="blue"
        />
      </FormControl>
      
      {isSubtask && (
        <>
          {/* בחירת משימת אב */}
          <FormControl isInvalid={!!errors.parent_task_id}>
            <FormLabel fontWeight="bold">משימת אב</FormLabel>
            {parentTasks.length > 0 ? (
              <Select 
                name="parent_task_id"
                value={selectedParentId || ''} 
                onChange={handleParentTaskChange}
                placeholder="בחר משימת אב"
                borderRadius="md"
              >
                <option value="">בחר משימת אב</option>
                {parentTasks.map(parentTask => (
                  <option key={parentTask.id} value={parentTask.id}>
                    {parentTask.hierarchical_number ? `${parentTask.hierarchical_number} - ` : ''}
                    {parentTask.title}
                    {parentTask.status && ` (${getStatusLabel(parentTask.status)})`}
                  </option>
                ))}
              </Select>
            ) : (
              <Text color="orange.500" mt={2}>
                אין משימות שיכולות לשמש כמשימות אב. צור קודם משימות ראשיות.
              </Text>
            )}
            {errors.parent_task_id && <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>}
          </FormControl>
          
          {/* תצוגת מסלול היררכיה */}
          {hierarchyPath.length > 0 && (
            <Box mt={2} mb={2}>
              <Text fontSize="sm" fontWeight="medium" mb={1}>מסלול היררכיה:</Text>
              <Flex wrap="wrap" gap={1} alignItems="center">
                {hierarchyPath.map((item, index) => (
                  <React.Fragment key={item.id || index}>
                    {index > 0 && <Icon as={FaChevronLeft} color="gray.500" fontSize="xs" />}
                    <Tag 
                      size="md" 
                      colorScheme={index === hierarchyPath.length - 1 ? "blue" : "gray"}
                      variant={index === hierarchyPath.length - 1 ? "solid" : "subtle"}
                    >
                      {item.title}
                    </Tag>
                  </React.Fragment>
                ))}
              </Flex>
            </Box>
          )}
          
          {/* בחירת תת-משימה אם יש משימת אב נבחרת */}
          {selectedParentId && (
            <FormControl mt={3}>
              <FormLabel fontWeight="bold">
                תת-משימה {childTaskOptions.length === 0 ? '(אין תתי-משימות זמינות)' : '(אופציונלי)'}
              </FormLabel>
              <Select
                value={selectedPath[0] || ''}
                onChange={(e) => handleSubTaskSelection(0, e.target.value)}
                placeholder="בחר תת-משימה (אופציונלי)"
                borderRadius="md"
                isDisabled={childTaskOptions.length === 0}
              >
                <option value="">השאר תחת המשימה הראשית</option>
                {childTaskOptions.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.hierarchical_number ? `${task.hierarchical_number} - ` : ''}
                    {task.title}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {childTaskOptions.length > 0 
                  ? "בחר תת-משימה אם ברצונך למקם את המשימה החדשה תחתיה במקום תחת המשימה הראשית" 
                  : "אין תתי-משימות למשימה זו. המשימה החדשה תהיה תת-משימה ישירה של המשימה הראשית"}
              </Text>
            </FormControl>
          )}
          
          {/* שדה בחירה רקורסיבי עבור תתי-משימות ברמה השנייה */}
          {selectedPath.length > 0 && selectedPath[0] && (
            <FormControl mt={3}>
              <FormLabel fontWeight="bold">תת-משימה נוספת (אופציונלי)</FormLabel>
              <Select
                value={selectedPath[1] || ''}
                onChange={(e) => handleSubTaskSelection(1, e.target.value)}
                placeholder="בחר תת-משימה נוספת (אופציונלי)"
                borderRadius="md"
              >
                <option value="">השאר תחת התת-משימה הנוכחית</option>
                {potentialParentTasks
                  .filter(task => task.parent_task_id === selectedPath[0])
                  .map(task => (
                    <option key={task.id} value={task.id}>
                      {task.hierarchical_number ? `${task.hierarchical_number} - ` : ''}
                      {task.title}
                    </option>
                  ))}
              </Select>
              <Text fontSize="sm" color="gray.500" mt={1}>
                בחר תת-משימה נוספת אם ברצונך למקם את המשימה החדשה עמוק יותר בהיררכיה
              </Text>
            </FormControl>
          )}
          
          <Box mt={4} p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
            <Text fontSize="sm" fontWeight="medium" color="blue.700">
              <strong>הערה:</strong> המספור ההיררכי ייווצר אוטומטית בהתאם למשימת האב או תת-המשימה שנבחרה.
            </Text>
            <Text fontSize="sm" color="blue.600" mt={1}>
              המשימה החדשה תמוקם תחת המשימה האחרונה שבחרת במסלול ההיררכיה.
            </Text>
          </Box>
        </>
      )}
    </VStack>
  );
  
  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="xl" 
        scrollBehavior="inside"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent 
          borderRadius="md" 
          boxShadow="xl"
          maxWidth="95vw"
          width="700px"
        >
          {renderModalHeader()}
          <ModalCloseButton color="white" />
          
          <ModalBody p={0}>
            <Tabs 
              isFitted 
              variant="enclosed" 
              defaultIndex={0} 
              index={activeTab} 
              onChange={setActiveTab}
            >
              <TabList mb={4}>
                <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>פרטים בסיסיים</Tab>
                <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>לוח זמנים ואחראים</Tab>
                <Tab _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}>קשרים</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Box p={4}>
                    {renderBasicInfo()}
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box p={4}>
                    {renderSchedule()}
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box p={4}>
                    {renderRelationships()}
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          
          <ModalFooter borderTop="1px" borderColor={borderColor} py={3} bg={bgColor}>
            <Flex width="100%" justifyContent="space-between">
              <Button variant="ghost" onClick={onClose}>
                ביטול
              </Button>
              
              <HStack>
                {activeTab > 0 && (
                  <Button variant="ghost" mr={2} onClick={() => setActiveTab(prev => prev - 1)}>
                    הקודם
                  </Button>
                )}
                
                {activeTab < 2 ? (
                  <Button colorScheme="blue" onClick={() => setActiveTab(prev => prev + 1)}>
                    הבא
                  </Button>
                ) : (
                  <Button 
                    colorScheme="blue" 
                    leftIcon={isEditMode ? <EditIcon /> : <AddIcon />}
                    onClick={handleSubmit}
                    isLoading={loading}
                    loadingText={isEditMode ? "מעדכן..." : "יוצר..."}
                  >
                    {isEditMode ? "עדכן משימה" : "צור משימה"}
                  </Button>
                )}
              </HStack>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* דיאלוג שאלה האם לשמור כתבנית ברירת מחדל */}
      <AlertDialog
        isOpen={isTemplateDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleCloseTemplateDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              שמירת משימה כתבנית ברירת מחדל
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack spacing={4} align="stretch">
                <Text>
                  האם ברצונך לשמור את המשימה הזו כתבנית ברירת מחדל? 
                  משימות מתבנית ברירת מחדל יוצגו אוטומטית בכל פרויקט חדש.
                </Text>
                <FormControl>
                  <FormLabel>שם התבנית</FormLabel>
                  <Input 
                    value={templateName} 
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="הזן שם לתבנית"
                  />
                </FormControl>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCloseTemplateDialog}>
                לא, תודה
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={handleSaveAsTemplate} 
                ml={3}
                leftIcon={<FaSave />}
                isLoading={templateSaveLoading}
                loadingText="שומר..."
              >
                שמור כתבנית ברירת מחדל
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default TaskEditModal; 