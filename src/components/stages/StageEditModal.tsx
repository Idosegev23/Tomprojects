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
  IconButton,
  Spacer,
  Tooltip,
  Switch,
  SimpleGrid,
  Grid,
  GridItem,
  Wrap,
  WrapItem,
  useColorModeValue,
  Stack,
  Center,
  Icon,
  Tag,
  TagLabel,
  TagCloseButton,
  Image,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { Stage, Task } from '@/types/supabase';
import { ExtendedStage } from '@/types/extendedTypes';
import { stageService } from '@/lib/services/stageService';
import taskService from '@/lib/services/taskService';
import { projectService } from '@/lib/services/projectService';
import { CheckCircleIcon, ChevronRightIcon, InfoIcon, TimeIcon, WarningIcon } from '@chakra-ui/icons';
import { FaBuilding, FaCheckCircle, FaChevronDown, FaClock, FaPalette, FaTasks } from 'react-icons/fa';

// פלטת צבעים קבועה שתהיה זמינה לבחירה
const COLOR_PALETTE = [
  '#3498db', // כחול 
  '#2ecc71', // ירוק
  '#e74c3c', // אדום
  '#f39c12', // כתום
  '#9b59b6', // סגול
  '#1abc9c', // טורקיז
  '#34495e', // כחול כהה
  '#7f8c8d', // אפור
  '#27ae60', // ירוק כהה 
  '#e67e22', // כתום כהה
  '#8e44ad', // סגול כהה
  '#f1c40f', // צהוב
  '#d35400', // חום
  '#c0392b', // אדום כהה
  '#16a085', // ירוק-כחול
];

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
  const [syncingTables, setSyncingTables] = useState(false);
  const [runningFunctions, setRunningFunctions] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [matchingTasks, setMatchingTasks] = useState<Task[]>([]);
  const [availableHierarchyPrefixes, setAvailableHierarchyPrefixes] = useState<string[]>([]);
  const [previewColor, setPreviewColor] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const previewBg = useColorModeValue('white', 'gray.800');

  // טעינת נתוני השלב בעת עריכה
  useEffect(() => {
    if (stage) {
      setFormData({
        ...stage,
        start_date: stage.start_date ? stage.start_date.split('T')[0] : '',
        end_date: stage.end_date ? stage.end_date.split('T')[0] : '',
      });
      setPreviewColor(stage.color || COLOR_PALETTE[0]);
    } else {
      // איפוס הטופס בעת יצירת שלב חדש
      setFormData({
        title: '',
        description: '',
        project_id: projectId,
        status: 'active',
        start_date: '',
        end_date: '',
        color: COLOR_PALETTE[0],
        hierarchical_number: '',
        sort_order: 0,
      });
      setPreviewColor(COLOR_PALETTE[0]);
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
          try {
            // בדיקה שה-hierarchical_number הוא מחרוזת תקינה
            if (typeof task.hierarchical_number === 'string' && task.hierarchical_number.length > 0) {
              // הוצאת הספרה הראשית (לפני הנקודה הראשונה)
              const mainNumber = (task.hierarchical_number as string).split('.')[0];
              if (mainNumber) {
                prefixes.add(mainNumber);
              }
            }
          } catch (error) {
            console.error('שגיאה בחילוץ המספר ההיררכי הראשי:', error, task.hierarchical_number);
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
    
    if (name === 'color') {
      setPreviewColor(value);
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
  
  // בחירת צבע מהפלטה
  const handleColorSelect = (color: string) => {
    setPreviewColor(color);
    setFormData(prev => ({ ...prev, color }));
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
        result = await stageService.createStage(projectId, stageData);
        
        if (result) {
          // עדכון המשימות ששייכות לשלב לפי המספר ההיררכי
          await updateTasksStage(result.id);
          
          toast({
            title: "השלב נוצר בהצלחה",
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
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // עדכון המשימות ששייכות לשלב לפי המספר ההיררכי
  const updateTasksStage = async (stageId: string) => {
    if (!formData.hierarchical_number) return;
    
    try {
      // מצא את כל המשימות שהמספר ההיררכי שלהן מתחיל במספר שנבחר
      const tasksToUpdate = projectTasks.filter(task => 
        task.hierarchical_number && task.hierarchical_number.startsWith(formData.hierarchical_number!)
      );
      
      if (tasksToUpdate.length === 0) return;
      
      const updates = tasksToUpdate.map(task => 
        taskService.updateTask(task.id, { stage_id: stageId }),
      );
      
      await Promise.all(updates);
      
      toast({
        title: "משימות עודכנו",
        description: `${tasksToUpdate.length} משימות שויכו לשלב זה`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating tasks stage:', error);
      toast({
        title: "שגיאה בעדכון משימות",
        description: "לא ניתן לעדכן חלק מהמשימות",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // פונקציות עזר לסנכרון טבלאות ולהפעלת פונקציות אחרות יועתקו כמו שהן
  const handleSyncTables = async () => {
    // קוד קיים
  };

  const handleRunFunctions = async () => {
    // קוד קיים
  };
  
  // החלק החזותי של הפונקציה
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent borderRadius="md" boxShadow="lg">
        <ModalHeader 
          bg={previewColor} 
          color="white" 
          borderTopRadius="md"
          display="flex"
          alignItems="center"
          p={4}
        >
          <Icon as={FaTasks} mr={2} />
          {isEditMode ? 'עריכת שלב' : 'יצירת שלב חדש'}
        </ModalHeader>
        <ModalCloseButton color="white" />
        
        <ModalBody p={6}>
          <VStack spacing={6} align="stretch">
            {/* תצוגה מקדימה של השלב */}
            <Box 
              p={4} 
              borderWidth="1px" 
              borderRadius="md" 
              bg={previewBg}
              boxShadow="sm"
              overflow="hidden"
              position="relative"
            >
              <HStack spacing={4} mb={2}>
                <Box 
                  w="12px" 
                  h="full" 
                  position="absolute" 
                  left={0} 
                  top={0} 
                  bottom={0} 
                  bg={previewColor} 
                />
                <Box pl={4}>
                  <Heading size="md" noOfLines={1}>
                    {formData.title || 'כותרת השלב'}
                  </Heading>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {formData.description || 'תיאור השלב יופיע כאן'}
                  </Text>
                </Box>
              </HStack>
              <Text fontSize="xs" textAlign="center" fontStyle="italic" mt={2} color="gray.400">
                כך ייראה השלב בפרויקט
              </Text>
            </Box>

            {/* טופס יצירת/עריכת שלב */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              {/* חלק ימני - פרטים בסיסיים */}
              <GridItem>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired isInvalid={!!errors.title}>
                    <FormLabel fontWeight="bold">כותרת השלב</FormLabel>
                    <Input 
                      name="title" 
                      value={formData.title || ''} 
                      onChange={handleChange} 
                      placeholder="הזן כותרת לשלב"
                      size="md"
                      borderRadius="md"
                    />
                    {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontWeight="bold">תיאור השלב</FormLabel>
                    <Textarea 
                      name="description" 
                      value={formData.description || ''} 
                      onChange={handleChange} 
                      placeholder="הזן תיאור מפורט לשלב"
                      minH="100px"
                      borderRadius="md"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontWeight="bold">סטטוס</FormLabel>
                    <Select 
                      name="status" 
                      value={formData.status || 'active'} 
                      onChange={handleChange}
                      borderRadius="md"
                    >
                      <option value="active">פעיל</option>
                      <option value="planning">בתכנון</option>
                      <option value="on hold">בהמתנה</option>
                      <option value="completed">הושלם</option>
                      <option value="cancelled">בוטל</option>
                    </Select>
                  </FormControl>
                </VStack>
              </GridItem>

              {/* חלק שמאלי - צבע ותאריכים */}
              <GridItem>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel fontWeight="bold" display="flex" alignItems="center">
                      <Icon as={FaPalette} mr={2} />
                      בחר צבע לשלב
                    </FormLabel>
                    <Wrap spacing={2} mb={2}>
                      {COLOR_PALETTE.map((color) => (
                        <WrapItem key={color}>
                          <Box
                            w="30px"
                            h="30px"
                            bg={color}
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => handleColorSelect(color)}
                            borderWidth={previewColor === color ? "2px" : "0px"}
                            borderColor="blue.300"
                            transition="all 0.2s"
                            _hover={{ transform: "scale(1.1)" }}
                          />
                        </WrapItem>
                      ))}
                    </Wrap>
                    <Input 
                      name="color" 
                      value={formData.color || ''} 
                      onChange={handleChange} 
                      placeholder="או הזן קוד צבע מותאם אישית"
                      size="sm"
                    />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel fontWeight="bold">תאריך התחלה</FormLabel>
                      <Input 
                        type="date" 
                        name="start_date" 
                        value={formData.start_date || ''} 
                        onChange={handleChange}
                        borderRadius="md"
                      />
                    </FormControl>
                    
                    <FormControl isInvalid={!!errors.end_date}>
                      <FormLabel fontWeight="bold">תאריך סיום</FormLabel>
                      <Input 
                        type="date" 
                        name="end_date" 
                        value={formData.end_date || ''} 
                        onChange={handleChange}
                        borderRadius="md"
                      />
                      {errors.end_date && <FormErrorMessage>{errors.end_date}</FormErrorMessage>}
                    </FormControl>
                  </HStack>
                </VStack>
              </GridItem>
            </SimpleGrid>

            <Divider my={2} />

            {/* שיוך משימות לפי מספור היררכי */}
            <Accordion allowToggle defaultIndex={[0]} borderRadius="md" borderWidth="1px">
              <AccordionItem border="none">
                <AccordionButton py={3} bg={bgColor}>
                  <HStack flex="1" textAlign="left">
                    <Icon as={FaTasks} />
                    <Text fontWeight="bold">שיוך משימות אוטומטי לפי מספור היררכי</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>מספר היררכי של השלב</FormLabel>
                      <Select 
                        name="hierarchical_number" 
                        value={formData.hierarchical_number || ''} 
                        onChange={handleChange}
                        placeholder="בחר מספר ראשי"
                        borderRadius="md"
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
                      <Center py={4}>
                        <Spinner />
                      </Center>
                    ) : matchingTasks.length > 0 ? (
                      <Box mt={2}>
                        <Alert status="info" borderRadius="md" variant="left-accent">
                          <AlertIcon />
                          <Box>
                            <AlertTitle>משימות מתאימות: {matchingTasks.length}</AlertTitle>
                            <AlertDescription>
                              המשימות הבאות ישויכו לשלב זה באופן אוטומטי:
                            </AlertDescription>
                          </Box>
                        </Alert>
                        
                        <Box mt={3} p={3} borderWidth="1px" borderRadius="md" maxH="200px" overflowY="auto">
                          <VStack align="stretch" spacing={2} divider={<Divider />}>
                            {matchingTasks.map(task => (
                              <HStack key={task.id} spacing={3}>
                                <Badge colorScheme="blue" p="1" borderRadius="md">
                                  {task.hierarchical_number}
                                </Badge>
                                <Text fontWeight="medium">{task.title}</Text>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      </Box>
                    ) : formData.hierarchical_number ? (
                      <Alert status="warning" mt={2} borderRadius="md" variant="left-accent">
                        <AlertIcon />
                        <Box>
                          <AlertTitle>אין משימות מתאימות</AlertTitle>
                          <AlertDescription>
                            לא נמצאו משימות עם המספר ההיררכי {formData.hierarchical_number}
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ) : null}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            {/* הגדרות נוספות */}
            <Box borderWidth="1px" borderRadius="md" p={3}>
              <FormControl>
                <FormLabel fontWeight="bold">סדר הצגת השלב</FormLabel>
                <NumberInput 
                  min={0} 
                  step={1} 
                  value={formData.sort_order || 0}
                  onChange={(val) => setFormData({...formData, sort_order: parseInt(val) || 0})}
                >
                  <NumberInputField borderRadius="md" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  ערך נמוך יותר יציג את השלב מוקדם יותר ברשימת השלבים
                </Text>
              </FormControl>
            </Box>
          </VStack>
        </ModalBody>
        
        <ModalFooter borderTop="1px" borderColor={borderColor} p={4}>
          <Button variant="outline" mr={3} onClick={onClose}>
            ביטול
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="שומר..."
            leftIcon={<CheckCircleIcon />}
          >
            {isEditMode ? 'עדכן שלב' : 'צור שלב'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StageEditModal; 