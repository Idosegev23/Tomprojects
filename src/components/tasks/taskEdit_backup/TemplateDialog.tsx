import React, { RefObject } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
} from '@chakra-ui/react';
import { FaSave } from 'react-icons/fa';

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  setTemplateName: (value: string) => void;
  onSaveTemplate: () => void;
  isLoading: boolean;
  cancelRef: RefObject<HTMLButtonElement>;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  isOpen,
  onClose,
  templateName,
  setTemplateName,
  onSaveTemplate,
  isLoading,
  cancelRef,
}) => {
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      size={{ base: "sm", md: "md" }}
    >
      <AlertDialogOverlay>
        <AlertDialogContent mx={2}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            שמירת משימה כתבנית ברירת מחדל
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack spacing={4} align="stretch">
              <Text>
                האם ברצונך לשמור את המשימה הזו כתבנית ברירת מחדל? 
                משימות מתבנית ברירת מחדל יוצגו אוטומטית בכל פרויקט חדש.
              </Text>
              <FormControl>
                <FormLabel>שם התבנית</FormLabel>
                <Input 
                  value={templateName} 
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="הזן שם לתבנית"
                />
              </FormControl>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              לא, תודה
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={onSaveTemplate} 
              mr={3}
              leftIcon={<FaSave />}
              isLoading={isLoading}
              loadingText="שומר..."
            >
              שמור כתבנית ברירת מחדל
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default TemplateDialog; 