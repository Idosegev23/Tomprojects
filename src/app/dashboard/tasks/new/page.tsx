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
  Grid,
  GridItem,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
  Badge,
  useColorModeValue,
  Card,
  SimpleGrid,
  Avatar,
  AvatarGroup,
  Icon,
} from '@chakra-ui/react';
import { 
  FiChevronRight, 
  FiSave, 
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
import { useRouter } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import { Project, Stage, Task, ExtendedTask, ExtendedNewTask } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function NewTask() {
  // מצב מורחב של task עם כל השדות הנדרשים
  const [task, setTask] = useState<ExtendedNewTask>({
    title: '',
    description: '',
    project_id: '',
    stage_id: '',
    parent_task_id: '',
    hierarchical_number: '',
    due_date: formatDateForInput(addDays(new Date(), 7)),
    status: 'todo',
    priority: 'medium',
    category: '',
    responsible: '',
    dropbox_folder: '',
    estimated_hours: 0,
  });
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [stagesLoading, setStagesLoading] = useState<boolean>(false);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // פונקציה לפורמט תאריך עבור שדה input מסוג date
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // פונקציה להוספת ימים לתאריך
  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  // טעינת רשימת הפרויקטים
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const projectsData = await projectService.getProjects();
        setProjects(projectsData);
        
        // בחירת פרויקט ברירת מחדל אם יש פרויקטים
        if (projectsData.length > 0) {
          setTask(prev => ({ ...prev, project_id: projectsData[0].id }));
          // טעינת השלבים של הפרויקט הראשון
          fetchStages(projectsData[0].id);
          // טעינת המשימות של הפרויקט הראשון (למשימות אב)
          fetchProjectTasks(projectsData[0].id);
        }
      } catch (err) {
        console.error('שגיאה בטעינת פרויקטים:', err);
        toast({
          title: 'שגיאה בטעינת פרויקטים',
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
      } finally {
        setProjectsLoading(false);
      }
    };
    
    fetchProjects();
  }, [toast]);
  
  // פונקציה לטעינת שלבים של פרויקט
  const fetchStages = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      setStagesLoading(true);
      const stagesData = await stageService.getProjectStages(projectId);
      setStages(stagesData);
      
      // בחירת שלב ברירת מחדל אם יש שלבים
      if (stagesData.length > 0) {
        setTask(prev => ({ ...prev, stage_id: stagesData[0].id }));
      } else {
        setTask(prev => ({ ...prev, stage_id: '' }));
      }
    } catch (err) {
      console.error('שגיאה בטעינת שלבים:', err);
      toast({
        title: 'שגיאה בטעינת שלבי הפרויקט',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setStagesLoading(false);
    }
  };
  
  // פונקציה לטעינת משימות של פרויקט (עבור בחירת משימת אב)
  const fetchProjectTasks = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      setTasksLoading(true);
      const tasksData = await taskService.getTasks({ projectId });
      setParentTasks(tasksData);
      setTasksLoading(false);
    } catch (err) {
      console.error('שגיאה בטעינת משימות:', err);
      toast({
        title: 'שגיאה בטעינת משימות הפרויקט',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      setTasksLoading(false);
    }
  };
  
  // עדכון שלבים ומשימות אב כאשר משתנה הפרויקט שנבחר
  useEffect(() => {
    if (task.project_id) {
      fetchStages(task.project_id);
      fetchProjectTasks(task.project_id);
    }
  }, [task.project_id]);
  
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
    
    if (!task.title.trim()) {
      newErrors.title = 'יש להזין כותרת למשימה';
    }
    
    if (!task.project_id) {
      newErrors.project_id = 'יש לבחור פרויקט';
    }
    
    if (!task.stage_id && stages.length > 0) {
      newErrors.stage_id = 'יש לבחור שלב בפרויקט';
    }
    
    // וודא שזמן משוער לביצוע הוא מספר לא שלילי
    if (task.estimated_hours !== null && task.estimated_hours !== undefined && task.estimated_hours < 0) {
      newErrors.estimated_hours = 'זמן משוער לביצוע לא יכול להיות שלילי';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // שליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // חישוב מספר היררכי אם המשימה היא תת-משימה
    let hierarchicalNumber = '';
    if (task.parent_task_id) {
      hierarchicalNumber = generateHierarchicalNumber();
      setTask(prev => ({ ...prev, hierarchical_number: hierarchicalNumber }));
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const formattedTask = {
        ...task,
        hierarchical_number: hierarchicalNumber,
        estimated_hours: task.estimated_hours !== null && task.estimated_hours !== undefined 
          ? parseFloat(task.estimated_hours.toString()) 
          : 0,
      } as ExtendedNewTask;

      const newTask = await taskService.createTask(formattedTask);
      
      toast({
        title: 'המשימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // ניווט לדף המשימה החדשה
      router.push(`/dashboard/tasks/${newTask.id}`);
    } catch (err) {
      console.error('שגיאה ביצירת משימה:', err);
      
      toast({
        title: 'שגיאה ביצירת המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה ביצירת המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      
      setLoading(false);
    }
  };
  
  // חזרה לדף הקודם
  const handleBack = () => {
    router.back();
  };
  
  return (
    <Container maxW="container.lg" py={8}>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading size="lg">משימה חדשה</Heading>
          <Button 
            variant="outline" 
            rightIcon={<FiChevronRight />} 
            onClick={handleBack}
          >
            חזרה
          </Button>
        </Flex>
        
        <Grid templateColumns={{ base: "1fr", md: "3fr 1fr" }} gap={6}>
          {/* החלק העיקרי - משמאל */}
          <GridItem>
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={6} mb={6} borderRadius="md" boxShadow="sm">
              <VStack spacing={6} align="stretch">
                {/* כותרת המשימה */}
                <FormControl isRequired isInvalid={!!errors.title}>
                  <FormLabel fontSize="lg" fontWeight="bold" display="flex" alignItems="center">
                    <Icon as={FiFileText} mr={2} />
                    כותרת המשימה
                  </FormLabel>
                  <Input
                    name="title"
                    value={task.title}
                    onChange={handleChange}
                    placeholder="הזן כותרת למשימה"
                    size="lg"
                    bg="white"
                  />
                  {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
                </FormControl>
                
                {/* תיאור המשימה */}
                <FormControl>
                  <FormLabel fontSize="md" fontWeight="bold" display="flex" alignItems="center">
                    <Icon as={FiInfo} mr={2} />
                    תיאור מפורט
                  </FormLabel>
                  <Textarea
                    name="description"
                    value={task.description ?? ''}
                    onChange={handleChange}
                    placeholder="תיאור מפורט של המשימה..."
                    minH="150px"
                    bg="white"
                  />
                </FormControl>
              </VStack>
            </Card>
            
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={6} mb={6} borderRadius="md" boxShadow="sm">
              <Text fontSize="lg" fontWeight="bold" mb={4} display="flex" alignItems="center">
                <Icon as={FiLayers} mr={2} />
                פרטי משימה
              </Text>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* פרויקט */}
                <FormControl isRequired isInvalid={!!errors.project_id}>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiFolder} mr={2} color="blue.500" />
                    פרויקט
                  </FormLabel>
                  <Select
                    name="project_id"
                    value={task.project_id || ''}
                    onChange={handleChange}
                    placeholder="בחר פרויקט"
                    isDisabled={projectsLoading || projects.length === 0}
                    bg="white"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </Select>
                  {errors.project_id && <FormErrorMessage>{errors.project_id}</FormErrorMessage>}
                  {projects.length === 0 && !projectsLoading && (
                    <Text fontSize="sm" color="red.500" mt={1}>
                      אין פרויקטים זמינים. אנא צור פרויקט תחילה.
                    </Text>
                  )}
                </FormControl>
                
                {/* שלב בפרויקט */}
                <FormControl isInvalid={!!errors.stage_id}>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiLayers} mr={2} color="purple.500" />
                    שלב בפרויקט
                  </FormLabel>
                  <Select
                    name="stage_id"
                    value={task.stage_id || ''}
                    onChange={handleChange}
                    placeholder={stagesLoading ? "טוען שלבים..." : stages.length === 0 ? "אין שלבים זמינים" : "בחר שלב"}
                    isDisabled={stagesLoading || stages.length === 0 || !task.project_id}
                    bg="white"
                  >
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.title}</option>
                    ))}
                  </Select>
                  {errors.stage_id && <FormErrorMessage>{errors.stage_id}</FormErrorMessage>}
                </FormControl>
                
                {/* משימת אב */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiLayers} mr={2} color="teal.500" />
                    משימת אב
                  </FormLabel>
                  <Select
                    name="parent_task_id"
                    value={task.parent_task_id || ''}
                    onChange={handleChange}
                    placeholder={tasksLoading ? "טוען משימות..." : parentTasks.length === 0 ? "אין משימות זמינות" : "בחר משימת אב (אופציונלי)"}
                    isDisabled={tasksLoading || parentTasks.length === 0 || !task.project_id}
                    bg="white"
                  >
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
                    <FormLabel display="flex" alignItems="center">
                      <Icon as={FiTag} mr={2} color="cyan.500" />
                      מספר היררכי
                    </FormLabel>
                    <Input
                      name="hierarchical_number"
                      value={(task.hierarchical_number || generateHierarchicalNumber() || '')}
                      onChange={handleChange}
                      placeholder="יחושב אוטומטית"
                      isReadOnly
                      bg="gray.50"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      המספר יחושב אוטומטית בעת שמירת המשימה
                    </Text>
                  </FormControl>
                )}
                
                {/* קטגוריה */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiTag} mr={2} color="orange.500" />
                    קטגוריה
                  </FormLabel>
                  <Select
                    name="category"
                    value={task.category || ''}
                    onChange={handleChange}
                    placeholder="בחר קטגוריה (אופציונלי)"
                    bg="white"
                  >
                    <option value="development">פיתוח</option>
                    <option value="design">עיצוב</option>
                    <option value="documentation">תיעוד</option>
                    <option value="testing">בדיקות</option>
                    <option value="deployment">הטמעה</option>
                    <option value="maintenance">תחזוקה</option>
                    <option value="other">אחר</option>
                  </Select>
                </FormControl>
                
                {/* אחראי */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiUsers} mr={2} color="blue.500" />
                    אחראי
                  </FormLabel>
                  <Input
                    name="responsible"
                    value={task.responsible || ''}
                    onChange={handleChange}
                    placeholder="שם האחראי לביצוע המשימה"
                    bg="white"
                  />
                </FormControl>
                
                {/* תיקיית דרופבוקס */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiFolder} mr={2} color="blue.400" />
                    תיקיית Dropbox
                  </FormLabel>
                  <Input
                    name="dropbox_folder"
                    value={task.dropbox_folder || ''}
                    onChange={handleChange}
                    placeholder="קישור לתיקיית Dropbox"
                    bg="white"
                  />
                </FormControl>
              </SimpleGrid>
            </Card>
            
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={6} mb={6} borderRadius="md" boxShadow="sm">
              <Text fontSize="lg" fontWeight="bold" mb={4} display="flex" alignItems="center">
                <Icon as={FiCheckSquare} mr={2} />
                סטטוס ועדיפות
              </Text>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {/* עדיפות */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiFlag} mr={2} color="red.500" />
                    עדיפות
                  </FormLabel>
                  <Select
                    name="priority"
                    value={task.priority || 'medium'}
                    onChange={handleChange}
                    bg="white"
                  >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="urgent">דחופה</option>
                  </Select>
                </FormControl>
                
                {/* סטטוס */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiCheckSquare} mr={2} color="green.500" />
                    סטטוס
                  </FormLabel>
                  <Select
                    name="status"
                    value={task.status || 'todo'}
                    onChange={handleChange}
                    bg="white"
                  >
                    <option value="todo">לביצוע</option>
                    <option value="in_progress">בתהליך</option>
                    <option value="review">בבדיקה</option>
                    <option value="done">הושלם</option>
                    <option value="blocked">חסום</option>
                  </Select>
                </FormControl>
                
                {/* זמן משוער לביצוע */}
                <FormControl isInvalid={!!errors.estimated_hours}>
                  <FormLabel display="flex" alignItems="center">
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
                      bg="white"
                    />
                    <InputRightElement pointerEvents="none" children="שעות" />
                  </InputGroup>
                  {errors.estimated_hours && <FormErrorMessage>{errors.estimated_hours}</FormErrorMessage>}
                </FormControl>
              </SimpleGrid>
            </Card>
          </GridItem>
          
          {/* סיידבר - מימין */}
          <GridItem>
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" p={6} borderRadius="md" position="sticky" top="100px" boxShadow="sm">
              <VStack spacing={6} align="stretch">
                {/* תאריך יעד */}
                <FormControl>
                  <FormLabel display="flex" alignItems="center">
                    <Icon as={FiCalendar} mr={2} color="yellow.500" />
                    תאריך יעד
                  </FormLabel>
                  <Input
                    name="due_date"
                    type="date"
                    value={task.due_date || ''}
                    onChange={handleChange}
                    bg="white"
                  />
                </FormControl>
                
                {/* תצוגת סיכום */}
                <Box>
                  <Text fontWeight="bold" mb={2}>סיכום משימה</Text>
                  <Divider mb={3} />
                  
                  <VStack align="stretch" spacing={3}>
                    {task.title && (
                      <Box>
                        <Text fontSize="sm" color="gray.500">כותרת:</Text>
                        <Text fontWeight="medium">{task.title}</Text>
                      </Box>
                    )}
                    
                    {task.project_id && (
                      <Box>
                        <Text fontSize="sm" color="gray.500">פרויקט:</Text>
                        <Text>{projects.find(p => p.id === task.project_id)?.name || ''}</Text>
                      </Box>
                    )}
                    
                    {task.stage_id && (
                      <Box>
                        <Text fontSize="sm" color="gray.500">שלב:</Text>
                        <Text>{stages.find(s => s.id === task.stage_id)?.title || ''}</Text>
                      </Box>
                    )}
                    
                    <Flex>
                      <Box flex="1">
                        <Text fontSize="sm" color="gray.500">עדיפות:</Text>
                        <Badge colorScheme={
                          task.priority === 'high' ? 'red' : 
                          task.priority === 'medium' ? 'orange' : 
                          'green'
                        }>
                          {task.priority === 'high' ? 'גבוהה' : 
                           task.priority === 'medium' ? 'בינונית' : 
                           'נמוכה'}
                        </Badge>
                      </Box>
                      
                      <Box flex="1">
                        <Text fontSize="sm" color="gray.500">סטטוס:</Text>
                        <Badge colorScheme={
                          task.status === 'done' ? 'green' : 
                          task.status === 'review' ? 'purple' : 
                          task.status === 'in_progress' ? 'blue' : 
                          'gray'
                        }>
                          {task.status === 'todo' ? 'לביצוע' : 
                           task.status === 'in_progress' ? 'בתהליך' : 
                           task.status === 'review' ? 'בבדיקה' : 
                           'הושלם'}
                        </Badge>
                      </Box>
                    </Flex>
                  </VStack>
                </Box>
                
                <Divider />
                
                <Button 
                  colorScheme="primary" 
                  size="lg" 
                  type="submit" 
                  leftIcon={<FiSave />}
                  isLoading={loading}
                  loadingText="שומר..."
                >
                  שמור משימה
                </Button>
              </VStack>
            </Card>
          </GridItem>
        </Grid>
      </Box>
    </Container>
  );
} 