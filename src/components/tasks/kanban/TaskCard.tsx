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
  Tag,
  TagLabel,
  TagLeftIcon,
  Avatar,
  AvatarGroup,
  Divider,
  Progress,
  Icon,
} from '@chakra-ui/react';
import { FiMoreVertical, FiEdit, FiTrash2, FiCalendar, FiUser, FiBriefcase, FiClock, FiLink, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { TaskCardProps } from './types';
import { getPriorityColor, getPriorityLabel, formatDate, getDueStatus } from './utils';
import { FaUserAlt } from 'react-icons/fa';

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
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // חישוב אחוז השלמה אם יש תתי-משימות
  const completionPercentage = task.subtasks && task.subtasks.length > 0
    ? Math.round((task.subtasks.filter(st => st.status === 'done').length / task.subtasks.length) * 100)
    : null;

  // פונקציה המחזירה צבע לפי סטטוס המשימה
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'gray';
      case 'in_progress':
        return 'blue';
      case 'review':
        return 'orange';
      case 'done':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('TaskCard: התחלת גרירת משימה', task.id);
    e.stopPropagation();
    
    try {
      // הגדרת נתוני המשימה בפורמטים שונים לתמיכה בדפדפנים שונים
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.setData('application/json', JSON.stringify({
        id: task.id,
        status: task.status,
        title: task.title
      }));
      e.dataTransfer.effectAllowed = 'move';
      
      // הוספת מחלקה ויזואלית
      if (e.currentTarget) {
        e.currentTarget.style.opacity = '0.4';
        e.currentTarget.classList.add('dragging');
      }
      
      // העברה לפונקציית הטיפול של הקומפוננטה האב
      onDragStart(e, task);
    } catch (error) {
      console.error('שגיאה בהגדרת נתוני גרירה:', error);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('TaskCard: סיום גרירת משימה', task.id);
    
    // החזרת הסגנון למצב רגיל
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.classList.remove('dragging');
    }
  };
  
  return (
    <MotionBox
      key={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      p={4}
      borderRadius="md"
      borderLeftWidth="4px"
      borderLeftColor={`${getStatusColor(task.status)}.500`}
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
      draggable={true}
      opacity={isDragging ? 0.4 : 1}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
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
      <Flex direction="column" h="100%" justify="space-between">
        {/* כותרת וסימון המשימה */}
        <Box mb={2}>
          <Flex justify="space-between" align="flex-start">
            <HStack spacing={1} mb={1}>
              {task.hierarchical_number && (
                <Badge mr={1} colorScheme="purple" fontSize="xs">
                  {task.hierarchical_number}
                </Badge>
              )}
              
              <Badge 
                colorScheme={getStatusColor(task.status)} 
                variant="solid" 
                fontSize="xs" 
                borderRadius="full"
                px={2}
              >
                {task.status === 'todo' ? 'לביצוע' : 
                 task.status === 'in_progress' ? 'בתהליך' : 
                 task.status === 'review' ? 'בבדיקה' : 'הושלם'}
              </Badge>
              
              <Badge 
                colorScheme={getPriorityColor(task.priority)} 
                variant={task.priority === 'high' || task.priority === 'urgent' ? "solid" : "subtle"}
                fontSize="xs"
                borderRadius="full"
                px={2}
              >
                {getPriorityLabel(task.priority)}
              </Badge>
            </HStack>
            
            <Menu closeOnSelect={true}>
              <MenuButton
                as={IconButton}
                aria-label="אפשרויות"
                icon={<FiMoreVertical />}
                variant="ghost"
                size="xs"
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
          
          <Text 
            fontWeight="bold" 
            fontSize="md"
            textDecoration={task.status === 'done' ? 'line-through' : 'none'}
            opacity={task.status === 'done' ? 0.7 : 1}
          >
            {task.title}
          </Text>
          
          {task.description && (
            <Text 
              fontSize="sm" 
              color={useColorModeValue("gray.600", "gray.300")} 
              noOfLines={2} 
              mt={1}
              opacity={task.status === 'done' ? 0.7 : 1}
            >
              {task.description}
            </Text>
          )}
        </Box>
        
        {/* מידע על התקדמות ותתי-משימות */}
        {completionPercentage !== null && (
          <Box mb={2}>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontSize="xs" color="gray.500">התקדמות</Text>
              <Text fontSize="xs" fontWeight="bold">{completionPercentage}%</Text>
            </Flex>
            <Progress 
              value={completionPercentage} 
              size="xs" 
              colorScheme={completionPercentage === 100 ? "green" : "blue"} 
              borderRadius="full" 
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              {task.subtasks?.filter(st => st.status === 'done').length || 0}/{task.subtasks?.length || 0} תתי-משימות הושלמו
            </Text>
          </Box>
        )}
        
        {/* פרויקט ותאריך יעד */}
        <Divider my={2} borderColor={borderColor} opacity={0.5} />
        
        {/* חלק תחתון - פרויקט, תאריך יעד ואחראי */}
        <Flex justify="space-between" alignItems="center" mt={2}>
          {/* פרויקט */}
          {task.project_id && (
            <Tooltip label={`פרויקט: ${getProjectName(task.project_id)}`}>
              <Tag 
                size="sm"
                variant="subtle"
                colorScheme="blue"
                borderRadius="full"
              >
                <TagLeftIcon as={FiBriefcase} boxSize={3} />
                <TagLabel fontSize="xs">{getProjectName(task.project_id).substring(0, 10)}{getProjectName(task.project_id).length > 10 ? '...' : ''}</TagLabel>
              </Tag>
            </Tooltip>
          )}
          
          {/* תאריך יעד */}
          {task.due_date && (
            <Tooltip label={`תאריך יעד: ${formatDate(task.due_date)}`}>
              <Tag 
                size="sm"
                colorScheme={dueStatus?.color || 'gray'} 
                variant={dueStatus?.status === 'overdue' ? 'solid' : 'subtle'}
                borderRadius="full"
              >
                <TagLeftIcon as={FiCalendar} boxSize={3} />
                <TagLabel fontSize="xs">{formatDate(task.due_date)}</TagLabel>
              </Tag>
            </Tooltip>
          )}
          
          {/* אחראי */}
          {(task.responsible || (task.assignees_info && Array.isArray(task.assignees_info) && task.assignees_info.length > 0) || 
            (task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0)) && (
            <Tooltip label={task.responsible ? `אחראי: ${task.responsible}` : 
              `מוקצה ל: ${(Array.isArray(task.assignees_info) ? task.assignees_info : 
                          Array.isArray(task.assignees) ? task.assignees : [])?.join(', ')}`}>
              <HStack spacing={1} mt={1}>
                <Icon as={FaUserAlt} boxSize="12px" color="gray.500" />
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {task.responsible || ((Array.isArray(task.assignees_info) ? task.assignees_info : 
                                      Array.isArray(task.assignees) ? task.assignees : []))?.join(', ')}
                </Text>
              </HStack>
            </Tooltip>
          )}
        </Flex>
      </Flex>
    </MotionBox>
  );
};

export default TaskCard; 