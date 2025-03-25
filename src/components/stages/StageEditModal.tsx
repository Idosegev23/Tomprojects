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
} from '@chakra-ui/react';
import { Stage } from '@/types/supabase';
import { ExtendedStage } from '@/types/extendedTypes';
import { stageService } from '@/lib/services/stageService';

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
  }, [stage, projectId]);
  
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
        description: "אירעה שגיאה בעת שמירת השלב. אנא נסה שנית.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="600px">
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