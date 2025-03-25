'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Button,
  Divider,
  Badge,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Spinner,
  Progress,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  IconButton,
  useToast,
  HStack,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useBreakpointValue,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Tooltip,
  SimpleGrid,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiTrash2, 
  FiCalendar, 
  FiUsers, 
  FiList,
  FiPlusSquare,
  FiColumns,
  FiMoreVertical,
  FiInfo as InfoIcon,
  FiCheck as CheckIcon,
  FiEye as ViewIcon,
  FiCalendar as CalendarIcon,
  FiPlus,
  FiRefreshCw,
  FiClock,
  FiTarget,
  FiFlag,
  FiAlertCircle,
  FiBarChart2,
  FiCreditCard,
  FiTrello,
  FiActivity,
  FiStar,
} from 'react-icons/fi';
import projectService from '@/lib/services/projectService';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';
import { Project, Task, Stage } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';
import TaskTree from '@/components/tasks/TaskTree';
import TaskGantt from '@/components/tasks/TaskGantt';
import TaskList from '@/components/tasks/TaskList';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import AssignTasksModal from '@/components/tasks/AssignTasksModal';
import TaskKanban from '@/components/tasks/TaskKanban';

type ProjectPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAssignTasksModalOpen, setIsAssignTasksModalOpen] = useState(false);
  
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: true, lg: false });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // טעינת נתוני הפרויקט
  useEffect(() => {
    // אם המזהה הוא "new", נפנה את המשתמש לדף יצירת פרויקט חדש
    if (id === 'new') {
      router.push('/dashboard/projects/new');
      return;
    }
    
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרטי הפרויקט
        const projectData = await projectService.getProjectById(id);
        if (!projectData) {
          setError('הפרויקט לא נמצא');
          return;
        }
        setProject(projectData);
        
        // טעינת השלבים של הפרויקט
        const stagesData = await stageService.getProjectStages(id);
        setStages(stagesData);
        
        // טעינת משימות הפרויקט
        const tasksData = await taskService.getProjectSpecificTasks(id);
        setTasks(tasksData);
        
        // חישוב התקדמות הפרויקט
        const progressData = await projectService.calculateProjectProgress(id);
        setProgress(progressData);
      } catch (err) {
        console.error('שגיאה בטעינת נתוני הפרויקט:', err);
        setError('אירעה שגיאה בטעינת נתוני הפרויקט');
        
        toast({
          title: 'שגיאה בטעינת נתונים',
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
    
    loadProjectData();
  }, [id, toast, router]);
  
  // מחיקת פרויקט
  const handleDeleteProject = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פרויקט זה? כל המשימות המשויכות אליו יימחקו גם כן. פעולה זו אינה הפיכה.')) {
      return;
    }
    
    try {
      await projectService.deleteProject(id);
      
      toast({
        title: 'הפרויקט נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // חזרה לדף הפרויקטים
      router.push('/dashboard/projects');
    } catch (err) {
      console.error('שגיאה במחיקת פרויקט:', err);
      
      toast({
        title: 'שגיאה במחיקת הפרויקט',
        description: err instanceof Error ? err.message : 'אירעה שגיאה במחיקת הפרויקט',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
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
  
  // פונקציה שמחזירה צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'פעיל': return 'green';
      case 'planning':
      case 'בתכנון': return 'blue';
      case 'on hold':
      case 'בהמתנה': return 'orange';
      case 'completed':
      case 'הושלם': return 'purple';
      case 'cancelled':
      case 'בוטל': return 'red';
      default: return 'gray';
    }
  };
  
  // טיפול ביצירת משימה חדשה
  const handleTaskCreated = (newTask: Task) => {
    setTasks([...tasks, newTask]);
  };
  
  // טיפול בעדכון משימה
  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };
  
  // טיפול במחיקת משימה
  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  // טיפול בעריכת משימה
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  // טיפול במחיקת משימה
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await taskService.deleteTask(taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        toast({
          title: 'המשימה נמחקה בהצלחה',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error deleting task:', error);
        toast({
          title: 'שגיאה במחיקת המשימה',
          description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  // טיפול בשינוי סטטוס משימה
  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      console.log('handleStatusChange - status before normalization:', status);
      
      // המרת הסטטוס לאותיות קטנות
      let normalizedStatus = status.toLowerCase();
      
      console.log('handleStatusChange - normalizedStatus after normalization:', normalizedStatus);
      
      // וידוא שהסטטוס תקין
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
      if (!validStatuses.includes(normalizedStatus)) {
        // אם הסטטוס לא תקין, ננסה למפות אותו לערך תקין
        if (normalizedStatus === 'לביצוע' || normalizedStatus === 'to do' || normalizedStatus === 'todo') {
          normalizedStatus = 'todo';
        } else if (normalizedStatus === 'בתהליך' || normalizedStatus === 'in progress' || normalizedStatus === 'in_progress') {
          normalizedStatus = 'in_progress';
        } else if (normalizedStatus === 'בבדיקה' || normalizedStatus === 'in review' || normalizedStatus === 'review') {
          normalizedStatus = 'review';
        } else if (normalizedStatus === 'הושלם' || normalizedStatus === 'completed' || normalizedStatus === 'done') {
          normalizedStatus = 'done';
        } else {
          throw new Error(`סטטוס לא תקין: ${normalizedStatus}. הסטטוסים התקינים הם: ${validStatuses.join(', ')}`);
        }
      }
      
      // עדכון הסטטוס בשרת
      const updatedTask = await taskService.updateTaskStatus(taskId, normalizedStatus);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      
      // עדכון התקדמות הפרויקט
      const updatedProgress = await projectService.calculateProjectProgress(id);
      setProgress(updatedProgress);
      
      toast({
        title: 'סטטוס המשימה עודכן',
        description: `המשימה עודכנה לסטטוס: ${normalizedStatus}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס המשימה:', error);
      
      toast({
        title: 'שגיאה בעדכון סטטוס המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בעדכון סטטוס המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // טיפול בגרירת משימה בגאנט
  const handleTaskDrop = async (taskId: string, newStartDate: string, newEndDate: string) => {
    try {
      const updatedTask = await taskService.updateTask(taskId, {
        start_date: newStartDate,
        due_date: newEndDate,
        updated_at: new Date().toISOString()
      });
      
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      
      toast({
        title: 'תאריכי המשימה עודכנו',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating task dates:', error);
      toast({
        title: 'שגיאה בעדכון תאריכי המשימה',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // טיפול בשינוי שלב משימה
  const handleStageChange = async (taskId: string, stageId: string) => {
    try {
      // וידוא שהשלב קיים
      const stageExists = stages.some(stage => stage.id === stageId);
      if (!stageExists) {
        throw new Error(`שלב לא קיים: ${stageId}`);
      }
      
      // עדכון השלב בשרת
      const updatedTask = await taskService.updateTaskStage(taskId, stageId);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      
      // מציאת שם השלב להצגה בהודעה
      const stageName = stages.find(stage => stage.id === stageId)?.title || stageId;
      
      toast({
        title: 'שלב המשימה עודכן',
        description: `המשימה הועברה לשלב: ${stageName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה בעדכון שלב המשימה:', error);
      
      toast({
        title: 'שגיאה בעדכון שלב המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בעדכון שלב המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // סנכרון משימות הפרויקט
  const handleSyncProjectData = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      // 1. תחילה נסנכרן את השלבים
      const stagesResponse = await fetch('/api/projects/sync-stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: id }),
      });
      
      if (!stagesResponse.ok) {
        const stagesError = await stagesResponse.json();
        throw new Error(stagesError.error || 'שגיאה בסנכרון שלבים');
      }
      
      const stagesResult = await stagesResponse.json();
      console.log('תוצאת סנכרון שלבים:', stagesResult);
      
      // 2. לאחר מכן נסנכרן את המשימות
      await projectService.syncProjectTasks(id);
      
      // רענון רשימת המשימות והשלבים
      const updatedStages = await stageService.getProjectStages(id);
      setStages(updatedStages);
      
      const updatedTasks = await taskService.getTasksByProject(id);
      setTasks(updatedTasks);
      
      // עדכון התקדמות הפרויקט
      const updatedProject = await projectService.getProjectById(id);
      if (updatedProject) {
        setProject(updatedProject);
      }
      
      // הצגת הודעת הצלחה
      toast({
        title: 'נתוני הפרויקט סונכרנו בהצלחה',
        description: `סונכרנו ${stagesResult.project_stages_count || 0} שלבים ו-${updatedTasks.length || 0} משימות`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } catch (error) {
      console.error('שגיאה בסנכרון נתוני פרויקט:', error);
      
      toast({
        title: 'שגיאה בסנכרון',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה',
        status: 'error', 
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      {loading ? (
        <Flex justify="center" align="center" minH="50vh" direction="column" gap={3}>
          <Spinner size="xl" thickness="4px" color="blue.500" speed="0.65s" />
          <Text>טוען נתוני פרויקט...</Text>
        </Flex>
      ) : error ? (
        <Box p={5} borderWidth="1px" borderRadius="lg" bg="red.50">
          <Heading size="md" color="red.600" mb={2}>
            <Icon as={FiAlertCircle} mr={2} />
            שגיאה בטעינת נתוני הפרויקט
          </Heading>
          <Text>{error}</Text>
          <Button mt={4} onClick={() => router.push('/dashboard/projects')}>
            חזרה לרשימת הפרויקטים
          </Button>
        </Box>
      ) : project && (
        <>
          {/* כותרת הפרויקט ומידע בסיסי */}
          <Box mb={6}>
            <Flex 
              direction={{ base: 'column', md: 'row' }} 
              justify="space-between" 
              align={{ base: 'flex-start', md: 'center' }} 
              mb={4} 
              gap={3}
            >
              <HStack spacing={2}>
                <Tooltip label="חזרה לרשימת הפרויקטים">
                  <IconButton
                    aria-label="חזור לרשימת הפרויקטים"
                    icon={<FiArrowLeft />}
                    onClick={() => router.push('/dashboard/projects')}
                    variant="ghost"
                    size="md"
                    colorScheme="blue"
                  />
                </Tooltip>
                <Heading size={{ base: 'md', md: 'lg' }}>{project.name}</Heading>
                <Tooltip label={`סטטוס: ${project.status}`}>
                  <Badge 
                    colorScheme={getStatusColor(project.status)} 
                    fontSize="md" 
                    px={2} 
                    py={1}
                    borderRadius="full"
                  >
                    {project.status}
                  </Badge>
                </Tooltip>
              </HStack>
              
              {isMobile ? (
                <Menu closeOnSelect={true}>
                  <MenuButton 
                    as={IconButton} 
                    icon={<FiMoreVertical />} 
                    variant="outline"
                    aria-label="פעולות נוספות"
                  />
                  <MenuList>
                    <MenuItem 
                      icon={<FiRefreshCw />} 
                      onClick={handleSyncProjectData} 
                      isDisabled={loading}
                    >
                      סנכרון נתוני פרויקט
                    </MenuItem>
                    <MenuItem 
                      icon={<FiEdit />} 
                      onClick={() => router.push(`/dashboard/projects/${id}/edit`)}
                    >
                      ערוך פרויקט
                    </MenuItem>
                    <MenuItem 
                      icon={<FiTrash2 />} 
                      onClick={onOpen}
                      color="red.500"
                    >
                      מחק פרויקט
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <HStack>
                  <Tooltip label="סנכרון נתוני הפרויקט מהתבניות">
                    <Button
                      leftIcon={<FiRefreshCw />}
                      size="sm"
                      colorScheme="blue"
                      onClick={handleSyncProjectData}
                      isLoading={loading}
                    >
                      סנכרון נתוני פרויקט
                    </Button>
                  </Tooltip>
                  <ActionButtons projectId={id} />
                </HStack>
              )}
            </Flex>
            
            {project.description && (
              <Card mb={4} variant="outline" bg={useColorModeValue('gray.50', 'gray.700')}>
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={InfoIcon} color="blue.500" />
                    <Text fontWeight="bold">תיאור הפרויקט</Text>
                  </HStack>
                  <Text>{project.description}</Text>
                </CardBody>
              </Card>
            )}
            
            <SimpleGrid 
              columns={{ base: 1, sm: 2, md: 4 }}
              spacing={4} 
              mb={4}
            >
              <Card variant="elevated" shadow="md" bg={useColorModeValue('white', 'gray.700')}>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiCalendar} color="blue.500" />
                        <Text>תאריך התחלה</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="lg">{formatDate(project.planned_start_date)}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card variant="elevated" shadow="md" bg={useColorModeValue('white', 'gray.700')}>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiTarget} color="purple.500" />
                        <Text>תאריך סיום</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="lg">{formatDate(project.planned_end_date)}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card variant="elevated" shadow="md" bg={useColorModeValue('white', 'gray.700')}>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiBarChart2} color="green.500" />
                        <Text>התקדמות</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="lg">{progress}%</StatNumber>
                    <Progress 
                      value={progress} 
                      colorScheme={progress < 30 ? 'red' : progress < 70 ? 'orange' : 'green'} 
                      size="sm" 
                      mt={2} 
                      borderRadius="full"
                    />
                  </Stat>
                </CardBody>
              </Card>
              
              <Card variant="elevated" shadow="md" bg={useColorModeValue('white', 'gray.700')}>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiCreditCard} color="orange.500" />
                        <Text>משימות</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber fontSize="lg">{tasks.length}</StatNumber>
                    <StatHelpText>{tasks.filter(t => t.status === 'done').length} הושלמו</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              {project.entrepreneur && (
                <Card variant="elevated" shadow="md" bg={useColorModeValue('white', 'gray.700')}>
                  <CardBody>
                    <Stat>
                      <StatLabel>
                        <HStack>
                          <Icon as={FiUsers} color="teal.500" />
                          <Text>יזם</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber fontSize="lg">{project.entrepreneur}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>
              )}
            </SimpleGrid>
          </Box>
          
          {/* טאבים לתצוגות שונות */}
          <Card variant="outline" shadow="sm" mb={4}>
            <CardBody p={0}>
              <Tabs 
                index={tabIndex} 
                onChange={setTabIndex} 
                variant="enclosed" 
                isLazy
                colorScheme="blue"
              >
                <TabList overflowX="auto" overflowY="hidden">
                  <Tooltip label="הצג את כל המשימות כרשימה">
                    <Tab><HStack><FiList /><Text>רשימה</Text></HStack></Tab>
                  </Tooltip>
                  <Tooltip label="הצג משימות לפי שלבים בלוח קנבן">
                    <Tab><HStack><FiColumns /><Text>קנבן</Text></HStack></Tab>
                  </Tooltip>
                  <Tooltip label="הצג לוח זמנים של המשימות">
                    <Tab><HStack><FiCalendar /><Text>גאנט</Text></HStack></Tab>
                  </Tooltip>
                  <Tooltip label="הצג את מבנה המשימות בצורת עץ">
                    <Tab><HStack><FiUsers /><Text>עץ</Text></HStack></Tab>
                  </Tooltip>
                </TabList>
                
                <TabPanels>
                  {/* תצוגת רשימה */}
                  <TabPanel>
                    <Box>
                      {tasks.length > 0 ? (
                        <TaskList 
                          projectId={id}
                          onTaskCreated={handleTaskCreated}
                          onTaskUpdated={handleTaskUpdated}
                          onTaskDeleted={handleDeleteTask}
                        />
                      ) : (
                        <Card p={8} textAlign="center" variant="outline">
                          <CardBody>
                            <Icon as={FiCreditCard} w={12} h={12} color="gray.400" mb={4} />
                            <Heading size="md" mb={2}>אין משימות בפרויקט זה</Heading>
                            <Text mb={6} color="gray.500">
                              התחל ליצור משימות כדי לנהל את הפרויקט שלך
                            </Text>
                            <Button
                              leftIcon={<FiPlus />}
                              colorScheme="blue"
                              onClick={() => {
                                setSelectedTask(null);
                                setIsTaskModalOpen(true);
                              }}
                            >
                              צור משימה חדשה
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  </TabPanel>
                  
                  {/* תצוגת קנבן */}
                  <TabPanel>
                    <Box>
                      {stages.length > 0 ? (
                        <TaskKanban
                          projects={[project]}
                          stages={stages}
                          tasks={tasks}
                          onEditTask={handleTaskUpdated}
                          onDeleteTask={handleTaskDeleted}
                          onStageChange={handleStageChange}
                          onStatusChange={handleStatusChange}
                        />
                      ) : (
                        <Card p={8} textAlign="center" variant="outline">
                          <CardBody>
                            <Icon as={FiTrello} w={12} h={12} color="gray.400" mb={4} />
                            <Heading size="md" mb={2}>אין שלבים מוגדרים בפרויקט</Heading>
                            <Text mb={6} color="gray.500">
                              בצע סנכרון של נתוני הפרויקט כדי לטעון את השלבים מהתבניות
                            </Text>
                            <Button
                              leftIcon={<FiRefreshCw />}
                              colorScheme="blue"
                              onClick={handleSyncProjectData}
                              isLoading={loading}
                            >
                              סנכרון נתוני פרויקט
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  </TabPanel>
                  
                  {/* תצוגת גאנט */}
                  <TabPanel>
                    <Box>
                      {tasks.length > 0 ? (
                        <TaskGantt
                          tasks={tasks}
                          onTaskDrop={handleTaskDrop}
                        />
                      ) : (
                        <Card p={8} textAlign="center" variant="outline">
                          <CardBody>
                            <Icon as={FiActivity} w={12} h={12} color="gray.400" mb={4} />
                            <Heading size="md" mb={2}>אין משימות להצגה בגאנט</Heading>
                            <Text mb={6} color="gray.500">
                              צור משימות עם תאריכי התחלה וסיום כדי להציג אותן בתצוגת גאנט
                            </Text>
                            <Button
                              leftIcon={<FiPlus />}
                              colorScheme="blue"
                              onClick={() => {
                                setSelectedTask(null);
                                setIsTaskModalOpen(true);
                              }}
                            >
                              צור משימה חדשה
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  </TabPanel>
                  
                  {/* תצוגת עץ */}
                  <TabPanel>
                    <Box>
                      {tasks.length > 0 ? (
                        <TaskTree
                          projectId={id}
                          tasks={tasks}
                          onTaskEdited={handleTaskUpdated}
                          onTaskDeleted={handleTaskDeleted}
                          onTaskStatusChanged={handleStatusChange}
                        />
                      ) : (
                        <Card p={8} textAlign="center" variant="outline">
                          <CardBody>
                            <Icon as={FiStar} w={12} h={12} color="gray.400" mb={4} />
                            <Heading size="md" mb={2}>אין משימות להצגה בעץ המשימות</Heading>
                            <Text mb={6} color="gray.500">
                              צור משימות עם קשרי הורה-ילד כדי להציג אותן בתצוגת עץ
                            </Text>
                            <Button
                              leftIcon={<FiPlus />}
                              colorScheme="blue"
                              onClick={() => {
                                setSelectedTask(null);
                                setIsTaskModalOpen(true);
                              }}
                            >
                              צור משימה חדשה
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>

          {/* מודל עריכת משימה */}
          {isTaskModalOpen && (
            <TaskEditModal
              isOpen={isTaskModalOpen}
              onClose={() => setIsTaskModalOpen(false)}
              task={selectedTask}
              projectId={id}
              onTaskCreated={handleTaskCreated}
              onTaskUpdated={handleTaskUpdated}
            />
          )}
          
          {/* מודל הקצאת משימות */}
          {isAssignTasksModalOpen && (
            <AssignTasksModal
              isOpen={isAssignTasksModalOpen}
              onClose={() => setIsAssignTasksModalOpen(false)}
              projectId={id}
              onTasksAssigned={(assignedTasks) => {
                // הוספת כל המשימות שהוקצו לרשימת המשימות
                setTasks([...tasks, ...assignedTasks]);
              }}
            />
          )}
          
          {/* דיאלוג אישור מחיקת פרויקט */}
          <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={cancelRef}
            onClose={onClose}
          >
            <AlertDialogOverlay>
              <AlertDialogContent>
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  מחיקת פרויקט
                </AlertDialogHeader>
                
                <AlertDialogBody>
                  האם אתה בטוח שברצונך למחוק את הפרויקט <b>{project.name}</b>?
                  <Text mt={2} color="red.500">
                    פעולה זו תמחק את כל המשימות והשלבים המשויכים לפרויקט, ולא ניתן לבטל אותה.
                  </Text>
                </AlertDialogBody>
                
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={onClose}>
                    ביטול
                  </Button>
                  <Button colorScheme="red" onClick={handleDeleteProject} ml={3}>
                    מחק פרויקט
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
        </>
      )}
    </Box>
  );
}

function ActionButtons({ projectId }: { projectId: string }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingStages, setIsSyncingStages] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // מחיקת הפרויקט
      await projectService.deleteProject(projectId);
      
      toast({
        title: 'פרויקט נמחק',
        description: 'הפרויקט נמחק בהצלחה',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // ניווט בחזרה לרשימת הפרויקטים
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('שגיאה במחיקת פרויקט:', error);
      
      toast({
        title: 'שגיאה במחיקת פרויקט',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const handleSyncStages = async () => {
    try {
      setIsSyncingStages(true);
      
      // קריאה לפונקציית Edge לסנכרון השלבים
      const response = await fetch('/api/projects/sync-stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'אירעה שגיאה בסנכרון השלבים');
      }
      
      toast({
        title: 'שלבים סונכרנו בהצלחה',
        description: `סונכרנו ${result.project_stages_count} שלבים לפרויקט זה`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // רענון הדף כדי להציג את השלבים החדשים
      router.refresh();
    } catch (error) {
      console.error('שגיאה בסנכרון שלבים:', error);
      
      toast({
        title: 'שגיאה בסנכרון שלבים',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncingStages(false);
    }
  };

  return (
    <>
      <Button
        colorScheme="red"
        variant="outline"
        leftIcon={<FiTrash2 />}
        onClick={onOpen}
        size="sm"
      >
        מחק פרויקט
      </Button>
      
      <Button
        colorScheme="teal"
        leftIcon={<FiRefreshCw />}
        onClick={handleSyncStages}
        isLoading={isSyncingStages}
        loadingText="מסנכרן שלבים..."
        ml={2}
        size="sm"
      >
        סנכרן שלבים
      </Button>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>מחיקת פרויקט</AlertDialogHeader>
            <AlertDialogBody>
              האם אתה בטוח שברצונך למחוק את הפרויקט? פעולה זו אינה הפיכה.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                ביטול
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3} isLoading={isDeleting}>
                מחק
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}