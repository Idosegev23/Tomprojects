import React, { useState, useEffect } from 'react';
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
  Collapse,
} from '@chakra-ui/react';
import { FiEdit, FiTrash2, FiCalendar, FiCreditCard, FiChevronDown, FiChevronRight, FiPlay } from 'react-icons/fi';
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
import { TaskWithChildren } from './TaskTable';

interface TaskRowProps {
  task: TaskWithChildren;
  isSelected: boolean;
  borderColor: string;
  hoverBgColor: string;
  onSelect: (taskId: string, isSelected: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  getParentTask: (taskId: string | null) => Task | undefined;
  level: number;
  hasChildren: boolean;
  childTasks?: TaskWithChildren[];
  isLastChild?: boolean;
  expandAll?: boolean; // אפשרות חדשה להרחבה גלובלית
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  isSelected,
  borderColor,
  hoverBgColor,
  onSelect,
  onEdit,
  onDelete,
  getParentTask,
  level = 0,
  hasChildren = false,
  childTasks = [],
  isLastChild = false,
  expandAll = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // עדכון מצב ההרחבה כאשר הפרופ expandAll משתנה
  useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // בדיקה האם המספר ההיררכי הוא מספר שלם (ללא נקודה)
  const isParentTask = (): boolean => {
    if (!task.hierarchical_number) return false;
    
    // וידוא שהערך הוא מחרוזת
    const hierarchicalNumber = String(task.hierarchical_number);
    
    // בדיקה אם המספר ההיררכי הוא מספר שלם
    // המספר צריך להיות מורכב רק מספרות, ללא נקודה
    return /^\d+$/.test(hierarchicalNumber);
  };

  const getLevelBgColor = () => {
    // אם זו משימת אב (המספר ההיררכי הוא מספר שלם), הוסף צבע מיוחד
    if (isParentTask()) {
      if (level === 0) return "rgba(0, 100, 255, 0.05)";
      if (level === 1) return "rgba(100, 100, 255, 0.07)";
      if (level === 2) return "rgba(150, 100, 255, 0.09)";
      return "rgba(180, 150, 255, 0.12)";
    } else {
      // זו תת-משימה, השתמש בצבע שקוף או בהיר יותר
      if (level === 0) return "transparent";
      if (level === 1) return "rgba(0, 0, 0, 0.02)";
      if (level === 2) return "rgba(0, 0, 0, 0.03)";
      return "rgba(0, 0, 0, 0.04)";
    }
  };

  const indentWidth = level * 20;

  // האם להציג את התווית "משימת אב"
  const isTaskParent = isParentTask();

  return (
    <>
      <Flex
        key={task.id}
        p={4}
        pl={`${indentWidth + 16}px`}
        align="center"
        position="relative"
        _hover={{ bg: hoverBgColor }}
        transition="background-color 0.2s"
        borderBottom="1px solid"
        borderBottomColor={borderColor}
        bg={getLevelBgColor()}
        borderLeft={isTaskParent ? "3px solid" : "none"}
        borderLeftColor={isTaskParent ? "blue.300" : "transparent"}
      >
        {level > 0 && (
          <>
            <Box
              position="absolute"
              top="0"
              bottom={isLastChild ? "50%" : "0"}
              left={`${indentWidth - 8}px`}
              width="1px"
              backgroundColor="gray.300"
            />
            <Box
              position="absolute"
              top="50%"
              left={`${indentWidth - 8}px`}
              width="16px"
              height="1px"
              backgroundColor="gray.300"
              transform="translateY(-50%)"
            />
          </>
        )}

        {hasChildren ? (
          <IconButton
            icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
            aria-label={isExpanded ? "כווץ" : "הרחב"}
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            mr={2}
            position="absolute"
            left={`${indentWidth - 6}px`}
            color={isTaskParent ? "blue.500" : "gray.500"}
          />
        ) : (
          <Box width="32px" />
        )}

        <Checkbox
          isChecked={isSelected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          mr={2}
        />
        
        <Box flex={{ base: "1", md: "2" }}>
          <Flex align="center">
            <VStack spacing={0} align="start">
              <Flex align="center">
                <Text 
                  fontWeight={level === 0 ? "bold" : (level === 1 ? "semibold" : "normal")}
                  fontSize={level === 0 ? "md" : (level === 1 ? "sm" : "sm")}
                  textDecoration={task.status === 'done' ? 'line-through' : 'none'}
                  opacity={task.status === 'done' ? 0.7 : 1}
                  onClick={() => onEdit(task)}
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  color={isTaskParent ? "blue.700" : "inherit"}
                >
                  {task.title}
                </Text>
                {isTaskParent && (
                  <Tag size="xs" ml={2} colorScheme="blue" variant="subtle">
                    משימת אב
                  </Tag>
                )}
              </Flex>
              {task.description && (
                <Text 
                  fontSize="xs" 
                  color="gray.600" 
                  noOfLines={1} 
                  mt={1}
                  ml={2}
                >
                  {task.description}
                </Text>
              )}
            </VStack>
          </Flex>
        </Box>
        
        <Box flex="1" display={{ base: "none", md: "block" }}>
          {task.hierarchical_number ? (
            <Flex align="center">
              <Tag size="sm" bgColor="blue.50" color="blue.800" fontSize="xs">
                {isTaskParent && task.displayIndex ? (
                  // הצגת המספור הדינמי ליד המספור המקורי למשימות אב
                  <>{task.displayIndex} (#{task.hierarchical_number})</>
                ) : (
                  // הצגת המספור המקורי בלבד לתתי-משימות
                  <>{task.hierarchical_number}</>
                )}
              </Tag>
              {isTaskParent && task.displayIndex && (
                <Tooltip label="מספור דינמי רציף" placement="top">
                  <Box ml={1} fontSize="xs" color="gray.500" fontStyle="italic">
                    (מספור רציף)
                  </Box>
                </Tooltip>
              )}
            </Flex>
          ) : (
            <Text fontSize="sm" color="gray.500">-</Text>
          )}
        </Box>
        
        <Box flex="1" display={{ base: "none", md: "block" }}>
          <Tag colorScheme={getStatusColor(task.status)} size="md" borderRadius="full">
            <TagLeftIcon as={getStatusIcon(task.status)} />
            <TagLabel>{getStatusText(task.status)}</TagLabel>
          </Tag>
        </Box>
        
        <Box flex="1" display={{ base: "none", md: "block" }}>
          <Tag colorScheme={getPriorityColor(task.priority)} size="md" borderRadius="full">
            <TagLeftIcon as={getPriorityIcon(task.priority)} />
            <TagLabel>{getPriorityText(task.priority)}</TagLabel>
          </Tag>
        </Box>
        
        <Box flex="1" display={{ base: "none", lg: "block" }}>
          {task.responsible ? (
            <Text fontSize="sm">{task.responsible}</Text>
          ) : (
            <Text fontSize="sm" color="gray.500">לא הוקצה</Text>
          )}
        </Box>
        
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

      {hasChildren && (
        <Collapse in={isExpanded} animateOpacity>
          <Box>
            {childTasks.map((childTask, index) => (
              <TaskRow
                key={childTask.id}
                task={childTask}
                isSelected={isSelected}
                borderColor={borderColor}
                hoverBgColor={hoverBgColor}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                getParentTask={getParentTask}
                level={level + 1}
                hasChildren={(childTask.childTasks && childTask.childTasks.length > 0) || false}
                childTasks={childTask.childTasks || []}
                isLastChild={index === childTasks.length - 1}
                expandAll={expandAll}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </>
  );
};

export default TaskRow; 