import React, { ReactNode } from 'react';
import {
  Box,
  Text,
  Flex,
  Badge,
  useColorModeValue,
  VStack,
  HStack,
  IconButton,
  Center,
  Heading,
  Button
} from '@chakra-ui/react';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { KanbanColumnProps } from './types';
import TaskCard from './TaskCard';
import { AddIcon } from '@chakra-ui/icons';

// קומפוננטה מונפשת
const MotionFlex = motion(Flex);

/**
 * עמודת קנבן למשימות
 */
const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  color,
  isCollapsed,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleCollapse,
  onEditTask,
  onDeleteTask,
  getProjectName,
  onAddTask,
  children
}) => {
  // קריאות ל-hooks - חייבות להיות באותו סדר בכל רנדור!
  const bgColor = useColorModeValue(`${color}.100`, `${color}.800`);
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const emptyAreaBg = useColorModeValue('gray.50', 'gray.700');
  const boxBg = useColorModeValue('gray.50', 'gray.700');
  const boxBorderColor = useColorModeValue('gray.200', 'gray.600');
  const parentBoxBg = useColorModeValue('purple.50', 'purple.900');
  
  // מיון המשימות: משימות אב בראש, ולאחר מכן לפי מספר היררכי
  const sortedTasks = tasks ? [...tasks].sort((a, b) => {
    // אם יש לשניהם מספר היררכי, מיון לפי הסדר הטבעי
    if (a.hierarchical_number && b.hierarchical_number) {
      return String(a.hierarchical_number).localeCompare(String(b.hierarchical_number), undefined, { numeric: true });
    }
    
    // אם רק לאחד יש מספר היררכי, הוא יופיע קודם
    if (a.hierarchical_number && !b.hierarchical_number) return -1;
    if (!a.hierarchical_number && b.hierarchical_number) return 1;
    
    // אם לאף אחד אין מספר היררכי, מיון לפי כותרת
    return a.title.localeCompare(b.title);
  }) : [];
  
  // קבלת משימות אב למיוחס ויזואלית
  const parentTasks = sortedTasks.filter(task => task.isParentTask);
  const childTasks = sortedTasks.filter(task => !task.isParentTask);
  
  return (
    <Box
      minW={isCollapsed ? "100px" : "300px"}
      w={isCollapsed ? "100px" : "300px"}
      h="100%"
      bg={boxBg}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isDragOver ? `${color}.500` : boxBorderColor}
      boxShadow={isDragOver ? "md" : "none"}
      transition="all 0.2s"
      onDragOver={(e) => {
        e.preventDefault(); // חשוב מאוד לאפשר את הdrop
        e.stopPropagation();
        console.log(`עמודה ${id}: גרירת אובייקט מעל העמודה`);
        if (onDragOver) onDragOver(e);
      }}
      onDragEnter={(e) => {
        e.preventDefault(); // מניעת ברירת המחדל חשובה גם כאן
        e.stopPropagation();
        console.log(`עמודה ${id}: כניסת אובייקט לעמודה`);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`עמודה ${id}: יציאת אובייקט מהעמודה`);
        if (onDragLeave) onDragLeave(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`עמודה ${id}: שחרור אובייקט בעמודה`);
        if (onDrop) onDrop(e);
      }}
      position="relative"
      className={isDragOver ? "drop-highlight column-droppable" : "column-droppable"}
      data-column-id={id}
      _after={isDragOver ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'md',
        borderWidth: '2px',
        borderStyle: 'dashed',
        borderColor: `${color}.500`,
        pointerEvents: 'none',
        zIndex: 1
      } : {}}
    >
      <Box 
        p={3} 
        bg={bgColor}
        borderTopRadius="md"
        borderBottomWidth="1px"
        borderColor={borderColor}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`עמודה ${id} (כותרת): גרירת אובייקט מעל הכותרת`);
          if (onDragOver) onDragOver(e);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`עמודה ${id} (כותרת): כניסת אובייקט לכותרת`);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`עמודה ${id} (כותרת): שחרור אובייקט בכותרת`);
          if (onDrop) onDrop(e);
        }}
        className="column-header droppable-area"
        data-column-id={id}
      >
        <Flex justify="space-between" align="center">
          <HStack>
            <Badge colorScheme={color} fontSize="sm" px={2} py={1}>
              {title}
            </Badge>
            <Text fontWeight="bold">{tasks?.length || 0}</Text>
          </HStack>
          
          <IconButton
            aria-label={isCollapsed ? "הרחב עמודה" : "צמצם עמודה"}
            icon={isCollapsed ? <FiMaximize size="14px" /> : <FiMinimize size="14px" />}
            size="xs"
            variant="ghost"
            onClick={onToggleCollapse}
          />
        </Flex>
      </Box>
      
      {!isCollapsed ? (
        <VStack 
          p={2} 
          align="stretch" 
          spacing={2}
          h="calc(100% - 50px)"
          overflowY="auto"
          className="task-column droppable-area"
          data-column-id={id}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`עמודה ${id} (תוכן): גרירת אובייקט מעל התוכן`);
            if (onDragOver) onDragOver(e);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`עמודה ${id} (תוכן): כניסת אובייקט לתוכן`);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`עמודה ${id} (תוכן): שחרור אובייקט בתוכן`);
            if (onDrop) onDrop(e);
          }}
        >
          {/* משימות אב */}
          {parentTasks.map(task => (
            <Box 
              key={task.id}
              bg={parentBoxBg}
              borderRadius="md"
              p={1}
            >
              <TaskCard
                task={task}
                isDragging={false}
                onDragStart={(e, t) => {
                  const customEvent = e as React.DragEvent<HTMLDivElement>;
                  customEvent.dataTransfer.setData('text/plain', t.id);
                  customEvent.dataTransfer.effectAllowed = 'move';
                }}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                getProjectName={getProjectName}
              />
            </Box>
          ))}

          {/* משימות רגילות */}
          {childTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={false}
              onDragStart={(e, t) => {
                const customEvent = e as React.DragEvent<HTMLDivElement>;
                customEvent.dataTransfer.setData('text/plain', t.id);
                customEvent.dataTransfer.effectAllowed = 'move';
              }}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              getProjectName={getProjectName}
            />
          ))}
          
          {tasks?.length === 0 && (
            <MotionFlex 
              justify="center" 
              align="center" 
              h="100px" 
              color="gray.500"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={isDragOver ? `${color}.500` : "gray.200"}
              borderRadius="md"
              transition="all 0.2s"
              bg={isDragOver ? `${color}.100` : emptyAreaBg}
              position="relative"
              _after={isDragOver ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 'md',
                background: `${color}.100`,
                opacity: 0.3,
                animation: 'pulse 1.5s infinite',
                pointerEvents: 'none'
              } : {}}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Center flexDirection="column">
                <Text fontWeight={isDragOver ? "bold" : "normal"} mb={2}>
                  {isDragOver ? "שחרר כאן" : "גרור משימות לכאן"}
                </Text>
                {!isDragOver && (
                  <Text fontSize="xs" color="gray.400">אין משימות בסטטוס זה</Text>
                )}
              </Center>
            </MotionFlex>
          )}
        </VStack>
      ) : (
        <Flex 
          direction="column" 
          justify="center" 
          align="center" 
          h="calc(100% - 50px)"
          py={4}
        >
          <Text 
            transform="rotate(-90deg)" 
            fontWeight="bold" 
            color="gray.500"
            whiteSpace="nowrap"
          >
            {title} ({tasks?.length || 0})
          </Text>
        </Flex>
      )}
    </Box>
  );
};

export default KanbanColumn; 