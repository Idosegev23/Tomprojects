'use client';

import React, { useState, useEffect } from 'react';
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
  IconButton,
  useToast,
  HStack,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  
  // טעינת נתוני הפרויקט
  useEffect(() => {
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
        
        // טעינת המשימות של הפרויקט
        const tasksData = await taskService.getTasks({ projectId: id });
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
  }, [id, toast]);
  
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
  
  // קבלת צבע לפי עדיפות
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה': return 'red';
      case 'medium':
      case 'בינונית': return 'orange';
      case 'low': 
      case 'נמוכה': return 'green';
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
      // וידוא שהסטטוס תקין
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
      if (!validStatuses.includes(status)) {
        throw new Error(`סטטוס לא תקין: ${status}. הסטטוסים התקינים הם: ${validStatuses.join(', ')}`);
      }
      
      // עדכון הסטטוס בשרת
      const updatedTask = await taskService.updateTaskStatus(taskId, status);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      
      // עדכון התקדמות הפרויקט
      const updatedProgress = await projectService.calculateProjectProgress(id);
      setProgress(updatedProgress);
      
      toast({
        title: 'סטטוס המשימה עודכן',
        description: `המשימה עודכנה לסטטוס: ${status}`,
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
  
  return (
    <Box>
      {/* כותרת הפרויקט ומידע בסיסי */}
      {project && (
        <Box mb={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <HStack>
              <IconButton
                aria-label="חזור לרשימת הפרויקטים"
                icon={<FiArrowLeft />}
                onClick={() => router.push('/dashboard/projects')}
                variant="ghost"
              />
              <Heading size="lg">{project.name}</Heading>
              <Badge colorScheme={getStatusColor(project.status)} fontSize="md" px={2} py={1}>
                {project.status}
              </Badge>
            </HStack>
            <HStack>
              <Button
                leftIcon={<FiEdit />}
                size="sm"
                onClick={() => router.push(`/dashboard/projects/${id}/edit`)}
              >
                ערוך פרויקט
              </Button>
              <Button
                leftIcon={<FiTrash2 />}
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={handleDeleteProject}
              >
                מחק פרויקט
              </Button>
            </HStack>
          </Flex>
          
          <Text mb={2}>{project.name}</Text>
          
          <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={4}>
            <GridItem>
              <Card>
                <CardBody>
                  <Text fontWeight="bold" mb={1}>תאריך התחלה</Text>
                  <Text>{formatDate(project.planned_start_date)}</Text>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Text fontWeight="bold" mb={1}>תאריך סיום</Text>
                  <Text>{formatDate(project.planned_end_date)}</Text>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Text fontWeight="bold" mb={1}>התקדמות</Text>
                  <Progress value={progress} colorScheme="green" size="sm" mb={1} />
                  <Text textAlign="center">{progress}%</Text>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card>
                <CardBody>
                  <Text fontWeight="bold" mb={1}>משימות</Text>
                  <Text>{tasks.length}</Text>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </Box>
      )}
      
      {/* טאבים לתצוגות שונות */}
      <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" mb={4}>
        <TabList>
          <Tab><HStack><FiList /><Text>רשימה</Text></HStack></Tab>
          <Tab><HStack><FiColumns /><Text>קנבן</Text></HStack></Tab>
          <Tab><HStack><FiCalendar /><Text>גאנט</Text></HStack></Tab>
          <Tab><HStack><FiUsers /><Text>עץ</Text></HStack></Tab>
        </TabList>
        
        <TabPanels>
          {/* תצוגת רשימה */}
          <TabPanel>
            <Box>
              <Heading size="md" mb={4}>רשימת משימות</Heading>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                mb={4}
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }}
              >
                משימה חדשה
              </Button>
              {tasks.length > 0 ? (
                <TaskList 
                  projectId={id}
                  onTaskCreated={handleTaskCreated}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleDeleteTask}
                />
              ) : (
                <Text>אין משימות בפרויקט זה</Text>
              )}
            </Box>
          </TabPanel>
          
          {/* תצוגת קנבן */}
          <TabPanel>
            <TaskKanban 
              tasks={tasks} 
              stages={stages}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onStageChange={handleStageChange}
            />
          </TabPanel>
          
          {/* תצוגת גאנט */}
          <TabPanel>
            <TaskGantt 
              tasks={tasks} 
              onTaskDrop={handleTaskDrop}
            />
          </TabPanel>
          
          {/* תצוגת עץ */}
          <TabPanel>
            {tasks.length > 0 ? (
              <TaskTree 
                tasks={tasks} 
                projectId={id}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <Text>אין משימות בפרויקט זה</Text>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      
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
      
      {/* מודל שיוך משימות */}
      {isAssignTasksModalOpen && (
        <AssignTasksModal
          isOpen={isAssignTasksModalOpen}
          onClose={() => setIsAssignTasksModalOpen(false)}
          projectId={id}
          onTasksAssigned={(tasks) => {
            setTasks(prev => [...prev, ...tasks]);
            toast({
              title: 'משימות שויכו בהצלחה',
              status: 'success',
              duration: 3000,
              isClosable: true,
              position: 'top-right',
            });
          }}
        />
      )}
    </Box>
  );
}