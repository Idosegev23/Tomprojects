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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Heading,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
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
    hierarchical_number: '',
    sort_order: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [matchingTasks, setMatchingTasks] = useState<Task[]>([]);
  const [availableHierarchyPrefixes, setAvailableHierarchyPrefixes] = useState<string[]>([]);
  
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
        hierarchical_number: '',
        sort_order: 0,
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
      
      // איסוף כל המספרים ההיררכיים הראשיים (המספר לפני הנקודה הראשונה)
      const prefixes = new Set<string>();
      tasks.forEach(task => {
        if (task.hierarchical_number) {
          // הוצאת הספרה הראשית (לפני הנקודה הראשונה)
          const mainNumber = task.hierarchical_number.split('.')[0];
          if (mainNumber) {
            prefixes.add(mainNumber);
          }
        }
      });
      
      // מיון המספרים
      const sortedPrefixes = Array.from(prefixes).sort((a, b) => parseInt(a) - parseInt(b));
      setAvailableHierarchyPrefixes(sortedPrefixes);
      
      // אם מדובר בעריכת שלב קיים, נמצא את המשימות ששייכות לו
      if (stage && stage.hierarchical_number) {
        updateMatchingTasks(stage.hierarchical_number);
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
  
  // עדכון המשימות שמתאימות למספר ההיררכי שנבחר
  const updateMatchingTasks = (hierNumber: string) => {
    if (!hierNumber || !projectTasks.length) return;
    
    // מציאת משימות שהמספר ההיררכי שלהן מתחיל במספר שנבחר
    const matching = projectTasks.filter(task => 
      task.hierarchical_number && task.hierarchical_number.startsWith(hierNumber)
    );
    
    setMatchingTasks(matching);
  };
  
  // טיפול בשינויים בטופס
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hierarchical_number') {
      updateMatchingTasks(value);
    }
    
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
      // נכין את הנתונים הבסיסיים
      const stageData: any = {
        id: formData.id,
        title: formData.title || '',
        description: formData.description,
        project_id: projectId,
        hierarchical_number: formData.hierarchical_number,
      };
      
      // נוסיף את השדות המורחבים רק אם הם קיימים
      if (formData.status) stageData.status = formData.status;
      if (formData.start_date) stageData.start_date = formData.start_date;
      if (formData.end_date) stageData.end_date = formData.end_date;
      if (formData.color) stageData.color = formData.color;
      if (formData.sort_order !== undefined) stageData.sort_order = formData.sort_order;
      
      let result;
      
      if (isEditMode && stage) {
        // עדכון שלב קיים
        result = await stageService.updateStage(stage.id, stageData, projectId);
        
        if (result) {
          // עדכון המשימות ששייכות לשלב לפי המספר ההיררכי
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
          // עדכון המשימות ששייכות לשלב לפי המספר ההיררכי
          await updateTasksStage(result.id);
          
          toast({
            title: "השלב נוצר בהצלחה",
            description: `השלב "${result.title}" נוצר ו-${matchingTasks.length} משימות שויכו אליו`,
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
  
  // עדכון שלב למשימות לפי המספר ההיררכי
  const updateTasksStage = async (stageId: string) => {
    try {
      if (!formData.hierarchical_number) return;
      
      // שימוש בפונקציה היעילה יותר לעדכון משימות לפי תחילית מספר היררכי
      console.log(`Updating tasks with hierarchical prefix ${formData.hierarchical_number} to stage ${stageId}`);
      
      const updatedCount = await taskService.updateTasksStageByHierarchicalPrefix(
        formData.hierarchical_number,
        stageId,
        projectId
      );
      
      console.log(`Updated ${updatedCount} tasks to stage ${stageId}`);
      
      // אם עדכנו שלב קיים, נטפל במשימות שהיו משויכות אליו קודם ואינן מתאימות למספר ההיררכי
      if (isEditMode && stage && stage.id) {
        console.log(`Cleaning up tasks that were assigned to stage ${stage.id} but no longer match hierarchical prefix`);
        
        // מציאת משימות שמשויכות לשלב אבל לא מתחילות במספר ההיררכי החדש
        const tasksInWrongStage = projectTasks.filter(task => 
          task.stage_id === stage.id && 
          (!task.hierarchical_number || !task.hierarchical_number.startsWith(formData.hierarchical_number || ''))
        );
        
        if (tasksInWrongStage.length > 0) {
          console.log(`Found ${tasksInWrongStage.length} tasks in wrong stage, clearing their stage_id`);
          
          // איפוס שלב למשימות שכבר לא מתאימות
          const removePromises = tasksInWrongStage.map(task => 
            taskService.updateTask(task.id, { stage_id: null })
          );
          
          await Promise.all(removePromises);
        }
      }
      
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
              <NumberInput 
                min={0} 
                step={1} 
                value={formData.sort_order || 0}
                onChange={(val) => setFormData({...formData, sort_order: parseInt(val) || 0})}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <Divider my={3} />
            
            {/* אזור שיוך משימות אוטומטי לפי מספר היררכי */}
            <Box>
              <Heading size="sm" mb={3}>שיוך משימות אוטומטי לפי מספור היררכי</Heading>
              
              <FormControl>
                <FormLabel>מספר היררכי של השלב</FormLabel>
                <Select 
                  name="hierarchical_number" 
                  value={formData.hierarchical_number || ''} 
                  onChange={handleChange}
                  placeholder="בחר מספר ראשי"
                >
                  {availableHierarchyPrefixes.map(prefix => (
                    <option key={prefix} value={prefix}>
                      {prefix} - כל המשימות המתחילות ב-{prefix}
                    </option>
                  ))}
                </Select>
                
                <Text fontSize="sm" mt={2} color="gray.600">
                  כל המשימות שמספרן ההיררכי מתחיל במספר זה ישויכו אוטומטית לשלב
                </Text>
              </FormControl>
              
              {loadingTasks ? (
                <Flex justify="center" py={4}>
                  <Spinner />
                </Flex>
              ) : matchingTasks.length > 0 ? (
                <Box mt={4}>
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>משימות מתאימות: {matchingTasks.length}</AlertTitle>
                      <AlertDescription>
                        המשימות הבאות ישויכו לשלב זה באופן אוטומטי:
                      </AlertDescription>
                    </Box>
                  </Alert>
                  
                  <Box maxH="200px" overflowY="auto" mt={3} p={3} borderWidth="1px" borderRadius="md">
                    <VStack align="stretch" spacing={1}>
                      {matchingTasks.map(task => (
                        <Text key={task.id} fontSize="sm">
                          <Badge mr={2} colorScheme="blue">
                            {task.hierarchical_number}
                          </Badge>
                          {task.title}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                </Box>
              ) : formData.hierarchical_number ? (
                <Alert status="warning" mt={4} borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>אין משימות מתאימות</AlertTitle>
                    <AlertDescription>
                      לא נמצאו משימות עם המספר ההיררכי {formData.hierarchical_number}
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : null}
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