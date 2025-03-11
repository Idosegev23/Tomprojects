'use client';

import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiSave, FiArrowRight } from 'react-icons/fi';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import type { NewProject } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function NewProject() {
  const [project, setProject] = useState<{
    name: string;
    description?: string;
    status: string;
    due_date?: string;
  }>({
    name: '',
    description: '',
    status: 'active', // סטטוס ברירת מחדל
    due_date: '',
  });
  
  const [errors, setErrors] = useState<{
    name?: string;
    status?: string;
  }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useDefaultTasks, setUseDefaultTasks] = useState(true);
  
  const { user } = useAuthContext();
  const router = useRouter();
  const toast = useToast();
  
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // הוספת מזהה בעלים ותאריכים
      const newProject: NewProject = {
        name: project.name,
        owner: user?.email || null,
        status: project.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // אם יש תיאור, נוסיף אותו
      if (project.description) {
        // @ts-ignore - אנחנו יודעים שזה שדה תקין
        newProject.description = project.description;
      }
      
      // אם יש תאריך יעד, נוסיף אותו
      if (project.due_date) {
        newProject.planned_end_date = project.due_date;
      }
      
      // שליחה לשרת
      const createdProject = await projectService.createProject(newProject);
      
      // יצירת שלבים ברירת מחדל לפרויקט
      const stages = await stageService.createDefaultStages(createdProject.id);
      
      // אם המשתמש בחר להשתמש במשימות ברירת מחדל, ניצור אותן
      if (useDefaultTasks && stages.length > 0) {
        try {
          // יצירת משימות ברירת מחדל לפרויקט נדל"ן
          await taskService.createDefaultTasksForRealEstateProject(createdProject.id, stages[0].id);
          
          toast({
            title: 'משימות ברירת מחדל נוצרו בהצלחה',
            status: 'success',
            duration: 3000,
            isClosable: true,
            position: 'top-right',
          });
        } catch (taskError) {
          console.error('שגיאה ביצירת משימות ברירת מחדל:', taskError);
          
          toast({
            title: 'שגיאה ביצירת משימות ברירת מחדל',
            description: taskError instanceof Error ? taskError.message : 'אירעה שגיאה בלתי צפויה',
            status: 'warning',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
          });
        }
      }
      
      toast({
        title: 'הפרויקט נוצר בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // ניווט לדף הפרויקט החדש
      router.push(`/dashboard/projects/${createdProject.id}`);
    } catch (error) {
      console.error('שגיאה ביצירת פרויקט:', error);
      
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
  
  return (
    <Container maxW="container.md" py={6}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg">פרויקט חדש</Heading>
        </Box>
        
        <Divider />
        
        <Box as="form" onSubmit={handleSubmit}>
          <VStack spacing={6} align="stretch">
            <FormControl isInvalid={!!errors.name}>
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
              <FormLabel htmlFor="description">תיאור</FormLabel>
              <Textarea
                id="description"
                name="description"
                value={project.description || ''}
                onChange={handleChange}
                placeholder="הזן תיאור פרויקט (לא חובה)"
                minH="120px"
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
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="use-default-tasks" mb="0">
                צור משימות ברירת מחדל לפרויקט נדל"ן
              </FormLabel>
              <Switch
                id="use-default-tasks"
                isChecked={useDefaultTasks}
                onChange={(e) => setUseDefaultTasks(e.target.checked)}
                colorScheme="primary"
              />
            </FormControl>
            
            {useDefaultTasks && (
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600">
                  הפרויקט ייווצר עם משימות ברירת מחדל לפרויקט נדל"ן, כולל:
                </Text>
                <Text fontSize="sm" mt={2}>
                  • איתור ורכישת קרקע
                </Text>
                <Text fontSize="sm">
                  • תכנון ואישורים
                </Text>
                <Text fontSize="sm">
                  • ביצוע
                </Text>
                <Text fontSize="sm">
                  • שיווק ומכירות
                </Text>
                <Text fontSize="sm">
                  • מסירה ואכלוס
                </Text>
              </Box>
            )}
            
            <Flex justify="space-between" mt={4}>
              <Button
                onClick={() => router.back()}
                rightIcon={<FiArrowRight />}
                variant="outline"
              >
                חזרה
              </Button>
              
              <Button
                type="submit"
                leftIcon={<FiSave />}
                colorScheme="primary"
                isLoading={isSubmitting}
              >
                שמור פרויקט
              </Button>
            </Flex>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
} 