'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Flex,
  Text,
  Spinner,
  Button,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Icon,
  Heading,
  useBreakpointValue
} from '@chakra-ui/react';
import { FiAlertCircle } from 'react-icons/fi';

import projectService from '@/lib/services/projectService';
import taskService from '@/lib/services/taskService';
import stageService from '@/lib/services/stageService';
import { Project, Task as SupabaseTask } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import AssignTasksModal from '@/components/tasks/AssignTasksModal';
import { Task as KanbanTask } from '@/components/tasks/kanban/types';

// קומפוננטות מקומיות
import ProjectHeader from './components/ProjectHeader';
import ProjectDetails from './components/ProjectDetails';
import ProjectTabs from './components/ProjectTabs';

type ProjectPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAssignTasksModalOpen, setIsAssignTasksModalOpen] = useState(false);
  
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  // טעינת נתוני הפרויקט
  useEffect(() => {
    // אם המזהה הוא "new", נפנה את המשתמש לדף יצירת פרויקט חדש
    if (id === 'new') {
      router.push('/dashboard/projects/new');
      return;
    }
    
    loadProjectData();
  }, [id]);
  
  // פונקציית טעינת נתוני הפרויקט
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
      
      // המרת נתוני המשימות לטיפוס המורחב
      const foundStage = (taskStageId: string | null) => stagesData.find(stage => stage.id === taskStageId);
      
      const enhancedTasks = tasksData.map(task => {
        const stage = foundStage(task.stage_id);
        return {
          ...task,
          stageName: stage?.title || 'ללא שלב',
          stageColor: 'gray',
          assignees: task.assignees || null,
        };
      });
      
      setTasks(enhancedTasks as KanbanTask[]);
      
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
  
  // מחיקת פרויקט
  const handleDeleteProject = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
      onClose();
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
  const getStatusColor = (status: string | null) => {
    if (!status) return 'gray';
    
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
  
  // טיפול במשימות
  const handleTaskCreated = (newTask: KanbanTask) => {
    setTasks(prev => [...prev, newTask]);
    toast({
      title: 'המשימה נוצרה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const handleTaskUpdated = (updatedTask: KanbanTask) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task
    ));
    toast({
      title: "משימה עודכנה",
      status: "success",
      duration: 2000,
      isClosable: true
    });
  };
  
  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast({
      title: 'המשימה נמחקה בהצלחה',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const handleEditTask = (task: KanbanTask) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };
  
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        console.log(`מנסה למחוק משימה ${taskId} מפרויקט ${id}`);
        const result = await taskService.deleteTask(taskId, id);
        setTasks(tasks.filter(task => task.id !== taskId));
        // אם יש משימות משנה, נציג הודעה מתאימה
        if (result.deletedSubtasks.length > 0) {
          toast({
            title: 'המשימה נמחקה בהצלחה',
            description: `נמחקו גם ${result.deletedSubtasks.length} תתי-משימות`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'המשימה נמחקה בהצלחה',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
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
  
  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      // המרת הסטטוס לאותיות קטנות
      let normalizedStatus = status.toLowerCase();
      
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
      
      console.log(`[handleStatusChange] מעדכן סטטוס משימה ${taskId} ל-${normalizedStatus}`);
      
      // עדכון הסטטוס בשרת
      const updatedTask = await taskService.updateTaskStatus(taskId, normalizedStatus);
      
      // סנכרון טבלת הפרויקט עם הטבלה הראשית
      await taskService.syncProjectTasks(id);
      
      // עדכון המשימה ברשימה המקומית
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task));
      
      // עדכון התקדמות הפרויקט
      const updatedProgress = await projectService.calculateProjectProgress(id);
      setProgress(updatedProgress);
      
      toast({
        title: 'סטטוס המשימה עודכן',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס המשימה:', error);
      
      toast({
        title: 'שגיאה בעדכון סטטוס המשימה',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בעדכון סטטוס המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
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
  
  // הבטחה שהמשימות תואמות את הטיפוס המצופה
  const tasksWithCorrectType = tasks as unknown as SupabaseTask[];
  
  // פונקציה לטיפול בסידור מחדש של משימות
  const handleReorderTasks = async (parentTaskId: string | null, taskIds: string[]) => {
    try {
      // קריאה ל-service לסידור מחדש של המשימות
      await taskService.reorderTasks(id, parentTaskId, taskIds);
      
      // רענון המשימות מהשרת
      const tasksData = await taskService.getProjectSpecificTasks(id);
      
      // המרת נתוני המשימות לטיפוס המורחב
      const foundStage = (taskStageId: string | null) => stages.find(stage => stage.id === taskStageId);
      
      const enhancedTasks = tasksData.map(task => {
        const stage = foundStage(task.stage_id);
        return {
          ...task,
          stageName: stage?.title || 'ללא שלב',
          stageColor: 'gray',
          assignees: task.assignees || null,
        };
      });
      
      setTasks(enhancedTasks as KanbanTask[]);
      
      toast({
        title: 'סדר המשימות עודכן בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('שגיאה בסידור מחדש של המשימות:', error);
      
      toast({
        title: 'שגיאה בסידור מחדש של המשימות',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בסידור המשימות',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
          <Box mb={6}>
            {/* כותרת הפרויקט ומידע בסיסי */}
            <ProjectHeader 
              project={project} 
              onOpenDeleteDialog={onOpen} 
              getStatusColor={getStatusColor} 
            />
            
            {/* פרטי הפרויקט */}
            <ProjectDetails 
              project={project} 
              tasks={tasksWithCorrectType} 
              progress={progress} 
              formatDate={formatDate} 
            />
          </Box>
          
          {/* טאבים לתצוגות שונות */}
          <ProjectTabs
            tabIndex={tabIndex}
            setTabIndex={setTabIndex}
            projectId={id}
            tasks={tasks}
            stages={stages}
            projectName={project.name}
            loading={loading}
            onCreateTask={handleCreateTask}
            onTaskCreated={handleTaskCreated}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleDeleteTask}
            onTaskEdited={handleEditTask}
            onTaskStatusChanged={handleStatusChange}
            onTaskDrop={handleTaskDrop}
            onReorderTasks={handleReorderTasks}
          />

          {/* מודל עריכת משימה */}
          <TaskEditModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            task={selectedTask as any}
            projectId={id}
            onTaskCreated={handleTaskCreated as any}
            onTaskUpdated={handleTaskUpdated as any}
          />
          
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