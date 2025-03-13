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
} from '@chakra-ui/react';
import { FiChevronRight, FiSave, FiAlertTriangle } from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import { Task, Project, Stage } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function EditTask() {
  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const [task, setTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    project_id: '',
    stage_id: '',
    priority: '',
    status: '',
    due_date: '',
  });
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStages, setLoadingStages] = useState<boolean>(false);
  
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  
  const taskId = params.id as string;
  
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
        const taskData = await taskService.getTaskById(taskId);
        
        if (!taskData) {
          setLoadError('המשימה לא נמצאה');
          setLoading(false);
          return;
        }
        
        setOriginalTask(taskData);
        
        // עדכון ערכי הטופס
        setTask({
          title: taskData.title,
          description: taskData.description || '',
          project_id: taskData.project_id,
          stage_id: taskData.stage_id || '',
          priority: taskData.priority,
          status: taskData.status,
          due_date: formatDateForInput(taskData.due_date),
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
  }, [taskId, user, toast]);
  
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
  
  // עדכון שלבים כאשר משתנה הפרויקט שנבחר
  useEffect(() => {
    if (task.project_id && task.project_id !== originalTask?.project_id) {
      fetchStages(task.project_id);
    }
  }, [task.project_id, originalTask]);
  
  // טיפול בשינויים בטופס
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTask(prev => ({ ...prev, [name]: value }));
    
    // ניקוי שגיאות כאשר המשתמש מתקן את הקלט
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // שליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaveLoading(true);
    
    try {
      await taskService.updateTask(taskId, task);
      
      toast({
        title: 'המשימה עודכנה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // ניווט לדף המשימה
      router.push(`/dashboard/tasks/${taskId}`);
    } catch (err) {
      console.error('שגיאה בעדכון המשימה:', err);
      
      toast({
        title: 'שגיאה בעדכון המשימה',
        description: err instanceof Error ? err.message : 'אירעה שגיאה בעדכון המשימה',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      
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
    <Container maxW="container.md" py={8}>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading size="lg">עריכת משימה</Heading>
          <Button 
            variant="outline" 
            rightIcon={<FiChevronRight />} 
            onClick={handleBack}
          >
            חזרה
          </Button>
        </Flex>
        
        <Divider mb={6} />
        
        <VStack spacing={6} align="stretch">
          {/* כותרת המשימה */}
          <FormControl isRequired isInvalid={!!errors.title}>
            <FormLabel>כותרת המשימה</FormLabel>
            <Input
              name="title"
              value={task.title}
              onChange={handleChange}
              placeholder="הזן כותרת למשימה"
            />
            {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
          </FormControl>
          
          {/* תיאור המשימה */}
          <FormControl>
            <FormLabel>תיאור</FormLabel>
            <Textarea
              name="description"
              value={task.description || ''}
              onChange={handleChange}
              placeholder="תיאור מפורט של המשימה..."
              minH="120px"
            />
          </FormControl>
          
          <HStack spacing={6} align="flex-start">
            {/* פרויקט */}
            <FormControl isRequired isInvalid={!!errors.project_id} flex={1}>
              <FormLabel>פרויקט</FormLabel>
              <Select
                name="project_id"
                value={task.project_id}
                onChange={handleChange}
                placeholder="בחר פרויקט"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </Select>
              {errors.project_id && <FormErrorMessage>{errors.project_id}</FormErrorMessage>}
            </FormControl>
            
            {/* שלב בפרויקט */}
            <FormControl isRequired={stages.length > 0} isInvalid={!!errors.stage_id} flex={1}>
              <FormLabel>שלב</FormLabel>
              <Select
                name="stage_id"
                value={task.stage_id || ''}
                onChange={handleChange}
                placeholder={stages.length === 0 ? "אין שלבים זמינים" : "בחר שלב"}
                isDisabled={!task.project_id || stages.length === 0}
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.title}</option>
                ))}
              </Select>
              {errors.stage_id && <FormErrorMessage>{errors.stage_id}</FormErrorMessage>}
            </FormControl>
          </HStack>
          
          <HStack spacing={6} align="flex-start">
            {/* עדיפות */}
            <FormControl flex={1}>
              <FormLabel>עדיפות</FormLabel>
              <Select
                name="priority"
                value={task.priority}
                onChange={handleChange}
              >
                <option value="low">נמוכה</option>
                <option value="medium">בינונית</option>
                <option value="high">גבוהה</option>
              </Select>
            </FormControl>
            
            {/* סטטוס */}
            <FormControl flex={1}>
              <FormLabel>סטטוס</FormLabel>
              <Select
                name="status"
                value={task.status}
                onChange={handleChange}
              >
                <option value="todo">לביצוע</option>
                <option value="in_progress">בתהליך</option>
                <option value="review">בבדיקה</option>
                <option value="done">הושלם</option>
              </Select>
            </FormControl>
            
            {/* תאריך יעד */}
            <FormControl flex={1}>
              <FormLabel>תאריך יעד</FormLabel>
              <Input
                name="due_date"
                type="date"
                value={task.due_date || ''}
                onChange={handleChange}
              />
            </FormControl>
          </HStack>
          
          <Divider mt={6} />
          
          <Flex justifyContent="flex-end" mt={2}>
            <Button 
              colorScheme="primary" 
              size="lg" 
              type="submit" 
              leftIcon={<FiSave />}
              isLoading={saveLoading}
              loadingText="שומר..."
            >
              שמור שינויים
            </Button>
          </Flex>
        </VStack>
      </Box>
    </Container>
  );
} 