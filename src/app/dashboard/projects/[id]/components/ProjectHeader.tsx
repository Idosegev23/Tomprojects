'use client';

import {
  Flex,
  HStack,
  IconButton,
  Heading,
  Tooltip,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useBreakpointValue,
  useToast
} from '@chakra-ui/react';
import { FiArrowLeft, FiEdit, FiTrash2, FiMoreVertical, FiFolder } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/supabase';
import { useState } from 'react';

interface ProjectHeaderProps {
  project: Project;
  onOpenDeleteDialog: () => void;
  getStatusColor: (status: string | null) => string;
  refetchProject?: () => void;
}

export default function ProjectHeader({ 
  project, 
  onOpenDeleteDialog, 
  getStatusColor,
  refetchProject 
}: ProjectHeaderProps) {
  const router = useRouter();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [isCreatingFolders, setIsCreatingFolders] = useState(false);
  const [foldersCreated, setFoldersCreated] = useState(false);

  // פונקציה ליצירת מבנה תיקיות בדרופבוקס
  const handleCreateDropboxFolders = async () => {
    if (!project?.id) {
      toast({
        title: 'שגיאה',
        description: 'מזהה פרויקט חסר',
        status: 'error',
        duration: 3000,
        isClosable: true,
        id: 'create-folders'
      });
      return;
    }

    setIsCreatingFolders(true);
    toast({
      title: 'בתהליך',
      description: 'יוצר מבנה תיקיות בדרופבוקס...',
      status: 'loading',
      duration: null,
      id: 'create-folders'
    });
    console.log(`Creating Dropbox folders for project: ${project.id}`);
    
    try {
      // קריאה ל-API שיוצר את מבנה התיקיות
      const response = await fetch(`/api/projects/${project.id}/create-dropbox-structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const status = response.status;
      console.log(`API response status: ${status}`);
      
      // קבלת תשובה ב-JSON
      const data = await response.json();
      console.log('API response data:', data);
      
      // בדיקה אם הפעולה הצליחה
      if (response.ok) {
        console.log('Folders created successfully:', data.folders);
        toast({
          title: 'הצלחה',
          description: 'מבנה התיקיות נוצר בהצלחה',
          status: 'success',
          duration: 5000,
          isClosable: true,
          id: 'create-folders'
        });
        
        // עדכון סטטוס כפתור
        setFoldersCreated(true);
        
        // עדכון הפרויקט בממשק אם הפונקציה קיימת
        if (refetchProject) {
          refetchProject();
        }
      } else {
        // במקרה של שגיאה
        console.error('Error creating folders:', data);
        toast({
          title: 'שגיאה',
          description: `שגיאה ביצירת מבנה התיקיות: ${data.details || data.error || 'שגיאה לא ידועה'}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
          id: 'create-folders'
        });
      }
    } catch (error) {
      console.error('Error in handleCreateDropboxFolders:', error);
      toast({
        title: 'שגיאה',
        description: `שגיאה בקריאה ל-API: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
        id: 'create-folders'
      });
    } finally {
      setIsCreatingFolders(false);
    }
  };

  return (
    <Flex 
      direction={{ base: 'column', md: 'row' }} 
      justify="space-between" 
      align={{ base: 'flex-start', md: 'center' }} 
      mb={4} 
      gap={3}
    >
      <HStack spacing={2}>
        <Tooltip label="חזרה לרשימת הפרויקטים">
          <IconButton
            aria-label="חזור לרשימת הפרויקטים"
            icon={<FiArrowLeft />}
            onClick={() => router.push('/dashboard/projects')}
            variant="ghost"
            size="md"
            colorScheme="blue"
          />
        </Tooltip>
        <Heading size={{ base: 'md', md: 'lg' }}>{project.name}</Heading>
        <Tooltip label={`סטטוס: ${project.status || 'לא מוגדר'}`}>
          <Badge 
            colorScheme={getStatusColor(project.status)} 
            fontSize="md" 
            px={2} 
            py={1}
            borderRadius="full"
          >
            {project.status || 'לא מוגדר'}
          </Badge>
        </Tooltip>
      </HStack>
      
      {isMobile ? (
        <Menu closeOnSelect={true}>
          <MenuButton 
            as={IconButton} 
            icon={<FiMoreVertical />} 
            variant="outline"
            aria-label="פעולות נוספות"
          />
          <MenuList>
            <MenuItem 
              icon={<FiEdit />} 
              onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
            >
              ערוך פרויקט
            </MenuItem>
            <MenuItem 
              icon={<FiFolder />} 
              onClick={handleCreateDropboxFolders}
              isDisabled={isCreatingFolders}
            >
              יצירת תיקיות דרופבוקס
            </MenuItem>
            <MenuItem 
              icon={<FiTrash2 />} 
              onClick={onOpenDeleteDialog}
              color="red.500"
            >
              מחק פרויקט
            </MenuItem>
          </MenuList>
        </Menu>
      ) : (
        <HStack>
          <Button
            leftIcon={<FiEdit />}
            size="sm"
            colorScheme="blue"
            onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
          >
            ערוך פרויקט
          </Button>
          <Button
            leftIcon={<FiFolder />}
            size="sm"
            colorScheme="teal"
            onClick={handleCreateDropboxFolders}
            isLoading={isCreatingFolders}
            loadingText="יוצר תיקיות..."
          >
            יצירת תיקיות דרופבוקס
          </Button>
          <Button
            leftIcon={<FiTrash2 />}
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={onOpenDeleteDialog}
          >
            מחק פרויקט
          </Button>
        </HStack>
      )}
    </Flex>
  );
} 