'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Select,
  Textarea,
  VStack,
  useToast,
  Switch,
  Text,
  Checkbox,
  HStack,
  Badge,
  Spinner,
  InputGroup,
  InputLeftElement,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  IconButton,
  useDisclosure,
  Tooltip,
  useColorModeValue,
  Grid,
  GridItem,
  Collapse,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Accordion,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiSave, FiArrowRight, FiSearch, FiCalendar, FiFilter, FiTag, FiPlus, FiTrash2, FiX, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { InfoIcon } from '@chakra-ui/icons';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import dropboxService from '@/lib/services/dropboxService';
import type { Task, NewTask, Entrepreneur, Stage, TaskWithChildren, ExtendedTask } from '@/types/supabase';
import { ExtendedNewProject } from '@/types/extendedTypes';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import BuildTrackingModal from '@/components/ui/BuildTrackingModal';

export default function NewProject() {
  const [project, setProject] = useState<{
    name: string;
    description?: string;
    status: string;
    due_date?: string;
    entrepreneur_id?: string;
    dropbox_folder_path?: string;
  }>({
    name: '',
    description: '',
    status: 'active', // סטטוס ברירת מחדל
    due_date: '',
    entrepreneur_id: '',
    dropbox_folder_path: '',
  });
  
  const [errors, setErrors] = useState<{
    name?: string;
    status?: string;
  }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useDefaultTasks, setUseDefaultTasks] = useState(false);
  const [showCustomTaskSelection, setShowCustomTaskSelection] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedTaskTemplates, setSelectedTaskTemplates] = useState<Task[]>([]);
  
  // משתנים חדשים למשימה מותאמת אישית
  const [newCustomTask, setNewCustomTask] = useState<{
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date?: string;
    labels: string[];
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    labels: [],
  });
  
  const [newLabelInput, setNewLabelInput] = useState('');
  const [customTaskErrors, setCustomTaskErrors] = useState<{
    title?: string;
  }>({});
  
  const { user } = useAuthContext();
  const router = useRouter();
  const toast = useToast();
  
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [loadingEntrepreneurs, setLoadingEntrepreneurs] = useState(false);
  const [newEntrepreneurName, setNewEntrepreneurName] = useState('');
  const { isOpen: isEntrepreneurModalOpen, onOpen: openEntrepreneurModal, onClose: closeEntrepreneurModal } = useDisclosure();
  
  // משתנים חדשים לטיפול בתיקיות דרופבוקס
  const [dropboxFolders, setDropboxFolders] = useState<{ id: string; name: string; path: string }[]>([]);
  const [loadingDropboxFolders, setLoadingDropboxFolders] = useState(false);
  const [dropboxFolderError, setDropboxFolderError] = useState<string | null>(null);
  
  // מודל מעקב אחר תהליך היצירה
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  
  // טעינת כל המשימות הזמינות כתבניות
  useEffect(() => {
    const loadAllTaskTemplates = async () => {
      try {
        setLoadingTasks(true);
        // שימוש בפונקציה הקיימת getAllTasksHierarchical במקום getAllHierarchicalTaskTemplates
        const hierarchicalTasks = await taskService.getAllTasksHierarchical();
        
        // אם אין תבניות היררכיות, ננסה לקבל את כל תבניות המשימות הרגילות
        if (hierarchicalTasks.length === 0) {
          const flatTasks = await taskService.getAllTaskTemplates();
          setAvailableTasks(flatTasks);
        } else {
          // המרת המשימות ההיררכיות למבנה השטוח לטובת התצוגה הקיימת
          // שימור המידע ההיררכי לתצוגה החדשה
          setHierarchicalTasks(hierarchicalTasks);
          
          // המרה לרשימה שטוחה לתמיכה בחלקים אחרים של הממשק
          const flattenHierarchicalTasks = (tasks: TaskWithChildren[]): Task[] => {
            const result: Task[] = [];
            tasks.forEach(task => {
              result.push(task);
              if (task.children && task.children.length > 0) {
                result.push(...flattenHierarchicalTasks(task.children));
              }
            });
            return result;
          };
          
          setAvailableTasks(flattenHierarchicalTasks(hierarchicalTasks));
        }
      } catch (err) {
        console.error('שגיאה בטעינת תבניות משימות:', err);
        toast({
          title: 'שגיאה בטעינת משימות',
          description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoadingTasks(false);
      }
    };
    
    loadAllTaskTemplates();
  }, [toast]);
  
  // טעינת יזמים בעת טעינת הדף
  useEffect(() => {
    const fetchEntrepreneurs = async () => {
      try {
        setLoadingEntrepreneurs(true);
        const data = await entrepreneurService.getEntrepreneurs();
        setEntrepreneurs(data);
      } catch (error) {
        console.error('שגיאה בטעינת יזמים:', error);
        toast({
          title: 'שגיאה בטעינת יזמים',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoadingEntrepreneurs(false);
      }
    };
    
    fetchEntrepreneurs();
  }, [toast]);
  
  // טעינת תיקיות יזמים מדרופבוקס
  useEffect(() => {
    const fetchDropboxFolders = async () => {
      try {
        setLoadingDropboxFolders(true);
        setDropboxFolderError(null);
        
        // בדיקה האם הדרופבוקס מוגדר
        const isConfigured = dropboxService.isConfigured();
        
        if (!isConfigured) {
          setDropboxFolderError('דרופבוקס לא מוגדר. אנא הגדר טוקן גישה בהגדרות המערכת.');
          return;
        }
        
        // קבלת כל תיקיות היזמים מדרופבוקס
        const folders = await dropboxService.getEntrepreneurFolders();
        setDropboxFolders(folders);
      } catch (error) {
        console.error('שגיאה בטעינת תיקיות דרופבוקס:', error);
        setDropboxFolderError('לא ניתן לטעון תיקיות מדרופבוקס, יתכן שאין חיבור תקין');
        toast({
          title: 'שגיאה בטעינת תיקיות דרופבוקס',
          description: error instanceof Error ? error.message : 'שגיאת התחברות לדרופבוקס',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoadingDropboxFolders(false);
      }
    };
    
    fetchDropboxFolders();
  }, [toast]);
  
  // סינון משימות לפי חיפוש וסינונים פעילים
  const filteredTasks = availableTasks.filter(task => {
    // סינון לפי חיפוש
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // סינון לפי תגיות פעילות
    const matchesFilters = activeFilters.length === 0 || 
      (task.labels && task.labels.some(label => activeFilters.includes(label)));
    
    return matchesSearch && matchesFilters;
  });
  
  // קבלת כל התגיות הייחודיות מהמשימות
  const getAllUniqueLabels = (): string[] => {
    const allLabels = availableTasks
      .filter(task => task.labels && task.labels.length > 0)
      .flatMap(task => task.labels || []);
    
    // תיקון שגיאת הלינטר - שימוש בגישה אחרת ללא Set
    const uniqueLabels: string[] = [];
    allLabels.forEach(label => {
      if (!uniqueLabels.includes(label)) {
        uniqueLabels.push(label);
      }
    });
    return uniqueLabels;
  };
  
  const uniqueLabels = getAllUniqueLabels();
  
  const validateForm = () => {
    const newErrors: { name?: string; status?: string } = {};
    
    if (!project.name?.trim()) {
      newErrors.name = 'שם הפרויקט הוא שדה חובה';
    }
    
    if (!project.status) {
      newErrors.status = 'יש לבחור סטטוס';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject(prev => ({ ...prev, [name]: value }));
  };
  
  // טיפול בבחירת משימה
  const handleTaskSelection = (task: Task, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTaskIds(prev => [...prev, task.id]);
      setSelectedTaskTemplates(prev => [...prev, task]);
    } else {
      setSelectedTaskIds(prev => prev.filter(id => id !== task.id));
      setSelectedTaskTemplates(prev => prev.filter(t => t.id !== task.id));
    }
  };
  
  // טיפול בבחירת כל המשימות המסוננות
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTaskIds(filteredTasks.map(task => task.id));
      setSelectedTaskTemplates(filteredTasks);
    } else {
      setSelectedTaskIds([]);
      setSelectedTaskTemplates([]);
    }
  };
  
  // טיפול בהוספת/הסרת סינון
  const toggleFilter = (label: string) => {
    if (activeFilters.includes(label)) {
      setActiveFilters(prev => prev.filter(f => f !== label));
    } else {
      setActiveFilters(prev => [...prev, label]);
    }
  };
  
  // המרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  // קבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return 'gray';
      case 'in progress':
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
  
  // הסרת משימה מהרשימה הנבחרת
  const removeSelectedTask = (taskId: string) => {
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    setSelectedTaskTemplates(prev => prev.filter(task => task.id !== taskId));
  };
  
  // פונקציה לטיפול בשינויים בטופס המשימה המותאמת אישית
  const handleCustomTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomTask(prev => ({ ...prev, [name]: value }));
    
    // ניקוי שגיאות בעת הקלדה
    if (name === 'title' && customTaskErrors.title) {
      setCustomTaskErrors(prev => ({ ...prev, title: undefined }));
    }
  };
  
  // פונקציה להוספת תגית חדשה למשימה המותאמת אישית
  const addNewLabel = () => {
    if (newLabelInput.trim() && !newCustomTask.labels.includes(newLabelInput.trim())) {
      setNewCustomTask(prev => ({
        ...prev,
        labels: [...prev.labels, newLabelInput.trim()]
      }));
      setNewLabelInput('');
    }
  };
  
  // פונקציה להסרת תגית ממשימה מותאמת אישית
  const removeLabel = (labelToRemove: string) => {
    setNewCustomTask(prev => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove)
    }));
  };
  
  // פונקציה לאימות טופס המשימה המותאמת אישית
  const validateCustomTaskForm = () => {
    const newErrors: { title?: string } = {};
    
    if (!newCustomTask.title.trim()) {
      newErrors.title = 'שם המשימה הוא שדה חובה';
    }
    
    setCustomTaskErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // פונקציה להוספת משימה מותאמת אישית
  const addCustomTask = async () => {
    if (!validateCustomTaskForm()) {
      return;
    }
    
    try {
      // יצירת משימה חדשה כתבנית
      const newTask: Partial<ExtendedTask> = {
        id: crypto.randomUUID(),
        project_id: undefined, // שינוי מ-null ל-undefined כדי להתאים לטיפוס Partial<ExtendedTask>
        title: newCustomTask.title,
        description: newCustomTask.description || null,
        status: newCustomTask.status,
        priority: newCustomTask.priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (newCustomTask.due_date) {
        newTask.due_date = newCustomTask.due_date;
      }
      
      if (newCustomTask.labels.length > 0) {
        newTask.labels = newCustomTask.labels;
      }
      
      // שמירת המשימה החדשה
      const createdTask = await taskService.createTask(newTask);
      
      // הוספת המשימה החדשה לרשימת המשימות הנבחרות
      setSelectedTaskIds(prev => [...prev, createdTask.id]);
      setSelectedTaskTemplates(prev => [...prev, createdTask]);
      
      // איפוס טופס המשימה המותאמת אישית
      setNewCustomTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        labels: [],
      });
      
      // הצגת הודעת הצלחה
      toast({
        title: 'תבנית המשימה נוצרה בהצלחה',
        description: 'תבנית המשימה נוספה לרשימת התבניות הנבחרות',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // עדכון רשימת המשימות הזמינות
      setAvailableTasks(prev => [...prev, createdTask]);
      
    } catch (err) {
      console.error('שגיאה ביצירת תבנית משימה מותאמת אישית:', err);
      toast({
        title: 'שגיאה ביצירת תבנית משימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // הוספת מזהה בעלים ותאריכים
      const newProject: ExtendedNewProject = {
        id: crypto.randomUUID(),
        name: project.name,
        owner: user?.email || null,
        status: project.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entrepreneur_id: project.entrepreneur_id || null,
        dropbox_folder_path: project.dropbox_folder_path || null,
      };
      
      // אם יש תאריך יעד, נוסיף אותו
      if (project.due_date) {
        newProject.planned_end_date = project.due_date;
      }
      
      // שליחה לשרת
      const createdProject = await projectService.createProject(newProject);
      
      // שמירת מזהה הפרויקט החדש לשימוש במודל המעקב
      setNewProjectId(createdProject.id);
      
      // עדכון הבנייה - אתחול
      await projectService.updateBuildTracking(createdProject.id, {
        logs: [
          {
            message: "התחלת יצירת פרויקט",
            timestamp: new Date().toISOString()
          }
        ],
        status: "בתהליך"
      });
      
      // פתיחת מודל המעקב
      setIsTrackingModalOpen(true);
      
      // אתחול טבלאות ונתונים של הפרויקט בהתאם לבחירות המשתמש
      try {
        // עדכון המעקב - יצירת טבלאות
        await projectService.updateBuildTracking(createdProject.id, {
          logs: [
            {
              message: "יוצר טבלאות פרויקט חדשות",
              timestamp: new Date().toISOString()
            }
          ]
        });
        
        // קריאה לפונקציה החדשה שמאתחלת טבלאות ונתונים
        const { data, error } = await supabase.rpc('init_project_tables_and_data', {
          project_id_param: createdProject.id,
          create_default_stages: true,
          create_default_tasks: false,
          selected_task_ids: selectedTaskIds.length > 0 ? selectedTaskIds : null
        });
        
        if (error) {
          // עדכון המעקב - שגיאה ביצירת טבלאות
          await projectService.updateBuildTracking(createdProject.id, {
            logs: [
              {
                message: `שגיאה ביצירת טבלאות: ${error.message}`,
                timestamp: new Date().toISOString()
              }
            ]
          });
          throw new Error(error.message);
        }
        
        // עדכון המעקב - הצלחה ביצירת טבלאות
        await projectService.updateBuildTracking(createdProject.id, {
          logs: [
            {
              message: "טבלאות הפרויקט נוצרו בהצלחה",
              timestamp: new Date().toISOString()
            }
          ]
        });
        
        // יצירת מבנה תיקיות בדרופבוקס עבור המשימות שנבחרו
        try {
          // עדכון המעקב - יצירת תיקיות
          await projectService.updateBuildTracking(createdProject.id, {
            logs: [
              {
                message: "יוצר מבנה תיקיות בדרופבוקס",
                timestamp: new Date().toISOString()
              }
            ]
          });
          
          console.log(`יצירת מבנה תיקיות עבור משימות הפרויקט בדרופבוקס`);
          
          // קריאה לפונקציה שיוצרת את מבנה התיקיות ההיררכי
          await taskService.createFullHierarchicalFolderStructureForProject({
            id: createdProject.id,
            name: createdProject.name,
            entrepreneur_id: createdProject.entrepreneur_id
          }, project.dropbox_folder_path || null);
          
          console.log(`מבנה תיקיות נוצר בהצלחה`);
          
          // עדכון המעקב - הצלחה ביצירת תיקיות
          await projectService.updateBuildTracking(createdProject.id, {
            logs: [
              {
                message: "מבנה התיקיות נוצר בהצלחה",
                timestamp: new Date().toISOString()
              }
            ]
          });
        } catch (folderError) {
          console.error('שגיאה ביצירת מבנה תיקיות בדרופבוקס:', folderError);
          
          // עדכון המעקב - שגיאה ביצירת תיקיות
          await projectService.updateBuildTracking(createdProject.id, {
            logs: [
              {
                message: `שגיאה ביצירת תיקיות: ${folderError instanceof Error ? folderError.message : 'שגיאה לא ידועה'}`,
                timestamp: new Date().toISOString()
              }
            ]
          });
          // לא נזרוק שגיאה כאן כדי לא לעצור את התהליך
        }
        
        // עדכון המעקב - סיום התהליך
        await projectService.updateBuildTracking(createdProject.id, {
          logs: [
            {
              message: "תהליך יצירת הפרויקט הסתיים בהצלחה",
              timestamp: new Date().toISOString()
            }
          ],
          status: "הושלם"
        });
        
        toast({
          title: 'הפרויקט נוצר בהצלחה',
          description: 'כל הטבלאות והנתונים אותחלו בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
        
        // ניווט לדף הפרויקט החדש אחרי 3 שניות
        setTimeout(() => {
          // סגירת מודל המעקב וניווט לדף הפרויקט
          setIsTrackingModalOpen(false);
          router.push(`/dashboard/projects/${createdProject.id}`);
        }, 3000);
      } catch (initError) {
        console.error('שגיאה באתחול טבלאות ונתונים:', initError);
        
        // עדכון המעקב - שגיאה כללית
        await projectService.updateBuildTracking(createdProject.id, {
          logs: [
            {
              message: `שגיאה באתחול: ${initError instanceof Error ? initError.message : 'שגיאה לא ידועה'}`,
              timestamp: new Date().toISOString()
            }
          ],
          status: "נכשל"
        });
        
        toast({
          title: 'שגיאה באתחול טבלאות הפרויקט',
          description: initError instanceof Error ? initError.message : 'אירעה שגיאה בלתי צפויה',
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
        
        // ניווט לדף הפרויקט החדש בכל מקרה
        setTimeout(() => {
          setIsTrackingModalOpen(false);
          router.push(`/dashboard/projects/${createdProject.id}`);
        }, 5000);
      }
    } catch (error) {
      console.error('שגיאה ביצירת פרויקט:', error);
      
      if (newProjectId) {
        // עדכון המעקב - שגיאה ביצירה
        await projectService.updateBuildTracking(newProjectId, {
          logs: [
            {
              message: `שגיאה ביצירת הפרויקט: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
              timestamp: new Date().toISOString()
            }
          ],
          status: "נכשל"
        });
      }
      
      toast({
        title: 'שגיאה ביצירת הפרויקט',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // הוספת משתנה מצב חדש לשמירת המשימות ההיררכיות
  const [hierarchicalTasks, setHierarchicalTasks] = useState<TaskWithChildren[]>([]);
  
  // הוספת יזם חדש
  const handleAddNewEntrepreneur = async () => {
    if (!newEntrepreneurName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'שם היזם לא יכול להיות ריק',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const newEntrepreneur = await entrepreneurService.createEntrepreneur({
        name: newEntrepreneurName.trim()
      });
      
      setEntrepreneurs([...entrepreneurs, newEntrepreneur]);
      setProject({
        ...project,
        entrepreneur_id: newEntrepreneur.id
      });
      
      toast({
        title: 'יזם נוסף בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setNewEntrepreneurName('');
      closeEntrepreneurModal();
    } catch (error) {
      console.error('שגיאה בהוספת יזם:', error);
      toast({
        title: 'שגיאה בהוספת יזם',
        description: 'אירעה שגיאה בהוספת היזם החדש',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Container maxW="container.md" py={6}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg">פרויקט חדש</Heading>
        </Box>
        
        <Divider />
        
        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel htmlFor="name">שם הפרויקט</FormLabel>
              <Input
                id="name"
                name="name"
                value={project.name}
                onChange={handleChange}
                placeholder="הזן שם פרויקט"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="entrepreneur_id">יזם</FormLabel>
              <Flex direction="column" gap={2}>
                <Select
                  id="entrepreneur_id"
                  name="entrepreneur_id"
                  value={project.entrepreneur_id || ''}
                  onChange={handleChange}
                  placeholder="בחר יזם"
                >
                  {entrepreneurs.map((entrepreneur) => (
                    <option key={entrepreneur.id} value={entrepreneur.id}>
                      {entrepreneur.name}
                    </option>
                  ))}
                </Select>
                <Button
                  leftIcon={<FiPlus />}
                  onClick={openEntrepreneurModal}
                  isLoading={loadingEntrepreneurs}
                  alignSelf="flex-start"
                  size="sm"
                  mt={1}
                >
                  יזם חדש
                </Button>
              </Flex>
            </FormControl>
            
            <FormControl>
              <FormLabel>תיקיית יזם בדרופבוקס</FormLabel>
              <Flex direction="column" gap={2}>
                {dropboxFolderError ? (
                  <>
                    <Text color="orange.500" fontSize="sm" mb={2}>
                      {dropboxFolderError}
                    </Text>
                    <Text fontSize="sm">
                      המערכת תפעל במצב ללא דרופבוקס. תיקיות לא ייווצרו בפועל.
                    </Text>
                  </>
                ) : (
                  <>
                    <Select
                      value={project.dropbox_folder_path || ''}
                      onChange={(e) => setProject({...project, dropbox_folder_path: e.target.value})}
                      placeholder={loadingDropboxFolders ? "טוען תיקיות..." : "בחר תיקיית יזם"}
                      isDisabled={loadingDropboxFolders || dropboxFolders.length === 0}
                    >
                      {dropboxFolders.map((folder) => (
                        <option key={folder.id} value={folder.path}>
                          {folder.name}
                        </option>
                      ))}
                    </Select>
                    {!loadingDropboxFolders && dropboxFolders.length === 0 && !dropboxFolderError && (
                      <Text color="orange.500" fontSize="sm">
                        לא נמצאו תיקיות יזמים בדרופבוקס. הפרויקט ייווצר בתיקייה חדשה.
                      </Text>
                    )}
                  </>
                )}
                <Button
                  leftIcon={<FiSearch />}
                  onClick={() => router.push('/dashboard/dropbox-explorer')}
                  size="sm"
                  alignSelf="flex-start"
                  mt={1}
                >
                  דפדפן תיקיות דרופבוקס
                </Button>
              </Flex>
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="description">תיאור</FormLabel>
              <Textarea
                id="description"
                name="description"
                value={project.description || ''}
                onChange={handleChange}
                placeholder="תיאור הפרויקט"
                rows={3}
              />
            </FormControl>
            
            <FormControl isInvalid={!!errors.status}>
              <FormLabel htmlFor="status">סטטוס</FormLabel>
              <Select
                id="status"
                name="status"
                value={project.status}
                onChange={handleChange}
              >
                <option value="active">פעיל</option>
                <option value="planning">בתכנון</option>
                <option value="on hold">בהמתנה</option>
                <option value="completed">הושלם</option>
                <option value="cancelled">בוטל</option>
              </Select>
              <FormErrorMessage>{errors.status}</FormErrorMessage>
            </FormControl>
            
            <FormControl>
              <FormLabel htmlFor="due_date">תאריך יעד</FormLabel>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={project.due_date || ''}
                onChange={handleChange}
              />
            </FormControl>
            
            <Divider />
            
            <Heading size="md">תבניות משימות</Heading>
            
            <Tabs variant="enclosed" colorScheme="primary">
              <TabList>
                <Tab>בחר תבניות משימות לשיוך לפרויקט החדש</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel p={4}>
                  <Text fontSize="md" fontWeight="bold" mb={4}>
                    בחר תבניות משימות לשיוך לפרויקט החדש
                  </Text>
                  
                  <Text fontSize="sm" color="blue.600" mb={4}>
                    <Box as={InfoIcon} display="inline" mr={1} />
                    תבניות המשימות שתבחר ישוכפלו לפרויקט החדש, כולל כל תתי-המשימות שלהן.
                  </Text>
                  
                  <InputGroup mb={4}>
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input 
                      placeholder="חיפוש תבניות משימות..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      bg="white"
                    />
                  </InputGroup>
                  
                  {/* סינון לפי תגיות */}
                  {uniqueLabels.length > 0 && (
                    <Box mb={4}>
                      <Flex align="center" mb={2}>
                        <FiTag style={{ marginLeft: '8px' }} />
                        <Text fontSize="sm" fontWeight="bold">
                          סנן לפי תגיות:
                        </Text>
                      </Flex>
                      <Wrap spacing={2}>
                        {uniqueLabels.map(label => (
                          <WrapItem key={`filter-${label}`}>
                            <Tag 
                              size="md" 
                              colorScheme={activeFilters.includes(label) ? "primary" : "gray"}
                              borderRadius="full"
                              cursor="pointer"
                              onClick={() => toggleFilter(label)}
                            >
                              <TagLabel>{label}</TagLabel>
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}
                  
                  {loadingTasks ? (
                    <Flex justify="center" py={4}>
                      <Spinner size="md" />
                    </Flex>
                  ) : hierarchicalTasks.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <Text mb={4}>
                        {searchTerm || activeFilters.length > 0 ? 'לא נמצאו תבניות משימות התואמות את החיפוש' : 'אין תבניות משימות זמינות לבחירה'}
                      </Text>
                      <Text fontSize="sm" color="blue.600" mb={4}>
                        <Box as={InfoIcon} display="inline" mr={1} />
                        ניתן ליצור תבניות משימות חדשות בטאב "הוספת משימות מותאמות אישית"
                      </Text>
                      <Button
                        colorScheme="primary"
                        leftIcon={<FiPlus />}
                        onClick={async () => {
                          try {
                            setLoadingTasks(true);
                            // יצירת משימות ברירת מחדל
                            const defaultTasks = await taskService.createDefaultTaskTemplates();
                            setAvailableTasks(defaultTasks);
                            
                            toast({
                              title: 'תבניות משימות נוצרו בהצלחה',
                              description: `נוצרו ${defaultTasks.length} תבניות משימות`,
                              status: 'success',
                              duration: 3000,
                              isClosable: true,
                              position: 'top-right',
                            });
                            
                            // טעינה מחדש של המשימות ההיררכיות
                            const hierarchicalTasks = await taskService.getAllTasksHierarchical();
                            setHierarchicalTasks(hierarchicalTasks);
                          } catch (err) {
                            console.error('שגיאה ביצירת תבניות משימות:', err);
                            toast({
                              title: 'שגיאה ביצירת תבניות משימות',
                              description: err instanceof Error ? err.message : 'אירעה שגיאה לא ידועה',
                              status: 'error',
                              duration: 5000,
                              isClosable: true,
                            });
                          } finally {
                            setLoadingTasks(false);
                          }
                        }}
                        mr={2}
                      >
                        צור תבניות משימות
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Box background="white" borderRadius="md" p={4} boxShadow="sm" mb={4}>
                        <Flex justify="space-between" align="center" mb={2}>
                          <Checkbox 
                            isChecked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          >
                            בחר הכל ({filteredTasks.length})
                          </Checkbox>
                          <Text fontSize="sm">נבחרו {selectedTaskIds.length} תבניות משימות</Text>
                        </Flex>
                      </Box>
                      
                      {/* תצוגה היררכית של תבניות המשימות */}
                      <Accordion allowMultiple defaultIndex={[]} background="white" borderRadius="md" overflow="hidden" boxShadow="sm">
                        {Array.isArray(hierarchicalTasks) && hierarchicalTasks
                          .filter(task => 
                            (searchTerm === '' || task.title.includes(searchTerm)) &&
                            (activeFilters.length === 0 || (task.labels && task.labels.some(label => activeFilters.includes(label))))
                          )
                          .map((taskItem) => (
                            <AccordionItem key={taskItem.id} border="1px solid" borderColor="gray.200" mb={2} borderRadius="md">
                              <h2>
                                <AccordionButton py={3} _hover={{ bg: 'gray.50' }}>
                                  <HStack flex="1" align="center" spacing={3}>
                                    <Checkbox 
                                      isChecked={selectedTaskIds.includes(taskItem.id)}
                                      onChange={(e) => handleTaskSelection(taskItem, e.target.checked)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Box flex="1" textAlign="start">
                                      <Text fontWeight="bold">{taskItem.title}</Text>
                                      <HStack spacing={2} mt={1}>
                                        <Badge colorScheme={getStatusColor(taskItem.status)}>{taskItem.status}</Badge>
                                        {taskItem.priority && (
                                          <Badge colorScheme={taskItem.priority === 'high' ? 'red' : taskItem.priority === 'medium' ? 'yellow' : 'green'}>
                                            {taskItem.priority}
                                          </Badge>
                                        )}
                                        {taskItem.due_date && (
                                          <Text fontSize="xs" color="gray.600">
                                            <FiCalendar style={{ display: 'inline', marginLeft: '2px' }} />
                                            {formatDate(taskItem.due_date)}
                                          </Text>
                                        )}
                                      </HStack>
                                    </Box>
                                  </HStack>
                                  {taskItem.children && taskItem.children.length > 0 && <AccordionIcon />}
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4} bg={useColorModeValue('gray.50', 'gray.700')}>
                                {taskItem.description && (
                                  <Text fontSize="sm" mb={3}>{taskItem.description}</Text>
                                )}
                                
                                {taskItem.labels && taskItem.labels.length > 0 && (
                                  <Wrap spacing={1} mb={3}>
                                    {taskItem.labels.map(label => (
                                      <WrapItem key={`${taskItem.id}-${label}`}>
                                        <Tag size="sm" colorScheme="blue" borderRadius="full">
                                          {label}
                                        </Tag>
                                      </WrapItem>
                                    ))}
                                  </Wrap>
                                )}
                                
                                {taskItem.children && taskItem.children.length > 0 && (
                                  <VStack spacing={1} align="stretch" mt={2} pl={4} borderLeftWidth="2px" borderLeftColor="gray.300">
                                    {taskItem.children.map(childTask => (
                                      <Box 
                                        key={childTask.id} 
                                        p={3} 
                                        borderWidth="1px" 
                                        borderRadius="md"
                                        bg="white"
                                        _hover={{ bg: 'gray.50' }}
                                        mb={2}
                                      >
                                        <Flex justify="space-between" align="flex-start">
                                          <HStack align="flex-start" spacing={3}>
                                            <Checkbox 
                                              isChecked={selectedTaskIds.includes(childTask.id)}
                                              onChange={(e) => handleTaskSelection(childTask, e.target.checked)}
                                            />
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontWeight="bold">{childTask.title}</Text>
                                              {childTask.description && (
                                                <Text fontSize="sm" noOfLines={2}>{childTask.description}</Text>
                                              )}
                                              <HStack spacing={2} flexWrap="wrap">
                                                <Badge colorScheme={getStatusColor(childTask.status)}>{childTask.status}</Badge>
                                                {childTask.due_date && (
                                                  <Text fontSize="xs" color="gray.600">
                                                    <FiCalendar style={{ display: 'inline', marginLeft: '2px' }} />
                                                    {formatDate(childTask.due_date)}
                                                  </Text>
                                                )}
                                                {childTask.labels && childTask.labels.length > 0 && (
                                                  <Wrap spacing={1} mt={1}>
                                                    {childTask.labels.map(label => (
                                                      <WrapItem key={`${childTask.id}-${label}`}>
                                                        <Tag size="sm" colorScheme="blue" borderRadius="full">
                                                          {label}
                                                        </Tag>
                                                      </WrapItem>
                                                    ))}
                                                  </Wrap>
                                                )}
                                              </HStack>
                                            </VStack>
                                          </HStack>
                                        </Flex>
                                      </Box>
                                    ))}
                                  </VStack>
                                )}
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                      </Accordion>
                      
                      {/* אין תוצאות לחיפוש */}
                      {Array.isArray(hierarchicalTasks) && 
                       hierarchicalTasks.filter(task => 
                        (searchTerm === '' || task.title.includes(searchTerm)) &&
                        (activeFilters.length === 0 || (task.labels && task.labels.some(label => activeFilters.includes(label))))
                       ).length === 0 && (
                        <Box textAlign="center" py={4}>
                          <Text>לא נמצאו תבניות משימות התואמות את החיפוש</Text>
                        </Box>
                      )}
                    </>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
            
            <Divider />
            
            <Box mb={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
              <Flex align="center" mb={2}>
                <InfoIcon color="blue.500" mr={2} />
                <Text fontWeight="bold">הסבר על שכפול משימות</Text>
              </Flex>
              <Text fontSize="sm">
                בחירת משימות מהרשימה תיצור <strong>עותקים חדשים</strong> של המשימות בפרויקט החדש.
                המשימות המקוריות יישארו ללא שינוי ויהיו זמינות לשימוש בפרויקטים אחרים.
              </Text>
            </Box>
            
            <Flex justify="flex-end" mt={4}>
              <Button
                type="submit"
                colorScheme="primary"
                size="lg"
                isLoading={isSubmitting}
                leftIcon={<FiSave />}
              >
                צור פרויקט
              </Button>
            </Flex>
          </VStack>
        </Box>
      </VStack>
      
      {/* מודל להוספת יזם חדש */}
      <Modal isOpen={isEntrepreneurModalOpen} onClose={closeEntrepreneurModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>הוספת יזם חדש</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>שם היזם</FormLabel>
              <Input
                value={newEntrepreneurName}
                onChange={(e) => setNewEntrepreneurName(e.target.value)}
                placeholder="הכנס שם יזם"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAddNewEntrepreneur}>
              הוסף
            </Button>
            <Button variant="ghost" onClick={closeEntrepreneurModal}>
              ביטול
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* מודל מעקב אחר תהליך היצירה */}
      {newProjectId && (
        <BuildTrackingModal
          isOpen={isTrackingModalOpen}
          onClose={() => setIsTrackingModalOpen(false)}
          projectId={newProjectId}
          title="מעקב אחר יצירת פרויקט"
        />
      )}
    </Container>
  );
} 