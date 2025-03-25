import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
  useColorModeValue,
  useToast,
  Spinner,
  useDisclosure,
  IconButton,
  Tooltip,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, ChevronDownIcon, DragHandleIcon } from '@chakra-ui/icons';
import { stageService } from '@/lib/services/stageService';
import { Stage } from '@/types/supabase';
import { ExtendedStage, StageWithTasks } from '@/types/extendedTypes';
import StageEditModal from './StageEditModal';

interface StageManagerProps {
  projectId: string;
  showTasks?: boolean;
}

// קומפוננטה לניהול שלבים בפרויקט
const StageManager: React.FC<StageManagerProps> = ({ projectId, showTasks = false }) => {
  const [stages, setStages] = useState<StageWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ExtendedStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<ExtendedStage | null>(null);
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  
  const toast = useToast();
  const cardBgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // טעינת השלבים
  const fetchStages = async () => {
    setIsLoading(true);
    try {
      let stagesData: StageWithTasks[] = [];
      
      if (showTasks) {
        // אם צריך להציג גם את המשימות
        stagesData = await stageService.getStagesWithTasks(projectId);
      } else {
        // קבלת רק השלבים בלי משימות
        const stagesOnly = await stageService.getProjectStages(projectId);
        stagesData = stagesOnly.map(stage => ({ ...stage, tasks: [] })) as StageWithTasks[];
      }
      
      // מיון השלבים לפי סדר
      stagesData.sort((a, b) => {
        // אם יש שדה order, נשתמש בו למיון
        if ('order' in a && 'order' in b && a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // אחרת, נמיין לפי תאריך יצירה
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      setStages(stagesData);
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast({
        title: 'שגיאה בטעינת השלבים',
        description: 'לא ניתן לטעון את השלבים. נסה שוב מאוחר יותר.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // טעינת השלבים בעת טעינת הקומפוננטה
  useEffect(() => {
    if (projectId) {
      fetchStages();
    }
  }, [projectId]);
  
  // פתיחת מודל עריכה
  const handleEditStage = (stage: ExtendedStage) => {
    setSelectedStage(stage);
    onEditModalOpen();
  };
  
  // פתיחת מודל יצירה
  const handleAddNewStage = () => {
    setSelectedStage(null);
    onEditModalOpen();
  };
  
  // פתיחת מודל מחיקה
  const handleDeleteClick = (stage: ExtendedStage) => {
    setStageToDelete(stage);
    onDeleteModalOpen();
  };
  
  // ביצוע מחיקת שלב
  const handleDeleteConfirm = async () => {
    if (!stageToDelete) return;
    
    try {
      await stageService.deleteStage(stageToDelete.id, projectId);
      
      toast({
        title: 'השלב נמחק בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // טעינה מחדש של השלבים
      fetchStages();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast({
        title: 'שגיאה במחיקת השלב',
        description: 'לא ניתן למחוק את השלב. נסה שוב מאוחר יותר.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onDeleteModalClose();
    }
  };
  
  // פונקציה שמחזירה צבע לפי סטטוס
  const getStatusColor = (status?: string) => {
    if (!status) return 'gray';
    
    switch (status.toLowerCase()) {
      case 'active': return 'green';
      case 'planning': return 'blue';
      case 'on hold': return 'yellow';
      case 'completed': return 'teal';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };
  
  // פונקציה להצגת תאריך בפורמט מקומי
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };
  
  // עדכון רשימת השלבים לאחר יצירה/עדכון
  const handleStageCreated = (stage: ExtendedStage) => {
    fetchStages();
  };
  
  const handleStageUpdated = (stage: ExtendedStage) => {
    fetchStages();
  };
  
  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">שלבי הפרויקט</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={handleAddNewStage}
        >
          שלב חדש
        </Button>
      </Flex>
      
      {isLoading ? (
        <Flex justifyContent="center" p={10}>
          <Spinner size="xl" />
        </Flex>
      ) : (
        <VStack spacing={4} align="stretch">
          {stages.length === 0 ? (
            <Box p={5} textAlign="center" borderWidth="1px" borderRadius="md">
              <Text fontSize="lg">לא נמצאו שלבים בפרויקט זה</Text>
              <Button mt={4} colorScheme="blue" onClick={handleAddNewStage}>
                הוסף שלב חדש
              </Button>
            </Box>
          ) : (
            stages.map((stage) => (
              <Card key={stage.id} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                <CardHeader pb={2}>
                  <Flex justifyContent="space-between" alignItems="center">
                    <HStack>
                      <DragHandleIcon cursor="grab" opacity={0.5} />
                      <Heading size="md">{stage.title}</Heading>
                      {stage.status && (
                        <Badge colorScheme={getStatusColor(stage.status)}>
                          {stage.status}
                        </Badge>
                      )}
                    </HStack>
                    <HStack>
                      <Tooltip label="ערוך שלב">
                        <IconButton
                          icon={<EditIcon />}
                          aria-label="ערוך שלב"
                          variant="ghost"
                          onClick={() => handleEditStage(stage)}
                        />
                      </Tooltip>
                      <Tooltip label="מחק שלב">
                        <IconButton
                          icon={<DeleteIcon />}
                          aria-label="מחק שלב"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDeleteClick(stage)}
                        />
                      </Tooltip>
                    </HStack>
                  </Flex>
                </CardHeader>
                <CardBody pt={2}>
                  <VStack align="stretch" spacing={2}>
                    {stage.description && (
                      <Text fontSize="sm" color="gray.600">
                        {stage.description}
                      </Text>
                    )}
                    
                    <HStack justifyContent="space-between" flexWrap="wrap">
                      {(stage.start_date || stage.end_date) && (
                        <Text fontSize="xs" color="gray.500">
                          {stage.start_date && `מתאריך: ${formatDate(stage.start_date)}`}
                          {stage.start_date && stage.end_date && ' | '}
                          {stage.end_date && `עד תאריך: ${formatDate(stage.end_date)}`}
                        </Text>
                      )}
                    </HStack>
                    
                    {showTasks && (
                      <>
                        <Divider my={2} />
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm">
                            משימות: {stage.tasks?.length || 0}
                          </Text>
                          {stage.progress !== undefined && (
                            <HStack spacing={2} flexGrow={1} maxW="60%" ml={4}>
                              <Progress
                                value={stage.progress}
                                size="sm"
                                colorScheme="blue"
                                borderRadius="md"
                                flexGrow={1}
                              />
                              <Text fontSize="xs" fontWeight="bold" w="40px">
                                {stage.progress}%
                              </Text>
                            </HStack>
                          )}
                        </Flex>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))
          )}
        </VStack>
      )}
      
      {/* מודל עריכת שלב */}
      <StageEditModal
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        stage={selectedStage}
        projectId={projectId}
        onStageCreated={handleStageCreated}
        onStageUpdated={handleStageUpdated}
      />
      
      {/* מודל אישור מחיקה */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>מחיקת שלב</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              האם אתה בטוח שברצונך למחוק את השלב "{stageToDelete?.title}"?
            </Text>
            <Text mt={2} color="red.500" fontWeight="bold">
              שים לב: פעולה זו אינה ניתנת לביטול, והמשימות הקשורות לשלב זה יעברו למצב "ללא שלב".
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
              ביטול
            </Button>
            <Button colorScheme="red" onClick={handleDeleteConfirm}>
              מחק
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default StageManager; 