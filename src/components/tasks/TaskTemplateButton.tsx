import React, { useState, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  MenuGroup,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Spinner,
  Text,
  Flex,
  Badge
} from '@chakra-ui/react';
import { FiCopy, FiSave, FiList, FiPlus } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import { taskTemplateService } from '@/lib/services/taskTemplateService';

interface TaskTemplateButtonProps {
  onSelectTemplate?: (template: any) => void;
  currentTask?: Task;
  variant?: string;
  size?: string;
  buttonText?: string;
}

// פונקציית עזר להסרת תיוג התבנית מהכותרת ולהצגת השם האמיתי של המשימה
const getCleanTemplateName = (title: string) => {
  return title?.replace(/\[TEMPLATE\]|\[TEMPLATE-DEFAULT\]/g, '').trim() || '';
};

const TaskTemplateButton: React.FC<TaskTemplateButtonProps> = ({
  onSelectTemplate,
  currentTask,
  variant = "outline",
  size = "md",
  buttonText
}) => {
  const [templates, setTemplates] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false); // סטייט נפרד לטעינת שמירה
  const [templateName, setTemplateName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // טעינת תבניות
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        console.log('טוען תבניות משימות...');
        const data = await taskTemplateService.getAllTemplates();
        console.log(`נטענו ${data.length} תבניות משימות`);
        setTemplates(data);
      } catch (error) {
        console.error('שגיאה בטעינת תבניות:', error);
        toast({
          title: 'שגיאה בטעינת תבניות',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, [toast]);
  
  // פתיחת מודל השמירה ואיפוס שדות
  const handleOpenSaveModal = () => {
    // איפוס שם התבנית לשם המשימה הנוכחית אם קיים
    if (currentTask?.title) {
      setTemplateName(currentTask.title);
    } else {
      setTemplateName('');
    }
    
    // איפוס סטטוס הטעינה של השמירה
    setSaveLoading(false);
    
    // פתיחת המודל
    onOpen();
  };
  
  // סגירת מודל השמירה ואיפוס השדות
  const handleCloseModal = () => {
    // איפוס סטטוס הטעינה של השמירה אם עדיין פעיל
    setSaveLoading(false);
    
    // סגירת המודל
    onClose();
    
    // איפוס שם התבנית
    setTemplateName('');
  };
  
  // שמירת המשימה הנוכחית כתבנית
  const handleSaveAsTemplate = async () => {
    // וידוא שיש לנו משימה נוכחית ושם תבנית תקין
    if (!currentTask) {
      toast({
        title: 'שגיאה בשמירת תבנית',
        description: 'לא נמצאה משימה נוכחית לשמירה',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (!templateName.trim()) {
      toast({
        title: 'שגיאה בשמירת תבנית',
        description: 'יש להזין שם לתבנית',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // הפעלת מצב טעינה
    setSaveLoading(true);
    
    try {
      console.log(`שומר משימה כתבנית: ${templateName}`);
      
      // הכנת נתוני התבנית
      const templateData = {
        name: templateName,
        is_default: false, // לא תבנית ברירת מחדל
        task_data: {
          title: currentTask.title,
          description: currentTask.description,
          priority: currentTask.priority,
          status: currentTask.status,
          parent_task_id: currentTask.parent_task_id,
          hierarchical_number: currentTask.hierarchical_number,
          responsible: currentTask.responsible,
          category: currentTask.category,
          // שדות נוספים שרוצים לשמור
        }
      };
      
      // שליחת הנתונים לשרת
      await taskTemplateService.saveTemplate(templateData);
      
      toast({
        title: 'התבנית נשמרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // רענון רשימת התבניות
      console.log('מרענן רשימת תבניות...');
      const updatedTemplates = await taskTemplateService.getAllTemplates();
      setTemplates(updatedTemplates);
      
      // סגירת המודל
      handleCloseModal();
    } catch (error) {
      console.error('שגיאה בשמירת תבנית:', error);
      toast({
        title: 'שגיאה בשמירת התבנית',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      // סיום מצב טעינה
      setSaveLoading(false);
    }
  };
  
  // בחירת תבנית
  const handleSelectTemplate = (template: Task) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };
  
  return (
    <>
      <Menu closeOnSelect={true}>
        {buttonText ? (
          <MenuButton
            as={Button}
            leftIcon={<FiCopy />}
            variant={variant}
            size={size}
            isLoading={loading}
          >
            {buttonText}
          </MenuButton>
        ) : (
          <MenuButton
            as={IconButton}
            icon={<FiCopy />}
            variant={variant}
            size={size}
            aria-label="תבניות משימות"
            isLoading={loading}
          />
        )}
        <MenuList zIndex={1000} onBlur={(e) => {
          // סגירת התפריט כאשר הוא מאבד פוקוס אם הלחיצה הייתה מחוץ לתפריט
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setTimeout(() => {
              document.body.click(); // סימולציה של לחיצה מחוץ לתפריט
            }, 100);
          }
        }}>
          <MenuGroup title="תבניות משימות">
            {templates.length > 0 ? (
              templates.map(template => (
                <MenuItem 
                  key={template.id} 
                  onClick={() => handleSelectTemplate(template)}
                >
                  <Flex alignItems="center" width="100%">
                    <Text flex="1">{getCleanTemplateName(template.title)}</Text>
                    <Badge colorScheme={getPriorityColor(template.priority || '')}>{template.priority}</Badge>
                  </Flex>
                </MenuItem>
              ))
            ) : (
              <MenuItem isDisabled>אין תבניות זמינות</MenuItem>
            )}
          </MenuGroup>
          
          <MenuDivider />
          
          {currentTask && (
            <MenuItem icon={<FiSave />} onClick={handleOpenSaveModal}>
              שמור משימה נוכחית כתבנית
            </MenuItem>
          )}
          
          <MenuItem icon={<FiList />} onClick={() => window.alert('פתיחת ניהול תבניות')}>
            נהל תבניות
          </MenuItem>
        </MenuList>
      </Menu>
      
      {/* מודל לשמירת תבנית */}
      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>שמירת משימה כתבנית</ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                שמירת משימה כתבנית תאפשר לך ליצור במהירות משימות דומות בעתיד.
              </Text>
              
              <FormControl isRequired>
                <FormLabel>שם התבנית</FormLabel>
                <Input
                  placeholder="הזן שם לתבנית"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button 
              variant="ghost" 
              mr={3} 
              onClick={handleCloseModal}
              isDisabled={saveLoading}
            >
              ביטול
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveAsTemplate}
              isLoading={saveLoading}
              loadingText="שומר..."
              isDisabled={!templateName.trim() || saveLoading}
            >
              שמור תבנית
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

// פונקציה לקבלת צבע עדיפות
const getPriorityColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orange';
    case 'low':
      return 'green';
    case 'urgent':
      return 'purple';
    default:
      return 'gray';
  }
};

export default TaskTemplateButton; 