import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  FormErrorMessage,
  VStack,
  HStack,
  useToast,
  Flex,
  Box,
  Divider,
  Select,
  Spinner,
  Text,
  Checkbox,
  CheckboxGroup,
  Stack,
  Badge,
  Heading,
} from '@chakra-ui/react';
import { Stage, Task } from '@/types/supabase';
import { ExtendedStage } from '@/types/extendedTypes';
import { stageService } from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';

interface StageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: ExtendedStage | null;
  projectId: string;
  onStageCreated?: (stage: ExtendedStage) => void;
  onStageUpdated?: (stage: ExtendedStage) => void;
}

const StageEditModal: React.FC<StageEditModalProps> = ({
  isOpen,
  onClose,
  stage,
  projectId,
  onStageCreated,
  onStageUpdated,
}) => {
  const isEditMode = !!stage;
  const [formData, setFormData] = useState<Partial<ExtendedStage>>({
    title: '',
    description: '',
    project_id: projectId,
    status: 'active',
    start_date: '',
    end_date: '',
    color: '',
    order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  const toast = useToast();
  
  // טעינת נתוני השלב בעת עריכה
  useEffect(() => {
    if (stage) {
      setFormData({
        ...stage,
        start_date: stage.start_date ? stage.start_date.split('T')[0] : '',
        end_date: stage.end_date ? stage.end_date.split('T')[0] : '',
      });
    } else {
      // איפוס הטופס בעת יצירת שלב חדש
      setFormData({
        title: '',
        description: '',
        project_id: projectId,
        status: 'active',
        start_date: '',
        end_date: '',
        color: '',
        order: 0,
      });
    }
    
    // טעינת המשימות של הפרויקט
    loadProjectTasks();
  }, [stage, projectId]);
  
  // פונקציה לטעינת משימות הפרויקט
  const loadProjectTasks = async () => {
    try {
      setLoadingTasks(true);
      // קבלת כל המשימות של הפרויקט בסדר היררכי
      const tasks = await taskService.getProjectSpecificTasks(projectId);
      setProjectTasks(tasks);
      
      // אם מדובר בעריכת שלב קיים, נסמן את המשימות ששייכות לשלב
      if (stage) {
        const tasksInStage = tasks.filter(task => task.stage_id === stage.id);
        setSelectedTaskIds(tasksInStage.map(task => task.id));
      } else {
        setSelectedTaskIds([]);
      }
    } catch (error) {
      console.error('Error loading project tasks:', error);
      toast({
        title: 'שגיאה בטעינת משימות',
        description: 'לא ניתן לטעון את משימות הפרויקט',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingTasks(false);
    }
  };
  
  // טיפול בשינויים בטופס
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // ניקוי שגיאות בעת שינוי
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // טיפול בשינוי בבחירת משימות
  const handleTaskSelectionChange = (taskId: string) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };
  
  // פונקציה לוולידציה של הטופס
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'כותרת השלב היא שדה חובה';
    }
    
    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // שמירת השלב
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // נכין את הנתונים הבסיסיים של Stage ללא השדות המורחבים
      const baseStageData: Partial<Stage> = {
        id: formData.id,
        title: formData.title || '',
        description: formData.description,
        project_id: projectId,
      };
      
      // נוסיף את השדות המורחבים באמצעות טיפוס casting
      const stageData = baseStageData as any;
      
      // נוסיף את השדות המורחבים רק אם הם קיימים
      if (formData.status) stageData.status = formData.status;
      if (formData.start_date) stageData.start_date = formData.start_date;
      if (formData.end_date) stageData.end_date = formData.end_date;
      if (formData.color) stageData.color = formData.color;
      if (formData.order !== undefined) stageData.order = formData.order;
      
      let result;
      
      if (isEditMode && stage) {
        // עדכון שלב קיים
        result = await stageService.updateStage(stage.id, stageData, projectId);
        
        if (result) {
          // עדכון המשימות ששייכות לשלב
          await updateTasksStage(result.id);
          
          toast({
            title: "השלב עודכן בהצלחה",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onStageUpdated) {
            onStageUpdated(result as ExtendedStage);
          }
        }
      } else {
        // יצירת שלב חדש
        result = await stageService.createStage(stageData);
        
        if (result) {
          // עדכון המשימות ששייכות לשלב
          await updateTasksStage(result.id);
          
          toast({
            title: "השלב נוצר בהצלחה",
            description: `השלב "${result.title}" נוצר ו-${selectedTaskIds.length} משימות שויכו אליו`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          
          if (onStageCreated) {
            onStageCreated(result as ExtendedStage);
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast({
        title: "שגיאה בשמירת השלב",
        description: "אירעה שגיאה בעת שמירת השלב. אנא נסה שנית.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // עדכון שלב למשימות שנבחרו
  const updateTasksStage = async (stageId: string) => {
    try {
      // מערך הבטחות לעדכון המשימות
      const updatePromises = selectedTaskIds.map(taskId => 
        taskService.updateTaskStage(taskId, stageId)
      );
      
      // ביצוע כל הבקשות במקביל
      await Promise.all(updatePromises);
      
      // אם זה שלב קיים, נמצא את המשימות ששייכות אליו ואינן ברשימת הנבחרות
      if (isEditMode && stage) {
        const tasksToRemoveStage = projectTasks
          .filter(task => task.stage_id === stage.id && !selectedTaskIds.includes(task.id))
          .map(task => task.id);
        
        // איפוס שלב למשימות שהוסרו
        const removePromises = tasksToRemoveStage.map(taskId => 
          taskService.updateTask(taskId, { stage_id: null })
        );
        
        await Promise.all(removePromises);
      }
      
      console.log(`Updated ${selectedTaskIds.length} tasks to stage ${stageId}`);
    } catch (error) {
      console.error('Error updating tasks stage:', error);
      throw error;
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>{isEditMode ? 'עריכת שלב' : 'שלב חדש'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.title}>
              <FormLabel>כותרת</FormLabel>
              <Input 
                name="title" 
                value={formData.title || ''} 
                onChange={handleChange} 
                placeholder="הזן כותרת לשלב"
              />
              {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
            </FormControl>
            
            <FormControl>
              <FormLabel>תיאור</FormLabel>
              <Textarea 
                name="description" 
                value={formData.description || ''} 
                onChange={handleChange} 
                placeholder="הזן תיאור מפורט לשלב"
                minH="100px"
              />
            </FormControl>
            
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>סטטוס</FormLabel>
                <Select name="status" value={formData.status || 'active'} onChange={handleChange}>
                  <option value="active">פעיל</option>
                  <option value="planning">בתכנון</option>
                  <option value="on hold">בהמתנה</option>
                  <option value="completed">הושלם</option>
                  <option value="cancelled">בוטל</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>צבע</FormLabel>
                <Input 
                  name="color" 
                  value={formData.color || ''} 
                  onChange={handleChange} 
                  placeholder="צבע ברקע (לדוגמה #FF5733)"
                />
              </FormControl>
            </HStack>
            
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>תאריך התחלה</FormLabel>
                <Input 
                  type="date" 
                  name="start_date" 
                  value={formData.start_date || ''} 
                  onChange={handleChange}
                />
              </FormControl>
              
              <FormControl isInvalid={!!errors.end_date}>
                <FormLabel>תאריך סיום</FormLabel>
                <Input 
                  type="date" 
                  name="end_date" 
                  value={formData.end_date || ''} 
                  onChange={handleChange}
                />
                {errors.end_date && <FormErrorMessage>{errors.end_date}</FormErrorMessage>}
              </FormControl>
            </HStack>
            
            <FormControl>
              <FormLabel>סדר</FormLabel>
              <Input 
                type="number" 
                name="order" 
                value={formData.order || 0} 
                onChange={handleChange}
                min={0}
                step={1}
              />
            </FormControl>
            
            <Divider my={3} />
            
            {/* אזור בחירת משימות לשיוך לשלב */}
            <Box>
              <Heading size="sm" mb={3}>שיוך משימות לשלב</Heading>
              <Text fontSize="sm" mb={3}>
                בחר את המשימות שברצונך לשייך לשלב זה. המשימות מוצגות לפי מספור היררכי.
              </Text>
              
              {loadingTasks ? (
                <Flex justify="center" py={4}>
                  <Spinner />
                </Flex>
              ) : projectTasks.length === 0 ? (
                <Text color="gray.500" py={4}>
                  לא נמצאו משימות בפרויקט זה
                </Text>
              ) : (
                <Box maxH="300px" overflowY="auto" p={3} borderWidth="1px" borderRadius="md">
                  <VStack align="stretch" spacing={2}>
                    {projectTasks.map(task => (
                      <Checkbox 
                        key={task.id}
                        isChecked={selectedTaskIds.includes(task.id)}
                        onChange={() => handleTaskSelectionChange(task.id)}
                        colorScheme="blue"
                      >
                        <HStack>
                          <Text fontWeight={!task.parent_task_id ? "bold" : "normal"}>
                            {task.hierarchical_number && (
                              <Badge mr={2} colorScheme="blue">
                                {task.hierarchical_number}
                              </Badge>
                            )}
                            {task.title}
                          </Text>
                        </HStack>
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
              )}
              
              {selectedTaskIds.length > 0 && (
                <Text fontSize="sm" mt={2}>
                  נבחרו {selectedTaskIds.length} משימות לשיוך לשלב זה
                </Text>
              )}
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            ביטול
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="שומר..."
          >
            {isEditMode ? 'עדכן שלב' : 'צור שלב'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StageEditModal; 