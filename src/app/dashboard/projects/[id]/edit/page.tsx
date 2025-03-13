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
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  Text,
  SimpleGrid,
  Icon,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiSave, FiArrowRight, FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import { Project, UpdateProject, Stage, UpdateStage } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

type ProjectEditPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectEditPage({ params }: ProjectEditPageProps) {
  const { id } = params;
  const [originalProject, setOriginalProject] = useState<Project | null>(null);
  const [project, setProject] = useState<Partial<UpdateProject>>({});
  const [stages, setStages] = useState<Stage[]>([]);
  const [newStageName, setNewStageName] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<{
    title?: string;
    status?: string;
  }>({});
  
  const { user } = useAuthContext();
  const router = useRouter();
  const toast = useToast();
  
  // טעינת פרטי הפרויקט
  useEffect(() => {
    // אם המזהה הוא "new", נפנה את המשתמש לדף יצירת פרויקט חדש
    if (id === 'new') {
      router.push('/dashboard/projects/new');
      return;
    }
    
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרטי הפרויקט
        const projectData = await projectService.getProjectById(id);
        if (!projectData) {
          setError('הפרויקט לא נמצא');
          return;
        }
        setOriginalProject(projectData);
        setProject({
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          planned_end_date: projectData.planned_end_date,
        });
        
        // טעינת השלבים של הפרויקט
        const stagesData = await stageService.getProjectStages(id);
        setStages(stagesData);
      } catch (err) {
        console.error('שגיאה בטעינת פרטי הפרויקט:', err);
        setError('אירעה שגיאה בטעינת פרטי הפרויקט');
        
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
    
    fetchProjectData();
  }, [id, toast]);
  
  // בדיקת הרשאות - רק הבעלים יכול לערוך
  useEffect(() => {
    if (originalProject && user && originalProject.owner !== user.email) {
      setError('אין לך הרשאות לערוך פרויקט זה');
      router.push(`/dashboard/projects/${id}`);
    }
  }, [originalProject, user, id, router]);
  
  const validateForm = () => {
    const newErrors: { title?: string; status?: string } = {};
    
    if (!project.name?.trim()) {
      newErrors.title = 'שם הפרויקט הוא שדה חובה';
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
      
      // עדכון תאריך העדכון
      const updatedProject: UpdateProject = {
        ...project,
        updated_at: new Date().toISOString(),
      };
      
      // שליחה לשרת
      await projectService.updateProject(id, updatedProject);
      
      toast({
        title: 'הפרויקט עודכן בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      
      // חזרה לדף הפרויקט
      router.push(`/dashboard/projects/${id}`);
    } catch (error) {
      console.error('שגיאה בעדכון פרויקט:', error);
      
      toast({
        title: 'שגיאה בעדכון הפרויקט',
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
  
  // הוספת שלב חדש
  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast({
        title: 'שם שלב ריק',
        description: 'יש להזין שם לשלב החדש',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      // קביעת סדר השלב החדש כאחרון
      const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order || 0)) + 1 : 1;
      
      // יצירת שלב חדש
      const newStage = await stageService.createStage({
        project_id: id,
        title: newStageName,
        order: maxOrder,
      });
      
      // עדכון הרשימה המקומית
      setStages([...stages, newStage]);
      
      // איפוס שדה הקלט
      setNewStageName('');
      
      toast({
        title: 'השלב נוצר בהצלחה',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה ביצירת שלב חדש:', error);
      
      toast({
        title: 'שגיאה ביצירת שלב',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // מחיקת שלב
  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק שלב זה? כל המשימות המשויכות אליו יועברו למצב ללא שלב.')) {
      return;
    }
    
    try {
      await stageService.deleteStage(stageId);
      
      // עדכון הרשימה המקומית
      setStages(stages.filter(stage => stage.id !== stageId));
      
      toast({
        title: 'השלב נמחק בהצלחה',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה במחיקת שלב:', error);
      
      toast({
        title: 'שגיאה במחיקת שלב',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // הוספת משימות ברירת מחדל לפרויקט
  const handleAddDefaultTasks = async () => {
    if (!confirm('האם אתה בטוח שברצונך להוסיף משימות ברירת מחדל לפרויקט? פעולה זו תיצור כ-15 משימות חדשות.')) {
      return;
    }
    
    try {
      // בדיקה אם יש שלבים
      if (stages.length === 0) {
        toast({
          title: 'אין שלבים בפרויקט',
          description: 'יש ליצור לפחות שלב אחד לפני הוספת משימות ברירת מחדל',
          status: 'warning',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
        return;
      }
      
      // שימוש בשלב הראשון כברירת מחדל
      const firstStageId = stages[0].id;
      
      // יצירת משימות ברירת מחדל
      const tasks = await taskService.createDefaultTasksForRealEstateProject(id, firstStageId);
      
      toast({
        title: 'משימות ברירת מחדל נוספו בהצלחה',
        description: `נוספו ${tasks.length} משימות חדשות לפרויקט`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה בהוספת משימות ברירת מחדל:', error);
      
      toast({
        title: 'שגיאה בהוספת משימות ברירת מחדל',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // העברת שלב למעלה או למטה
  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    // מציאת השלב והאינדקס הנוכחי שלו
    const currentIndex = stages.findIndex(stage => stage.id === stageId);
    if (currentIndex === -1) return;
    
    // אם מנסים להזיז את הראשון למעלה או את האחרון למטה - צא
    if ((direction === 'up' && currentIndex === 0) || 
        (direction === 'down' && currentIndex === stages.length - 1)) {
      return;
    }
    
    // חישוב האינדקס החדש
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // יצירת עותק של מערך השלבים
    const updatedStages = [...stages];
    
    // החלפת השלבים
    const temp = updatedStages[currentIndex];
    updatedStages[currentIndex] = updatedStages[newIndex];
    updatedStages[newIndex] = temp;
    
    // עדכון סדר השלבים
    const stagesWithNewOrder = updatedStages.map((stage, index) => ({
      ...stage,
      order: index + 1,
    }));
    
    try {
      // שמירת העדכון בשרת
      await stageService.reorderStages(
        stagesWithNewOrder.map(stage => ({ id: stage.id, order: stage.order }))
      );
      
      // עדכון המצב המקומי
      setStages(stagesWithNewOrder);
      
      toast({
        title: 'סדר השלבים עודכן',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה בעדכון סדר השלבים:', error);
      
      toast({
        title: 'שגיאה בעדכון הסדר',
        description: error instanceof Error ? error.message : 'אירעה שגיאה בלתי צפויה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" thickness="4px" color="primary.500" />
      </Flex>
    );
  }
  
  if (error || !originalProject) {
    return (
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        height="60vh"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          {error || 'הפרויקט לא נמצא'}
        </AlertTitle>
        <AlertDescription maxWidth="sm" mb={4}>
          לא ניתן לערוך את הפרויקט המבוקש.
        </AlertDescription>
        <Button onClick={() => router.push('/dashboard/projects')}>
          חזרה לרשימת הפרויקטים
        </Button>
      </Alert>
    );
  }
  
  return (
    <Container maxW="container.lg" py={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">עריכת פרויקט</Heading>
        <Button 
          variant="outline" 
          rightIcon={<FiArrowRight />} 
          onClick={() => router.push(`/dashboard/projects/${id}`)}
        >
          חזרה לפרויקט
        </Button>
      </Flex>
      
      <Divider mb={8} />
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <Box>
          <VStack as="form" spacing={6} align="stretch" onSubmit={handleSubmit}>
            <Heading size="md" mb={2}>פרטי הפרויקט</Heading>
            
            <FormControl isInvalid={!!errors.title}>
              <FormLabel htmlFor="name">שם הפרויקט</FormLabel>
              <Input
                id="name"
                name="name"
                value={project.name || ''}
                onChange={handleChange}
                placeholder="הזן שם פרויקט"
              />
              <FormErrorMessage>{errors.title}</FormErrorMessage>
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
                value={project.status || ''}
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
              <FormLabel htmlFor="planned_end_date">תאריך יעד</FormLabel>
              <Input
                id="planned_end_date"
                name="planned_end_date"
                type="date"
                value={project.planned_end_date || ''}
                onChange={handleChange}
              />
            </FormControl>
            
            <Flex justifyContent="space-between" mt={6}>
              <Button
                leftIcon={<FiSave />}
                colorScheme="blue"
                isLoading={isSubmitting}
                type="submit"
              >
                שמור שינויים
              </Button>
              
              <Button
                rightIcon={<FiPlus />}
                colorScheme="teal"
                onClick={handleAddDefaultTasks}
                isDisabled={stages.length === 0}
              >
                הוסף משימות ברירת מחדל
              </Button>
            </Flex>
          </VStack>
        </Box>
        
        <Box>
          <Card>
            <CardHeader>
              <Heading size="md">שלבי הפרויקט</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                {stages.length === 0 ? (
                  <Text color="gray.500" textAlign="center">
                    אין שלבים בפרויקט זה
                  </Text>
                ) : (
                  stages
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(stage => (
                      <Flex
                        key={stage.id}
                        border="1px"
                        borderColor="gray.200"
                        borderRadius="md"
                        p={3}
                        justify="space-between"
                        align="center"
                      >
                        <Text fontWeight="medium">{stage.title}</Text>
                        <HStack>
                          <IconButton
                            aria-label="העלה שלב"
                            icon={<FiArrowUp />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStage(stage.id, 'up')}
                            isDisabled={stage.order === 1}
                          />
                          <IconButton
                            aria-label="הורד שלב"
                            icon={<FiArrowDown />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStage(stage.id, 'down')}
                            isDisabled={stage.order === stages.length}
                          />
                          <IconButton
                            aria-label="מחק שלב"
                            icon={<FiTrash2 />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleDeleteStage(stage.id)}
                          />
                        </HStack>
                      </Flex>
                    ))
                )}
                
                <Divider />
                
                <FormControl>
                  <FormLabel>הוסף שלב חדש</FormLabel>
                  <Flex>
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="שם השלב החדש"
                      mr={2}
                    />
                    <Button
                      leftIcon={<FiPlus />}
                      onClick={handleAddStage}
                      colorScheme="green"
                      flexShrink={0}
                    >
                      הוסף
                    </Button>
                  </Flex>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        </Box>
      </SimpleGrid>
    </Container>
  );
} 