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
  Center,
} from '@chakra-ui/react';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { KanbanColumnProps } from './types';
import TaskCard from './TaskCard';

// קומפוננטה מונפשת לעמודה
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

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
}) => {
  return (
    <MotionBox 
      key={id}
      minW={isCollapsed ? "100px" : "300px"}
      w={isCollapsed ? "100px" : "300px"}
      h="100%"
      bg={useColorModeValue('gray.50', 'gray.700')}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isDragOver 
        ? `${color}.500` 
        : useColorModeValue('gray.200', 'gray.600')}
      boxShadow={isDragOver ? "md" : "none"}
      transition="all 0.2s"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      position="relative"
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={isDragOver ? "drop-highlight" : ""}
    >
      <Box 
        p={3} 
        bg={useColorModeValue(`${color}.100`, `${color}.800`)}
        borderTopRadius="md"
        borderBottomWidth="1px"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <Flex justify="space-between" align="center">
          <HStack>
            <Badge colorScheme={color} fontSize="sm" px={2} py={1}>
              {title}
            </Badge>
            <Text fontWeight="bold">{tasks.length}</Text>
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
          className="task-column"
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={false}
              onDragStart={(e, task) => {
                // הפונקציה מועברת מהקומפוננטה האב
              }}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              getProjectName={getProjectName}
            />
          ))}
          
          {tasks.length === 0 && (
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
              bg={isDragOver ? `${color}.100` : "transparent"}
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
                  <Text fontSize="xs" color="gray.400">אין משימות בעמודה זו</Text>
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
            {title} ({tasks.length})
          </Text>
        </Flex>
      )}
    </MotionBox>
  );
};

export default KanbanColumn; 