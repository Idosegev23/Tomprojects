import React from 'react';
import {
  Flex,
  Box,
  Text,
  Tag,
  TagLabel,
  TagLeftIcon,
  IconButton,
  Tooltip,
  Checkbox,
  VStack,
} from '@chakra-ui/react';
import { FiEdit, FiTrash2, FiCalendar, FiCreditCard, FiLayers } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import { TaskWithStage } from './useTaskList';
import { 
  getStatusColor, 
  getStatusIcon, 
  getStatusText, 
  getPriorityColor, 
  getPriorityIcon, 
  getPriorityText, 
  formatDate 
} from './taskUtils';

interface TaskRowProps {
  task: TaskWithStage;
  isSelected: boolean;
  borderColor: string;
  hoverBgColor: string;
  onSelect: (taskId: string, isSelected: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  getParentTask: (taskId: string | null) => Task | undefined;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isSelected,
  borderColor,
  hoverBgColor,
  onSelect,
  onEdit,
  onDelete,
  getParentTask
}) => {
  return (
    <Flex
      key={task.id}
      p={4}
      align="center"
      _hover={{ bg: hoverBgColor }}
      transition="background-color 0.2s"
      borderBottom="1px solid"
      borderBottomColor={borderColor}
    >
      <Checkbox
        isChecked={isSelected}
        onChange={(e) => onSelect(task.id, e.target.checked)}
        mr={2}
      />
      
      {/* כותרת המשימה */}
      <Box flex={{ base: "1", md: "2" }}>
        <Flex align="center">
          {task.parent_task_id && (
            <Box mr={2} borderRight="2px" borderColor="purple.300" height="20px"></Box>
          )}
          <VStack spacing={0} align="start">
            <Text 
              fontWeight="bold"
              textDecoration={task.status === 'done' ? 'line-through' : 'none'}
              opacity={task.status === 'done' ? 0.7 : 1}
            >
              {task.title}
            </Text>
            {task.description && (
              <Text fontSize="sm" color="gray.600" noOfLines={1} mt={1}>
                {task.description}
              </Text>
            )}
          </VStack>
        </Flex>
      </Box>
      
      {/* מספר היררכי */}
      <Box flex="1" display={{ base: "none", md: "block" }}>
        {task.hierarchical_number ? (
          <Tag size="sm" bgColor="blue.50" color="blue.800" fontSize="xs">
            {task.hierarchical_number}
          </Tag>
        ) : (
          <Text fontSize="sm" color="gray.500">-</Text>
        )}
      </Box>
      
      {/* משימה ראשית */}
      <Box flex="1" display={{ base: "none", md: "block" }}>
        {task.parent_task_id ? (
          <Tooltip label={`משימה ראשית: ${getParentTask(task.parent_task_id)?.title || 'לא נמצא'}`}>
            <Tag 
              size="sm" 
              variant="outline" 
              colorScheme="purple"
              cursor="pointer"
              onClick={() => {
                const parentTask = getParentTask(task.parent_task_id);
                if (parentTask) {
                  onEdit(parentTask);
                }
              }}
            >
              <TagLeftIcon as={FiCreditCard} />
              <TagLabel>
                {getParentTask(task.parent_task_id)?.title?.substring(0, 15) || 'משימה ראשית'}
                {getParentTask(task.parent_task_id)?.title && 
                 (getParentTask(task.parent_task_id)?.title?.length || 0) > 15 ? '...' : ''}
              </TagLabel>
            </Tag>
          </Tooltip>
        ) : (
          <Text fontSize="sm" color="gray.500">-</Text>
        )}
      </Box>
      
      {/* שלב */}
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <Tag 
          size="sm" 
          variant="subtle" 
          colorScheme={task.stageColor || "gray"}
        >
          <TagLeftIcon as={FiLayers} />
          <TagLabel>{task.stageName}</TagLabel>
        </Tag>
      </Box>
      
      {/* סטטוס */}
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <Tag colorScheme={getStatusColor(task.status)} size="md" borderRadius="full">
          <TagLeftIcon as={getStatusIcon(task.status)} />
          <TagLabel>{getStatusText(task.status)}</TagLabel>
        </Tag>
      </Box>
      
      {/* עדיפות */}
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <Tag colorScheme={getPriorityColor(task.priority)} size="md" borderRadius="full">
          <TagLeftIcon as={getPriorityIcon(task.priority)} />
          <TagLabel>{getPriorityText(task.priority)}</TagLabel>
        </Tag>
      </Box>
      
      {/* אחראי */}
      <Box flex="1" display={{ base: "none", lg: "block" }}>
        {task.responsible ? (
          <Text fontSize="sm">{task.responsible}</Text>
        ) : (
          <Text fontSize="sm" color="gray.500">לא הוקצה</Text>
        )}
      </Box>
      
      {/* תאריך יעד */}
      <Box flex="1" display={{ base: "none", lg: "block" }}>
        {task.due_date ? (
          <Tag size="md" colorScheme="purple" borderRadius="full">
            <TagLeftIcon as={FiCalendar} />
            <TagLabel>{formatDate(task.due_date)}</TagLabel>
          </Tag>
        ) : (
          <Text fontSize="sm" color="gray.500">לא נקבע</Text>
        )}
      </Box>
      
      {/* פעולות */}
      <Box flex="1" textAlign="end">
        <Tooltip label="ערוך משימה">
          <IconButton
            icon={<FiEdit />}
            aria-label="ערוך משימה"
            colorScheme="blue"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            mr={1}
          />
        </Tooltip>
        <Tooltip label="מחק משימה">
          <IconButton
            icon={<FiTrash2 />}
            aria-label="מחק משימה"
            colorScheme="red"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
          />
        </Tooltip>
      </Box>
    </Flex>
  );
};

export default TaskRow; 