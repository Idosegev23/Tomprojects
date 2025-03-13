import React from 'react';
import {
  Box,
  Text,
  Flex,
  Badge,
  useColorModeValue,
  VStack,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from '@chakra-ui/react';
import { FiMoreVertical, FiEdit, FiTrash2, FiCalendar, FiUser, FiBriefcase } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { TaskCardProps } from './types';
import { getPriorityColor, getPriorityLabel, formatDate, getDueStatus } from './utils';

// קומפוננטה מונפשת לכרטיס משימה
const MotionBox = motion(Box);

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragging,
  onDragStart,
  onEditTask,
  onDeleteTask,
  getProjectName,
}) => {
  const dueStatus = getDueStatus(task.due_date);
  
  return (
    <MotionBox
      key={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      p={4}
      borderRadius="md"
      borderLeftWidth="4px"
      borderLeftColor={`${getPriorityColor(task.priority)}.500`}
      bg={useColorModeValue('white', 'gray.800')}
      boxShadow={isDragging ? 'none' : 'sm'}
      _hover={{ 
        boxShadow: 'md',
        transform: 'translateY(-2px)',
        borderLeftWidth: '6px',
        transition: 'all 0.2s ease-in-out'
      }}
      cursor="grab"
      data-task-id={task.id}
      draggable="true"
      opacity={isDragging ? 0.4 : 1}
      onDragStart={(e) => {
        if (e.type === 'dragstart') {
          onDragStart(e as React.DragEvent<HTMLDivElement>, task);
        }
      }}
      position="relative"
      overflow="hidden"
      _before={task.due_date && dueStatus?.status === 'overdue' ? {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        borderWidth: '0 20px 20px 0',
        borderStyle: 'solid',
        borderColor: 'transparent red.500 transparent transparent',
        zIndex: 1
      } : {}}
      className="task-card"
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      minH="120px"
      w="100%"
    >
      <Flex justify="space-between" align="flex-start" h="100%">
        <VStack align="flex-start" spacing={2} flex="1">
          <Text fontWeight="bold" fontSize="md">
            {task.hierarchical_number && (
              <Badge mr={1} colorScheme="purple" fontSize="xs">
                {task.hierarchical_number}
              </Badge>
            )}
            {task.title}
          </Text>
          
          {task.description && (
            <Text fontSize="sm" color="gray.600" noOfLines={2}>
              {task.description}
            </Text>
          )}
          
          <HStack spacing={2} mt={1} flexWrap="wrap">
            {task.project_id && (
              <Tooltip label={`פרויקט: ${getProjectName(task.project_id)}`}>
                <Badge 
                  colorScheme="blue" 
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  <Flex align="center">
                    <FiBriefcase style={{ marginLeft: '4px' }} />
                    {getProjectName(task.project_id)}
                  </Flex>
                </Badge>
              </Tooltip>
            )}
            
            {task.due_date && (
              <Tooltip label={`תאריך יעד: ${formatDate(task.due_date)}`}>
                <Badge 
                  colorScheme={dueStatus?.color || 'gray'} 
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  <Flex align="center">
                    <FiCalendar style={{ marginLeft: '4px' }} />
                    {dueStatus?.text || formatDate(task.due_date)}
                  </Flex>
                </Badge>
              </Tooltip>
            )}
            
            <Badge 
              colorScheme={getPriorityColor(task.priority)} 
              variant="subtle"
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {getPriorityLabel(task.priority)}
            </Badge>
            
            {task.responsible && (
              <Tooltip label={`אחראי: ${task.responsible}`}>
                <Badge 
                  colorScheme="teal" 
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  <Flex align="center">
                    <FiUser style={{ marginLeft: '4px' }} />
                    {task.responsible}
                  </Flex>
                </Badge>
              </Tooltip>
            )}
            
            {task.assignees && task.assignees.length > 0 && (
              <Tooltip label={`מוקצה ל: ${task.assignees.join(', ')}`}>
                <Badge 
                  colorScheme="purple" 
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                >
                  <Flex align="center">
                    <FiUser style={{ marginLeft: '4px' }} />
                    {task.assignees[0]}{task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
                  </Flex>
                </Badge>
              </Tooltip>
            )}
          </HStack>
        </VStack>
        
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="אפשרויות"
            icon={<FiMoreVertical />}
            variant="ghost"
            size="sm"
          />
          <MenuList>
            {onEditTask && (
              <MenuItem 
                icon={<FiEdit />} 
                onClick={() => onEditTask(task)}
              >
                ערוך
              </MenuItem>
            )}
            {onDeleteTask && (
              <MenuItem 
                icon={<FiTrash2 />} 
                onClick={() => onDeleteTask(task.id)}
                color="red.500"
              >
                מחק
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </Flex>
    </MotionBox>
  );
};

export default TaskCard; 