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
  useBreakpointValue
} from '@chakra-ui/react';
import { FiArrowLeft, FiEdit, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/supabase';

interface ProjectHeaderProps {
  project: Project;
  onOpenDeleteDialog: () => void;
  getStatusColor: (status: string | null) => string;
}

export default function ProjectHeader({ project, onOpenDeleteDialog, getStatusColor }: ProjectHeaderProps) {
  const router = useRouter();
  const isMobile = useBreakpointValue({ base: true, md: false });

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