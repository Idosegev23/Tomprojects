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
} from '@chakra-ui/react';
import { FiChevronRight, FiSave } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import taskService from '@/lib/services/taskService';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import { Project, Stage } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function NewTask() {
  const [task, setTask] = useState({
    title: '',
    description: '',
    project_id: '',
    stage_id: '',
    milestone_id: '',
    priority: 'medium',
    status: 'todo',
    due_date: formatDateForInput(addDays(new Date(), 7)),
    category: '',
  });
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [milestones, setMilestones] = useState<Stage[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthContext();
  
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
          // טעינת המילסטונים של הפרויקט הראשון
          fetchMilestones(projectsData[0].id);
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
    }
  };
  
  // פונקציה לטעינת מילסטונים של פרויקט
  const fetchMilestones = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const milestonesData = await stageService.getProjectStages(projectId);
      setMilestones(milestonesData);
      
      // בחירת מילסטון ברירת מחדל אם יש מילסטונים
      if (milestonesData.length > 0) {
        setTask(prev => ({ ...prev, milestone_id: milestonesData[0].id }));
      } else {
        setTask(prev => ({ ...prev, milestone_id: '' }));
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
    }
  };
  
  // עדכון שלבים ומילסטונים כאשר משתנה הפרויקט שנבחר
  useEffect(() => {
    if (task.project_id) {
      fetchStages(task.project_id);
      fetchMilestones(task.project_id);
    }
  }, [task.project_id]);
  
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
    
    if (!task.title.trim()) {
      newErrors.title = 'יש להזין כותרת למשימה';
    }
    
    if (!task.project_id) {
      newErrors.project_id = 'יש לבחור פרויקט';
    }
    
    if (!task.stage_id && stages.length > 0) {
      newErrors.stage_id = 'יש לבחור שלב בפרויקט';
    }
    
    if (!task.milestone_id && milestones.length > 0) {
      newErrors.milestone_id = 'יש לבחור שלב בפרויקט';
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
    
    setLoading(true);
    
    try {
      // עדכון שדה ה-stage_id לפי המילסטון שנבחר
      const taskToSubmit = {
        ...task,
        stage_id: task.milestone_id
      };
      
      const createdTask = await taskService.createTask(taskToSubmit);
      
      toast({
        title: 'המשימה נוצרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // ניווט לדף המשימה החדשה
      router.push(`/dashboard/tasks/${createdTask.id}`);
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
    <Container maxW="container.md" py={8}>
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
              value={task.description}
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
                isDisabled={projectsLoading || projects.length === 0}
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
            
            {/* מילסטון (שלב) */}
            <FormControl isRequired={milestones.length > 0} isInvalid={!!errors.milestone_id} flex={1}>
              <FormLabel>שלב בפרויקט</FormLabel>
              <Select
                name="milestone_id"
                value={task.milestone_id}
                onChange={handleChange}
                placeholder={milestones.length === 0 ? "אין שלבים זמינים" : "בחר שלב בפרויקט"}
                isDisabled={!task.project_id || milestones.length === 0}
              >
                {milestones.map(milestone => (
                  <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                ))}
              </Select>
              {errors.milestone_id && <FormErrorMessage>{errors.milestone_id}</FormErrorMessage>}
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
                <option value="done">הושלם</option>
              </Select>
            </FormControl>
          </HStack>
          
          {/* קטגוריה */}
          <FormControl>
            <FormLabel>קטגוריה</FormLabel>
            <Select
              name="category"
              value={task.category}
              onChange={handleChange}
            >
              <option value="">ללא קטגוריה</option>
              <option value="פיתוח">פיתוח</option>
              <option value="עיצוב">עיצוב</option>
              <option value="תוכן">תוכן</option>
              <option value="שיווק">שיווק</option>
              <option value="תשתיות">תשתיות</option>
              <option value="אחר">אחר</option>
            </Select>
          </FormControl>
          
          <HStack spacing={6} align="flex-start">
            {/* תאריך יעד */}
            <FormControl flex={1}>
              <FormLabel>תאריך יעד</FormLabel>
              <Input
                name="due_date"
                type="date"
                value={task.due_date}
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
              isLoading={loading}
              loadingText="שומר..."
            >
              שמור משימה
            </Button>
          </Flex>
        </VStack>
      </Box>
    </Container>
  );
} 