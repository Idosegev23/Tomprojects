'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Heading,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  Flex,
  Divider,
  Spinner,
  useToast,
  IconButton,
  Textarea,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { 
  FiEdit, 
  FiTrash2, 
  FiChevronRight, 
  FiCalendar, 
  FiClock,
  FiCheckSquare,
  FiAlertTriangle,
  FiMessageSquare,
  FiFlag,
  FiBookmark,
} from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Task, Project, Stage } from '@/types/supabase';

export default function TaskPage() {
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const taskId = params.id as string;
  
  // טעינת נתוני המשימה
  useEffect(() => {
    const fetchTaskData = async () => {
      if (!taskId) {
        setError('מזהה משימה לא תקין');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // טעינת המשימה
        const taskData = await taskService.getTaskById(taskId);
        
        if (!taskData) {
          setError('המשימה לא נמצאה');
          setLoading(false);
          return;
        }
        
        setTask(taskData);
        
        // בדיקה אם המשתמש הוא הבעלים של המשימה או הפרויקט
        if (user) {
          if (taskData.assignee_id === user.id) {
            setIsOwner(true);
          } else {
            // נטען את הפרויקט כדי לבדוק אם המשתמש הוא בעל הפרויקט
            const projectData = await projectService.getProjectById(taskData.project_id);
            if (projectData && projectData.owner_id === user.id) {
              setIsOwner(true);
            }
          }
        }
        
        // טעינת נתוני הפרויקט
        const projectData = await projectService.getProjectById(taskData.project_id);
        setProject(projectData);
        
        // טעינת נתוני השלב
        if (taskData.stage_id) {
          const stageData = await stageService.getStageById(taskData.stage_id);
          setStage(stageData);
        }
      } catch (err) {
        console.error('שגיאה בטעינת המשימה:', err);
        setError('אירעה שגיאה בטעינת המשימה');
        
        toast({
          title: 'שגיאה בטעינת המשימה',
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
  }, [taskId, user, toast]);
  
  // מחיקת משימה
  const handleDeleteTask = async () => {
    try {
      await taskService.deleteTask(taskId);
      
      toast({
        title: 'המשימה נמחקה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // חזרה לדף המשימות או לדף הפרויקט
      if (project) {
        router.push(`/dashboard/projects/${project.id}`);
      } else {
        router.push('/dashboard/tasks');
      }
    } catch (err) {
      console.error('שגיאה במחיקת המשימה:', err);
      
      toast({
        title: 'שגיאה במחיקת המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה במחיקת המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      onClose();
    }
  };
  
  // עדכון סטטוס המשימה
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      
      // עדכון המשימה המקומית
      setTask({ ...task, status: newStatus });
      
      toast({
        title: 'סטטוס המשימה עודכן',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err) {
      console.error('שגיאה בעדכון סטטוס המשימה:', err);
      
      toast({
        title: 'שגיאה בעדכון הסטטוס',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בעדכון סטטוס המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
  
  // הפונקציות העזר
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
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
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'הושלם': return 'green';
      case 'in progress':
      case 'בתהליך': return 'blue';
      case 'in review':
      case 'בבדיקה': return 'purple';
      case 'to do':
      case 'לביצוע': return 'gray';
      default: return 'gray';
    }
  };
  
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    try {
      const due = new Date(dueDate);
      const now = new Date();
      return due < now && (task?.status !== 'completed');
    } catch (e) {
      return false;
    }
  };
  
  // חזרה לדף הקודם
  const handleBack = () => {
    router.back();
  };
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="70vh">
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Flex>
    );
  }
  
  if (error || !task) {
    return (
      <Container maxW="container.md" py={10}>
        <Flex direction="column" alignItems="center" textAlign="center">
          <FiAlertTriangle size={48} color="red" />
          <Heading mt={4} size="lg">{error || 'המשימה לא נמצאה'}</Heading>
          <Text mt={2} color="gray.600">
            לא ניתן לטעון את פרטי המשימה המבוקשת.
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
    <Container maxW="container.md" py={8}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Button 
          variant="outline" 
          rightIcon={<FiChevronRight />} 
          onClick={handleBack}
        >
          חזרה
        </Button>
        
        {isOwner && (
          <HStack>
            <Button
              leftIcon={<FiEdit />}
              onClick={() => router.push(`/dashboard/tasks/${taskId}/edit`)}
              colorScheme="primary"
              variant="outline"
            >
              עריכה
            </Button>
            <Button
              leftIcon={<FiTrash2 />}
              onClick={onOpen}
              colorScheme="red"
              variant="outline"
            >
              מחיקה
            </Button>
          </HStack>
        )}
      </Flex>
      
      <Box mb={8}>
        <HStack spacing={2} mb={2}>
          <Badge colorScheme={getPriorityColor(task.priority)} fontSize="0.8em" px={2} py={1}>
            {task.priority}
          </Badge>
          <Badge colorScheme={getStatusColor(task.status)} fontSize="0.8em" px={2} py={1}>
            {task.status}
          </Badge>
          {isOverdue(task.due_date) && (
            <Badge colorScheme="red" fontSize="0.8em" px={2} py={1}>
              באיחור
            </Badge>
          )}
        </HStack>
        
        <Heading size="xl" mb={4}>
          {task.title}
        </Heading>
        
        {project && (
          <Text color="gray.600" fontSize="sm" mb={4}>
            <FiBookmark style={{ display: 'inline', marginLeft: '8px' }} />
            פרויקט: <Text as="span" fontWeight="medium" color="primary.600" cursor="pointer" onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
              {project.title}
            </Text>
            {stage && ` > ${stage.name}`}
          </Text>
        )}
        
        <Divider my={4} />
        
        <VStack align="stretch" spacing={6}>
          {/* תיאור המשימה */}
          <Box>
            <Text fontWeight="bold" mb={2}>תיאור:</Text>
            <Box 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              minH="100px"
              bg="gray.50"
            >
              {task.description ? (
                <Text whiteSpace="pre-wrap">{task.description}</Text>
              ) : (
                <Text color="gray.500" fontStyle="italic">אין תיאור למשימה זו</Text>
              )}
            </Box>
          </Box>
          
          {/* פרטי משימה */}
          <Box>
            <Text fontWeight="bold" mb={2}>פרטי משימה:</Text>
            <Box p={4} borderWidth="1px" borderRadius="md">
              <HStack spacing={6} flexWrap="wrap" gap={4}>
                <VStack align="start" minW="150px">
                  <Text color="gray.600" fontSize="sm">
                    <FiFlag style={{ display: 'inline', marginLeft: '5px' }} />
                    עדיפות:
                  </Text>
                  <Badge colorScheme={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </VStack>
                
                <VStack align="start" minW="150px">
                  <Text color="gray.600" fontSize="sm">
                    <FiCheckSquare style={{ display: 'inline', marginLeft: '5px' }} />
                    סטטוס:
                  </Text>
                  <HStack>
                    <Badge colorScheme={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    {isOwner && (
                      <Button size="xs" onClick={() => handleStatusChange(
                        task.status === 'completed' ? 'to do' : 'completed'
                      )}>
                        {task.status === 'completed' ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                      </Button>
                    )}
                  </HStack>
                </VStack>
                
                <VStack align="start" minW="150px">
                  <Text color="gray.600" fontSize="sm">
                    <FiCalendar style={{ display: 'inline', marginLeft: '5px' }} />
                    תאריך יעד:
                  </Text>
                  <Text 
                    fontWeight="medium"
                    color={isOverdue(task.due_date) ? "red.500" : "inherit"}
                  >
                    {formatDate(task.due_date)}
                    {isOverdue(task.due_date) && ' (באיחור)'}
                  </Text>
                </VStack>
                
                <VStack align="start" minW="150px">
                  <Text color="gray.600" fontSize="sm">
                    <FiClock style={{ display: 'inline', marginLeft: '5px' }} />
                    נוצר בתאריך:
                  </Text>
                  <Text fontWeight="medium">
                    {formatDate(task.created_at)}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </Box>
          
          {isOwner && (
            <Flex justifyContent="flex-end" mt={4}>
              <Button
                colorScheme="primary"
                onClick={() => router.push(`/dashboard/tasks/${taskId}/edit`)}
                leftIcon={<FiEdit />}
              >
                ערוך משימה
              </Button>
            </Flex>
          )}
        </VStack>
      </Box>
      
      {/* דיאלוג אישור מחיקה */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              מחיקת משימה
            </AlertDialogHeader>
            
            <AlertDialogBody>
              האם אתה בטוח שברצונך למחוק את המשימה "{task.title}"?
              <br />
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogBody>
            
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                ביטול
              </Button>
              <Button colorScheme="red" onClick={handleDeleteTask} mr={3}>
                מחק
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
} 