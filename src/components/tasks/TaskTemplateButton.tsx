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

// נניח שיש לנו סרביס שמטפל בתבניות
const mockTemplateService = {
  // פונקציה שמדמה טעינת תבניות מהשרת
  getTemplates: async () => {
    // נדמה השהייה של שרת
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // נחזיר נתוני דוגמה
    return [
      { id: '1', name: 'משימת פיתוח', title: 'פיתוח תכונה חדשה', category: 'פיתוח', priority: 'medium' },
      { id: '2', name: 'משימת עיצוב', title: 'עיצוב ממשק משתמש', category: 'עיצוב', priority: 'high' },
      { id: '3', name: 'משימת בדיקות', title: 'בדיקת איכות', category: 'בדיקות', priority: 'low' },
    ];
  },
  
  // פונקציה שמדמה שמירת תבנית
  saveTemplate: async (template: any) => {
    // נדמה השהייה של שרת
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // נחזיר אישור הצלחה
    return { id: Math.random().toString(), ...template };
  }
};

interface TaskTemplateButtonProps {
  onSelectTemplate?: (template: any) => void;
  currentTask?: Task;
  variant?: string;
  size?: string;
  buttonText?: string;
}

const TaskTemplateButton: React.FC<TaskTemplateButtonProps> = ({
  onSelectTemplate,
  currentTask,
  variant = "outline",
  size = "md",
  buttonText
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // טעינת תבניות
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const data = await mockTemplateService.getTemplates();
        setTemplates(data);
      } catch (error) {
        console.error('Error loading templates:', error);
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
  
  // שמירת המשימה הנוכחית כתבנית
  const handleSaveAsTemplate = async () => {
    if (!currentTask || !templateName.trim()) return;
    
    setLoading(true);
    
    try {
      // הכנת נתוני התבנית - נסיר שדות ספציפיים
      const templateData = {
        name: templateName,
        title: currentTask.title,
        description: currentTask.description,
        priority: currentTask.priority,
        category: currentTask.category,
        // שמירה על ערכים רלוונטיים אחרים
      };
      
      await mockTemplateService.saveTemplate(templateData);
      
      toast({
        title: 'התבנית נשמרה בהצלחה',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // רענון רשימת התבניות
      const updatedTemplates = await mockTemplateService.getTemplates();
      setTemplates(updatedTemplates);
      
      // סגירת המודל
      onClose();
      setTemplateName('');
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'שגיאה בשמירת התבנית',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // בחירת תבנית
  const handleSelectTemplate = (template: any) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };
  
  // הצגת הכפתור לפי סגנון שהועבר
  const getButton = () => {
    if (buttonText) {
      return (
        <Button
          leftIcon={<FiCopy />}
          variant={variant}
          size={size}
          isLoading={loading}
        >
          {buttonText}
        </Button>
      );
    }
    
    return (
      <IconButton
        icon={<FiCopy />}
        variant={variant}
        size={size}
        aria-label="תבניות משימות"
        isLoading={loading}
      />
    );
  };
  
  return (
    <>
      <Menu closeOnSelect={true}>
        <MenuButton as={React.Fragment}>
          {getButton()}
        </MenuButton>
        <MenuList zIndex={1000} onBlur={(e) => {
          // סגירת התפריט כאשר הוא מאבד פוקוס אם הלחיצה הייתה מחוץ לתפריט
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setTimeout(() => {
              document.body.click(); // סימולציה של לחיצה מחוץ לתפריט
            }, 100);
          }
        }}>
          <MenuGroup title="תבניות משימות">
            {templates.map(template => (
              <MenuItem 
                key={template.id} 
                onClick={() => handleSelectTemplate(template)}
              >
                <Flex alignItems="center" width="100%">
                  <Text flex="1">{template.name}</Text>
                  <Badge colorScheme={getPriorityColor(template.priority)}>{template.priority}</Badge>
                </Flex>
              </MenuItem>
            ))}
          </MenuGroup>
          
          <MenuDivider />
          
          {currentTask && (
            <MenuItem icon={<FiSave />} onClick={onOpen}>
              שמור משימה נוכחית כתבנית
            </MenuItem>
          )}
          
          <MenuItem icon={<FiList />} onClick={() => window.alert('פתיחת ניהול תבניות')}>
            נהל תבניות
          </MenuItem>
        </MenuList>
      </Menu>
      
      {/* מודל לשמירת תבנית */}
      <Modal isOpen={isOpen} onClose={onClose}>
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
            <Button variant="ghost" mr={3} onClick={onClose}>
              ביטול
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveAsTemplate}
              isLoading={loading}
              isDisabled={!templateName.trim()}
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