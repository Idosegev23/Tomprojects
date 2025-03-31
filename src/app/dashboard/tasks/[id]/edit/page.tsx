'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Heading, 
  FormControl, 
  FormLabel, 
  FormErrorMessage, 
  Input, 
  Textarea, 
  Select,
  Button,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  Flex,
  Spinner,
  Grid,
  GridItem,
  InputGroup,
  InputRightElement,
  IconButton,
  Badge,
  useColorModeValue,
  Card,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { 
  FiChevronRight, 
  FiSave, 
  FiAlertTriangle,
  FiCalendar, 
  FiClock, 
  FiInfo, 
  FiLink, 
  FiUsers, 
  FiFolder,
  FiLayers,
  FiTag,
  FiFileText,
  FiFlag,
  FiDroplet,
  FiCheckSquare
} from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import { Task, Project, Stage, ExtendedTask, ExtendedUpdateTask } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function EditTask() {
  const [originalTask, setOriginalTask] = useState<ExtendedTask | null>(null);
  const [task, setTask] = useState<Partial<ExtendedTask>>({
    title: '',
    description: '',
    project_id: '',
    stage_id: '',
    parent_task_id: '',
    hierarchical_number: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    category: '',
    responsible: '',
    dropbox_folder: '',
    estimated_hours: 0,
    assignees: [],
  });
  
  // מדרג עדיפויות עם צבעים
  const PRIORITY_MAP: Record<string, { color: string, label: string }> = {
    urgent: { color: "red.500", label: "דחוף" },
    high: { color: "orange.400", label: "גבוהה" },
    medium: { color: "yellow.400", label: "בינונית" },
    low: { color: "green.400", label: "נמוכה" },
  };

  // מדרג סטטוסים עם צבעים
  const STATUS_MAP: Record<string, { color: string, label: string }> = {
    todo: { color: "gray.400", label: "לביצוע" },
    in_progress: { color: "blue.400", label: "בתהליך" },
    review: { color: "purple.400", label: "בבדיקה" },
    done: { color: "green.400", label: "הושלם" },
    blocked: { color: "red.400", label: "חסום" },
  };

  // קטגוריות נפוצות
  const CATEGORIES = [
    { value: "", label: "ללא קטגוריה" },
    { value: "development", label: "פיתוח" },
    { value: "design", label: "עיצוב" },
    { value: "documentation", label: "תיעוד" },
    { value: "testing", label: "בדיקות" },
    { value: "deployment", label: "הטמעה" },
    { value: "maintenance", label: "תחזוקה" },
    { value: "other", label: "אחר" },
  ];
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStages, setLoadingStages] = useState<boolean>(false);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  
  const taskId = params.id as string;
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // פונקציה לפורמט תאריך עבור שדה input מסוג date
  function formatDateForInput(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  }
  
  // טעינת נתוני משימה ופרויקטים
  useEffect(() => {
    const fetchTaskData = async () => {
      if (!taskId) {
        setLoadError('מזהה משימה לא תקין');
        setLoading(false);
        return;
      }
      
      // אם המזהה הוא "new", נפנה את המשתמש לדף יצירת משימה חדשה
      if (taskId === 'new') {
        router.push('/dashboard/tasks/new');
        return;
      }
      
      try {
        // טעינת פרטי המשימה
        const taskData = await taskService.getTaskById(taskId) as ExtendedTask;
        
        if (!taskData) {
          setLoadError('המשימה לא נמצאה');
          setLoading(false);
          return;
        }
        
        setOriginalTask(taskData);
        
        // עדכון ערכי הטופס - רק השדות הקיימים במסד הנתונים
        setTask({
          title: taskData.title,
          description: taskData.description || '',
          project_id: taskData.project_id,
          stage_id: taskData.stage_id || '',
          parent_task_id: taskData.parent_task_id || '',
          hierarchical_number: taskData.hierarchical_number || '',
          priority: taskData.priority || 'medium',
          status: taskData.status || 'todo',
          due_date: formatDateForInput(taskData.due_date),
          category: taskData.category || '',
          responsible: taskData.responsible || '',
          dropbox_folder: taskData.dropbox_folder || '',
          estimated_hours: taskData.estimated_hours || 0,
          assignees: taskData.assignees || [],
        });
        
        // בדיקה אם המשתמש הוא הבעלים של המשימה או הפרויקט
        if (user) {
          if (taskData.assignees && taskData.assignees.includes(user.id)) {
            setIsOwner(true);
          } else {
            // נטען את הפרויקט כדי לבדוק אם המשתמש הוא בעל הפרויקט
            const projectData = await projectService.getProjectById(taskData.project_id);
            if (projectData && projectData.owner === user.id) {
              setIsOwner(true);
            } else {
              setLoadError('אין לך הרשאה לערוך משימה זו');
              setLoading(false);
              return;
            }
          }
        } else {
          setLoadError('יש להתחבר כדי לערוך משימה');
          setLoading(false);
          return;
        }
        
        // טעינת רשימת הפרויקטים
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // טעינת השלבים של הפרויקט הנוכחי
        if (taskData.project_id) {
          const stagesData = await stageService.getProjectStages(taskData.project_id);
          setStages(stagesData);
          
          // טעינת המשימות של הפרויקט הנוכחי
          fetchProjectTasks(taskData.project_id);
        }
      } catch (err) {
        console.error('שגיאה בטעינת נתוני המשימה:', err);
        setLoadError('אירעה שגיאה בטעינת נתוני המשימה');
        
        toast({
          title: 'שגיאה בטעינת הנתונים',
          description: err instanceof Error ? err.message : 'אירעה שגיאה בלתי צפויה',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskData();
  }, [taskId, user, toast, router]);
  
  // פונקציה לטעינת שלבים של פרויקט
  const fetchStages = async (projectId: string) => {
    try {
      setLoadingStages(true);
      const stagesData = await stageService.getProjectStages(projectId);
      setStages(stagesData);
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast({
        title: 'שגיאה בטעינת שלבים',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingStages(false);
    }
  };
  
  // פונקציה לטעינת משימות של פרויקט (עבור בחירת משימת אב)
  const fetchProjectTasks = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      setTasksLoading(true);
      const tasksData = await taskService.getTasks({ projectId });
      
      // סינון המשימה הנוכחית מהרשימה כדי למנוע לולאות
      const filteredTasks = tasksData.filter(t => t.id !== taskId);
      
      // פונקציית עזר לבדיקה האם ערך הוא מחרוזת תקינה
      const isValidString = (value: any): boolean => {
        return typeof value === 'string' && value !== null && value.length > 0;
      };
      
      // מיון המשימות לפי מספר היררכי
      const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (isValidString(a.hierarchical_number) && isValidString(b.hierarchical_number)) {
          try {
            // מיון לפי חלקי המספר ההיררכי
            const aNum = (a.hierarchical_number as string).split('.').map(Number);
            const bNum = (b.hierarchical_number as string).split('.').map(Number);
            
            for (let i = 0; i < Math.min(aNum.length, bNum.length); i++) {
              if (aNum[i] !== bNum[i]) {
                return aNum[i] - bNum[i];
              }
            }
            
            return aNum.length - bNum.length;
          } catch (error) {
            console.error('שגיאה במיון לפי מספר היררכי:', error, { a: a.hierarchical_number, b: b.hierarchical_number });
            // במקרה של שגיאה, מיון לפי כותרת
            return isValidString(a.title) && isValidString(b.title) ? 
              a.title.localeCompare(b.title) : 0;
          }
        } else if (isValidString(a.hierarchical_number)) {
          return -1; // a מופיע קודם
        } else if (isValidString(b.hierarchical_number)) {
          return 1; // b מופיע קודם
        }
        
        // מיון לפי כותרת אם אין מספרים היררכיים
        return isValidString(a.title) && isValidString(b.title) ? 
          a.title.localeCompare(b.title) : 0;
      });
      
      setParentTasks(sortedTasks);
    } catch (err) {
      console.error('שגיאה בטעינת משימות:', err);
      toast({
        title: 'שגיאה בטעינת משימות הפרויקט',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setTasksLoading(false);
    }
  };
  
  // עדכון שלבים ומשימות אב כאשר משתנה הפרויקט שנבחר
  useEffect(() => {
    if (task.project_id && task.project_id !== originalTask?.project_id) {
      fetchStages(task.project_id);
      fetchProjectTasks(task.project_id);
    }
  }, [task.project_id, originalTask]);
  
  // טיפול בשינויים בטופס
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'estimated_hours') {
      // וודא שהערך הוא מספרי ותקין
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setTask(prev => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setTask(prev => ({ ...prev, [name]: value }));
    }
    
    // ניקוי שגיאות כאשר המשתמש מתקן את הקלט
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // חישוב מספר היררכי אוטומטי
  const generateHierarchicalNumber = () => {
    if (!task.parent_task_id) {
      // אם אין משימת אב, נשתמש בפורמט פשוט
      return '';
    }
    
    // מצא את המשימה ההורה
    const parentTask = parentTasks.find(t => t.id === task.parent_task_id);
    if (!parentTask || !parentTask.hierarchical_number) return '';
    
    // מצא את כל המשימות שהן תחת אותה משימת אב
    const siblingTasks = parentTasks.filter(t => t.parent_task_id === task.parent_task_id);
    
    // חשב את המספר הבא בסדרה
    const nextNumber = siblingTasks.length + 1;
    
    // בנה את המספר ההיררכי
    return `${parentTask.hierarchical_number}.${nextNumber}`;
  };
  
  // וולידציה של הטופס
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!task.title?.trim()) {
      newErrors.title = 'יש להזין כותרת למשימה';
    }
    
    if (!task.project_id) {
      newErrors.project_id = 'יש לבחור פרויקט';
    }
    
    if (!task.stage_id && stages.length > 0) {
      newErrors.stage_id = 'יש לבחור שלב בפרויקט';
    }
    
    // וודא שזמן משוער לביצוע הוא מספר לא שלילי
    if (typeof task.estimated_hours === 'number' && task.estimated_hours < 0) {
      newErrors.estimated_hours = 'זמן משוער לביצוע לא יכול להיות שלילי';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // וודא שהפונקציה שמטפלת בעדכון האחראים עובדת כראוי
  const handleAssigneesChange = (value: string) => {
    // פיצול לפי פסיקים ליצירת מערך של אחראים
    const assigneesArray = value.split(',').map(item => item.trim()).filter(Boolean);
    setTask(prev => ({ ...prev, assignees: assigneesArray }));
  };
  
  // שליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // חישוב מספר היררכי אם המשימה היא תת-משימה ואין לה מספר היררכי
    if (task.parent_task_id && !task.hierarchical_number) {
      const hierarchicalNumber = generateHierarchicalNumber();
      setTask(prev => ({ ...prev, hierarchical_number: hierarchicalNumber }));
    }
    
    if (!validateForm()) {
      toast({
        title: 'שגיאה בטופס',
        description: 'נא לתקן את השגיאות לפני שליחת הטופס',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      return;
    }
    
    setSaveLoading(true);
    
    try {
      if (!originalTask) {
        throw new Error('לא ניתן לעדכן משימה שלא נטענה כראוי');
      }
      
      // יצירת אובייקט העדכון - רק שדות הקיימים במסד הנתונים
      const updateData: Partial<ExtendedTask> = {
        title: task.title,
        description: task.description,
        project_id: task.project_id,
        stage_id: task.stage_id || null,
        parent_task_id: task.parent_task_id || null,
        hierarchical_number: task.hierarchical_number || null,
        priority: task.priority,
        status: task.status,
        category: task.category || null,
        responsible: task.responsible || null,
        dropbox_folder: task.dropbox_folder || '',
        estimated_hours: task.estimated_hours,
        assignees: task.assignees || [],
      };
      
      // טיפול בשדות תאריך
      if (task.due_date) {
        updateData.due_date = task.due_date;
      } else {
        updateData.due_date = null;
      }
      
      // עדכון המשימה
      const updatedTask = await taskService.updateTask(taskId, updateData);
      
      toast({
        title: 'המשימה עודכנה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // מעבר חזרה לדף המשימה
      router.push(`/dashboard/tasks/${updatedTask.id}`);
    } catch (err) {
      console.error('שגיאה בעדכון המשימה:', err);
      
      toast({
        title: 'שגיאה בעדכון המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setSaveLoading(false);
    }
  };
  
  // חזרה לדף הקודם
  const handleBack = () => {
    router.back();
  };
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="70vh">
        <Spinner size="xl" color="primary.500" />
      </Flex>
    );
  }
  
  if (loadError) {
    return (
      <Container maxW="container.md" py={10}>
        <Flex direction="column" alignItems="center" textAlign="center">
          <FiAlertTriangle size={48} color="red" />
          <Heading mt={4} size="lg">{loadError}</Heading>
          <Text mt={2} color="gray.600">
            אין אפשרות לערוך את המשימה המבוקשת.
          </Text>
          <Button
            mt={6}
            colorScheme="primary"
            variant="outline"
            rightIcon={<FiChevronRight />}
            onClick={handleBack}
          >
            חזרה
          </Button>
        </Flex>
      </Container>
    );
  }
  
  return (
    <Container maxW="container.lg" py={8}>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex 
          justifyContent="space-between" 
          alignItems="center" 
          mb={8}
          bg={useColorModeValue('white', 'gray.800')} 
          p={4} 
          borderRadius="md" 
          shadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Heading size="lg">עריכת משימה</Heading>
          <Button 
            variant="outline" 
            rightIcon={<FiChevronRight />} 
            onClick={handleBack}
            colorScheme="gray"
          >
            חזרה
          </Button>
        </Flex>
        
        <Grid templateColumns={{ base: "1fr", md: "3fr 1fr" }} gap={8}>
          {/* החלק העיקרי - משמאל */}
          <GridItem>
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={{ base: 4, md: 6 }} mb={6} borderRadius="md" boxShadow="md">
              <VStack spacing={8} align="stretch">
                {/* כותרת המשימה */}
                <FormControl isRequired isInvalid={!!errors.title}>
                  <FormLabel fontSize="lg" fontWeight="bold" display="flex" alignItems="center">
                    <Icon as={FiFileText} mr={2} color="primary.500" />
                    כותרת המשימה
                  </FormLabel>
                  <Input
                    name="title"
                    value={task.title || ''}
                    onChange={handleChange}
                    placeholder="הזן כותרת למשימה"
                    size="lg"
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    height="50px"
                  />
                  {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
                </FormControl>
                
                {/* תיאור המשימה */}
                <FormControl>
                  <FormLabel fontSize="md" fontWeight="bold" display="flex" alignItems="center">
                    <Icon as={FiInfo} mr={2} color="blue.500" />
                    תיאור מפורט
                  </FormLabel>
                  <Textarea
                    name="description"
                    value={task.description || ''}
                    onChange={handleChange}
                    placeholder="תיאור מפורט של המשימה..."
                    minH="180px"
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    p={4}
                    fontSize="md"
                  />
                </FormControl>
              </VStack>
            </Card>
            
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={{ base: 4, md: 6 }} mb={6} borderRadius="md" boxShadow="md">
              <Text fontSize="lg" fontWeight="bold" mb={5} display="flex" alignItems="center">
                <Icon as={FiLayers} mr={3} color="purple.500" fontSize="24px" />
                פרטי משימה
              </Text>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* פרויקט */}
                <FormControl isRequired isInvalid={!!errors.project_id}>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiFolder} mr={2} color="blue.500" />
                    פרויקט
                  </FormLabel>
                  <Select
                    name="project_id"
                    value={task.project_id || ''}
                    onChange={handleChange}
                    placeholder="בחר פרויקט"
                    isDisabled={projects.length === 0}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </Select>
                  {errors.project_id && <FormErrorMessage>{errors.project_id}</FormErrorMessage>}
                  {projects.length === 0 && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      אין פרויקטים זמינים. אנא צור פרויקט תחילה.
                    </Text>
                  )}
                </FormControl>
                
                {/* שלב בפרויקט */}
                <FormControl isInvalid={!!errors.stage_id}>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiLayers} mr={2} color="purple.500" />
                    שלב בפרויקט
                  </FormLabel>
                  <Select
                    name="stage_id"
                    value={task.stage_id || ''}
                    onChange={handleChange}
                    placeholder={loadingStages ? "טוען שלבים..." : stages.length === 0 ? "אין שלבים זמינים" : "בחר שלב"}
                    isDisabled={loadingStages || stages.length === 0 || !task.project_id}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.title}</option>
                    ))}
                  </Select>
                  {errors.stage_id && <FormErrorMessage>{errors.stage_id}</FormErrorMessage>}
                </FormControl>
                
                {/* משימת אב */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiLayers} mr={2} color="teal.500" />
                    משימת אב
                  </FormLabel>
                  <Select
                    name="parent_task_id"
                    value={task.parent_task_id || ''}
                    onChange={handleChange}
                    placeholder={tasksLoading ? "טוען משימות..." : parentTasks.length === 0 ? "אין משימות זמינות" : "בחר משימת אב (אופציונלי)"}
                    isDisabled={tasksLoading || parentTasks.length === 0 || !task.project_id}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    <option value="">ללא משימת אב</option>
                    {parentTasks.map(parentTask => (
                      <option key={parentTask.id} value={parentTask.id}>
                        {parentTask.hierarchical_number ? `${parentTask.hierarchical_number}. ` : ''}{parentTask.title}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                {/* מספר היררכי */}
                {task.parent_task_id && (
                  <FormControl>
                    <FormLabel display="flex" alignItems="center" fontWeight="medium">
                      <Icon as={FiTag} mr={2} color="cyan.500" />
                      מספר היררכי
                    </FormLabel>
                    <Input
                      name="hierarchical_number"
                      value={(task.hierarchical_number || generateHierarchicalNumber() || '')}
                      onChange={handleChange}
                      placeholder="יחושב אוטומטית"
                      isReadOnly
                      bg={useColorModeValue('gray.50', 'gray.600')}
                      borderColor={borderColor}
                      h="42px"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      המספר יחושב אוטומטית בעת שמירת המשימה
                    </Text>
                  </FormControl>
                )}
                
                {/* קטגוריה */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiTag} mr={2} color="orange.500" />
                    קטגוריה
                  </FormLabel>
                  <Select
                    name="category"
                    value={task.category || ''}
                    onChange={handleChange}
                    placeholder="בחר קטגוריה (אופציונלי)"
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </Select>
                </FormControl>
                
                {/* אחראי */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiUsers} mr={2} color="blue.500" />
                    אחראי
                  </FormLabel>
                  <Input
                    name="responsible"
                    value={task.responsible || ''}
                    onChange={handleChange}
                    placeholder="שם האחראי לביצוע המשימה"
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  />
                </FormControl>
                
                {/* תיקיית דרופבוקס */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiFolder} mr={2} color="blue.400" />
                    תיקיית Dropbox
                  </FormLabel>
                  <Input
                    name="dropbox_folder"
                    value={task.dropbox_folder || ''}
                    onChange={handleChange}
                    placeholder="קישור לתיקיית Dropbox"
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  />
                </FormControl>
              </SimpleGrid>
            </Card>
            
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={{ base: 4, md: 6 }} mb={6} borderRadius="md" boxShadow="md">
              <Text fontSize="lg" fontWeight="bold" mb={5} display="flex" alignItems="center">
                <Icon as={FiCheckSquare} mr={3} color="green.500" fontSize="24px" />
                סטטוס ועדיפות
              </Text>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {/* עדיפות */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiFlag} mr={2} color="red.500" />
                    עדיפות
                  </FormLabel>
                  <Select
                    name="priority"
                    value={task.priority || 'medium'}
                    onChange={handleChange}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    {Object.entries(PRIORITY_MAP).map(([value, { label, color }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                
                {/* סטטוס */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiCheckSquare} mr={2} color="green.500" />
                    סטטוס
                  </FormLabel>
                  <Select
                    name="status"
                    value={task.status || 'todo'}
                    onChange={handleChange}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  >
                    {Object.entries(STATUS_MAP).map(([value, { label, color }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                
                {/* זמן משוער לביצוע */}
                <FormControl isInvalid={!!errors.estimated_hours}>
                  <FormLabel display="flex" alignItems="center" fontWeight="medium">
                    <Icon as={FiClock} mr={2} color="cyan.500" />
                    שעות משוערות
                  </FormLabel>
                  <InputGroup>
                    <Input
                      name="estimated_hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={task.estimated_hours?.toString() || ''}
                      onChange={handleChange}
                      placeholder="0"
                      bg={useColorModeValue('white', 'gray.700')}
                      borderColor={borderColor}
                      _hover={{ borderColor: 'primary.300' }}
                      _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                      h="42px"
                    />
                    <InputRightElement 
                      pointerEvents="none" 
                      children="שעות"
                      h="42px"
                      lineHeight="42px"
                      color="gray.500"
                      fontWeight="medium"
                      fontSize="sm"
                    />
                  </InputGroup>
                  {errors.estimated_hours && <FormErrorMessage>{errors.estimated_hours}</FormErrorMessage>}
                </FormControl>
              </SimpleGrid>
            </Card>
          </GridItem>
          
          {/* סיידבר - מימין */}
          <GridItem>
            <Card 
              bg={cardBg} 
              borderColor={borderColor} 
              borderWidth="1px" 
              p={{ base: 4, md: 6 }} 
              borderRadius="md" 
              position="sticky" 
              top="100px" 
              boxShadow="md"
            >
              <VStack spacing={6} align="stretch">
                {/* תאריך יעד */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center" fontWeight="bold">
                    <Icon as={FiCalendar} mr={2} color="orange.500" fontSize="18px" />
                    תאריך יעד
                  </FormLabel>
                  <Input
                    name="due_date"
                    type="date"
                    value={task.due_date || ''}
                    onChange={handleChange}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  />
                </FormControl>
                
                {/* תצוגת סיכום */}
                <Box 
                  bg={useColorModeValue('gray.50', 'gray.700')} 
                  p={4} 
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Text fontWeight="bold" mb={3} color="primary.600">סיכום משימה</Text>
                  <Divider mb={4} borderColor={borderColor} />
                  
                  <VStack align="stretch" spacing={4}>
                    {task.title && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">כותרת:</Text>
                        <Text fontWeight="bold" mt={1}>{task.title}</Text>
                      </Box>
                    )}
                    
                    {task.project_id && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">פרויקט:</Text>
                        <Text fontWeight="medium" mt={1} color="blue.600">
                          {projects.find(p => p.id === task.project_id)?.name || ''}
                        </Text>
                      </Box>
                    )}
                    
                    {task.stage_id && (
                      <Box>
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">שלב:</Text>
                        <Text fontWeight="medium" mt={1} color="purple.600">
                          {stages.find(s => s.id === task.stage_id)?.title || ''}
                        </Text>
                      </Box>
                    )}
                    
                    <Flex mt={2} justify="space-between">
                      <Box flex="1">
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">עדיפות:</Text>
                        <Badge 
                          colorScheme={
                            task.priority === 'high' ? 'orange' : 
                            task.priority === 'medium' ? 'yellow' : 
                            task.priority === 'urgent' ? 'red' :
                            'green'
                          }
                          px={2}
                          py={1}
                          borderRadius="full"
                          mt={1}
                          fontSize="sm"
                        >
                          {task.priority ? PRIORITY_MAP[task.priority]?.label || task.priority : 'בינונית'}
                        </Badge>
                      </Box>
                      
                      <Box flex="1">
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">סטטוס:</Text>
                        <Badge 
                          colorScheme={
                            task.status === 'done' ? 'green' : 
                            task.status === 'review' ? 'purple' : 
                            task.status === 'in_progress' ? 'blue' :
                            task.status === 'blocked' ? 'red' :
                            'gray'
                          }
                          px={2}
                          py={1}
                          borderRadius="full"
                          mt={1}
                          fontSize="sm"
                        >
                          {task.status ? STATUS_MAP[task.status]?.label || task.status : 'לביצוע'}
                        </Badge>
                      </Box>
                    </Flex>
                  </VStack>
                </Box>
                
                <Divider borderColor={borderColor} />
                
                <FormControl mt={4}>
                  <FormLabel display="flex" alignItems="center" fontWeight="bold">
                    <Icon as={FiUsers} mr={2} color="blue.500" fontSize="18px" />
                    צוות המשימה
                  </FormLabel>
                  <Input
                    name="assignees"
                    placeholder="הוסף חברי צוות מופרדים בפסיקים"
                    value={task.assignees?.join(', ') || ''}
                    onChange={(e) => handleAssigneesChange(e.target.value)}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'primary.300' }}
                    _focus={{ borderColor: 'primary.500', boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)' }}
                    h="42px"
                  />
                </FormControl>
                
                <Button 
                  colorScheme="primary" 
                  size="lg" 
                  type="submit" 
                  leftIcon={<FiSave />}
                  isLoading={saveLoading}
                  loadingText="שומר..."
                  h="50px"
                  fontSize="md"
                  fontWeight="bold"
                  mt={4}
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s"
                >
                  שמור שינויים
                </Button>
              </VStack>
            </Card>
          </GridItem>
        </Grid>
      </Box>
    </Container>
  );
} 