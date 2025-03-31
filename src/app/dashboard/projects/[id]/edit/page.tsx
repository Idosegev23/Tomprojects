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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiSave, FiArrowRight, FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiEdit } from 'react-icons/fi';
import projectService from '@/lib/services/projectService';
import stageService from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import entrepreneurService from '@/lib/services/entrepreneurService';
import { Project, UpdateProject, Stage, UpdateStage, Entrepreneur } from '@/types/supabase';
import { useAuthContext } from '@/components/auth/AuthProvider';

type ProjectEditPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectEditPage({ params }: ProjectEditPageProps) {
  const { id } = params;
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuthContext();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; status?: string }>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [newStageName, setNewStageName] = useState('');
  
  // מודלים נפרדים
  const { isOpen: isEntrepreneurModalOpen, onOpen: openEntrepreneurModal, onClose: closeEntrepreneurModal } = useDisclosure();
  const { isOpen: isDeleteStageModalOpen, onOpen: openDeleteStageModal, onClose: closeDeleteStageModal } = useDisclosure();
  const { isOpen: isEditStageModalOpen, onOpen: openEditStageModal, onClose: closeEditStageModal } = useDisclosure();
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [stageToEdit, setStageToEdit] = useState<Stage | null>(null);
  const [editedStageName, setEditedStageName] = useState('');
  const [loadingEntrepreneurs, setLoadingEntrepreneurs] = useState(false);
  const [newEntrepreneurName, setNewEntrepreneurName] = useState('');

  // טעינת נתונים
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // טעינת פרטי הפרויקט
        const projectData = await projectService.getProjectById(id);
        if (!projectData) {
          toast({
            title: 'שגיאה',
            description: 'הפרויקט לא נמצא',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          router.push('/dashboard/projects');
          return;
        }
        setProject(projectData);
        
        // טעינת השלבים של הפרויקט
        const stagesData = await stageService.getProjectStages(id);
        setStages(stagesData);
        
        // טעינת יזמים
        const entrepreneursData = await entrepreneurService.getEntrepreneurs();
        setEntrepreneurs(entrepreneursData);
      } catch (error) {
        console.error('שגיאה בטעינת נתונים:', error);
        toast({
          title: 'שגיאה בטעינת נתונים',
          description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router, toast]);
  
  // בדיקת הרשאות - רק הבעלים יכול לערוך
  useEffect(() => {
    if (project && user && project.owner !== user.email) {
      setError('אין לך הרשאות לערוך פרויקט זה');
      router.push(`/dashboard/projects/${id}`);
    }
  }, [project, user, id, router]);
  
  const validateForm = () => {
    const newErrors: { title?: string; status?: string } = {};
    
    if (!project?.name?.trim()) {
      newErrors.title = 'שם הפרויקט הוא שדה חובה';
    }
    
    if (!project?.status) {
      newErrors.status = 'יש לבחור סטטוס';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !project) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // הכנת אובייקט העדכון עם כל השדות הנדרשים
      const updateData: UpdateProject = {
        name: project.name,
        description: project.description,
        status: project.status,
        updated_at: new Date().toISOString(),
        entrepreneur_id: project.entrepreneur_id,
        priority: project.priority || 'medium',
        progress: project.progress,
        total_budget: project.total_budget,
        responsible: project.responsible,
        department: project.department,
      };
      
      // הוספת תאריכים אם קיימים
      if (project.planned_start_date) {
        updateData.planned_start_date = project.planned_start_date;
      }
      
      if (project.planned_end_date) {
        updateData.planned_end_date = project.planned_end_date;
      }
      
      if (project.actual_start_date) {
        updateData.actual_start_date = project.actual_start_date;
      }
      
      if (project.actual_end_date) {
        updateData.actual_end_date = project.actual_end_date;
      }
      
      // שליחה לשרת
      await projectService.updateProject(id, updateData);
      
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
      // יצירת שלב חדש - ללא שדה order
      const newStage = await stageService.createStage(id, {
        project_id: id,
        title: newStageName,
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
    try {
      await stageService.deleteStage(stageId, id);
      // עדכון הרשימה המקומית של השלבים
      setStages(stages.filter(s => s.id !== stageId));
      toast({
        title: 'השלב נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('שגיאה במחיקת שלב:', error);
      toast({
        title: 'שגיאה במחיקת שלב',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // פתיחת מודל עריכת שלב
  const handleOpenEditStageModal = (stage: Stage) => {
    setStageToEdit(stage);
    setEditedStageName(stage.title);
    openEditStageModal();
  };
  
  // עריכת שלב
  const handleUpdateStage = async () => {
    if (!stageToEdit) return;
    if (!editedStageName.trim()) {
      toast({
        title: 'שם שלב ריק',
        description: 'יש להזין שם לשלב',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      const updatedStage = await stageService.updateStage(stageToEdit.id, {
        title: editedStageName,
        updated_at: new Date().toISOString()
      }, id);
      
      // עדכון הרשימה המקומית
      setStages(stages.map(s => s.id === updatedStage.id ? updatedStage : s));
      
      // סגירת המודל
      closeEditStageModal();
      
      toast({
        title: 'השלב עודכן בהצלחה',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (error) {
      console.error('שגיאה בעדכון שלב:', error);
      
      toast({
        title: 'שגיאה בעדכון שלב',
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
    
    try {
      // עדכון המצב המקומי בלבד, כיוון שאין שדה order בסכמה
      setStages(updatedStages);
      
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
  
  // הוספת יזם חדש
  const handleAddNewEntrepreneur = async () => {
    if (!newEntrepreneurName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'שם היזם לא יכול להיות ריק',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const newEntrepreneur = await entrepreneurService.createEntrepreneur({
        name: newEntrepreneurName.trim()
      });
      
      setEntrepreneurs([...entrepreneurs, newEntrepreneur]);
      
      if (project) {
        setProject({
          ...project,
          entrepreneur_id: newEntrepreneur.id
        });
      }
      
      toast({
        title: 'יזם נוסף בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setNewEntrepreneurName('');
      closeEntrepreneurModal();
    } catch (error) {
      console.error('שגיאה בהוספת יזם:', error);
      toast({
        title: 'שגיאה בהוספת יזם',
        description: 'אירעה שגיאה בהוספת היזם החדש',
        status: 'error',
        duration: 3000,
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
  
  if (error || !project) {
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
              <FormLabel htmlFor="entrepreneur_id">יזם</FormLabel>
              <Flex>
                <Select
                  id="entrepreneur_id"
                  name="entrepreneur_id"
                  value={project?.entrepreneur_id || ''}
                  onChange={(e) => {
                    handleChange(e);
                    // הסרת פוקוס מהתפריט אחרי בחירה
                    (e.target as HTMLSelectElement).blur();
                  }}
                  placeholder="בחר יזם"
                  mr={2}
                >
                  {entrepreneurs.map((entrepreneur) => (
                    <option key={entrepreneur.id} value={entrepreneur.id}>
                      {entrepreneur.name}
                    </option>
                  ))}
                </Select>
                <Button
                  leftIcon={<FiPlus />}
                  onClick={openEntrepreneurModal}
                  isLoading={loadingEntrepreneurs}
                >
                  הוסף יזם חדש
                </Button>
              </Flex>
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
                onChange={(e) => {
                  handleChange(e);
                  // הסרת פוקוס מהתפריט אחרי בחירה
                  (e.target as HTMLSelectElement).blur();
                }}
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
                  stages.map((stage, index) => (
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
                            aria-label="ערוך שלב"
                            icon={<FiEdit />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditStageModal(stage)}
                          />
                          <IconButton
                            aria-label="העלה שלב"
                            icon={<FiArrowUp />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStage(stage.id, 'up')}
                            isDisabled={index === 0}
                          />
                          <IconButton
                            aria-label="הורד שלב"
                            icon={<FiArrowDown />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveStage(stage.id, 'down')}
                            isDisabled={index === stages.length - 1}
                          />
                          <IconButton
                            aria-label="מחק שלב"
                            icon={<FiTrash2 />}
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => {
                              setStageToDelete(stage.id);
                              openDeleteStageModal();
                            }}
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
      
      {/* מודל להוספת יזם חדש */}
      <Modal isOpen={isEntrepreneurModalOpen} onClose={closeEntrepreneurModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>הוסף יזם חדש</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>שם היזם</FormLabel>
              <Input
                value={newEntrepreneurName}
                onChange={(e) => setNewEntrepreneurName(e.target.value)}
                placeholder="הכנס שם יזם"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleAddNewEntrepreneur}
              isLoading={loadingEntrepreneurs}
            >
              הוסף
            </Button>
            <Button variant="ghost" onClick={closeEntrepreneurModal}>
              ביטול
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* מודל למחיקת שלב */}
      <Modal isOpen={isDeleteStageModalOpen} onClose={closeDeleteStageModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>מחיקת שלב</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>האם אתה בטוח שברצונך למחוק שלב זה? כל המשימות המשויכות אליו יועברו למצב ללא שלב.</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={() => {
                if (stageToDelete) {
                  handleDeleteStage(stageToDelete);
                }
                closeDeleteStageModal();
              }}
            >
              מחק
            </Button>
            <Button variant="ghost" onClick={closeDeleteStageModal}>
              ביטול
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* מודל לעריכת שלב */}
      <Modal isOpen={isEditStageModalOpen} onClose={closeEditStageModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>עריכת שלב</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>שם השלב</FormLabel>
              <Input
                value={editedStageName}
                onChange={(e) => setEditedStageName(e.target.value)}
                placeholder="הכנס שם שלב"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleUpdateStage}
            >
              שמור
            </Button>
            <Button variant="ghost" onClick={closeEditStageModal}>
              ביטול
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
} 