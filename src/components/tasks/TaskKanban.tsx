import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
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
  Spinner,
  useToast,
  Button,
  Collapse,
  SlideFade,
  Divider,
  useDisclosure,
  Portal,
  ButtonGroup,
} from '@chakra-ui/react';
import { FiMoreVertical, FiEdit, FiTrash2, FiCalendar, FiChevronUp, FiChevronDown, FiFilter, FiMaximize, FiMinimize } from 'react-icons/fi';
import { Task, Stage } from '@/types/supabase';
import { motion } from 'framer-motion';

// קומפוננטה מונפשת לכרטיס משימה
const MotionBox = motion(Box);

interface TaskKanbanProps {
  tasks: Task[];
  stages?: Stage[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onStageChange?: (taskId: string, stageId: string) => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  stages = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onStageChange,
}) => {
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [groupedByStage, setGroupedByStage] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'status' | 'stage'>('status');
  const [ghostCardPosition, setGhostCardPosition] = useState({ x: 0, y: 0 });
  const [showGhostCard, setShowGhostCard] = useState(false);
  
  const toast = useToast();
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // הגדרת הסטטוסים האפשריים - חייבים להתאים לאילוצים בבסיס הנתונים
  const statuses = ['todo', 'in_progress', 'review', 'done'];
  
  // מיפוי סטטוסים לתצוגה בעברית
  const statusLabels: Record<string, string> = {
    'todo': 'לביצוע',
    'in_progress': 'בתהליך',
    'review': 'בבדיקה',
    'done': 'הושלם'
  };
  
  // קבוצות המשימות לפי סטטוס
  useEffect(() => {
    const grouped: Record<string, Task[]> = {};
    const groupedStages: Record<string, Task[]> = {};
    
    // יצירת מערך ריק לכל סטטוס
    statuses.forEach(status => {
      grouped[status] = [];
    });
    
    // יצירת מערך ריק לכל שלב
    if (stages.length > 0) {
      stages.forEach(stage => {
        groupedStages[stage.id] = [];
      });
      // מערך למשימות ללא שלב
      groupedStages['unassigned'] = [];
    }
    
    // מיון המשימות לפי סטטוס
    tasks.forEach(task => {
      const status = task.status.toLowerCase();
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        // אם הסטטוס לא קיים, נוסיף אותו לקבוצת ברירת המחדל
        grouped['todo'].push(task);
      }
      
      // מיון המשימות לפי שלב
      if (stages.length > 0) {
        if (task.stage_id && groupedStages[task.stage_id]) {
          groupedStages[task.stage_id].push(task);
        } else {
          // אם אין שלב או השלב לא קיים, נוסיף למשימות ללא שלב
          groupedStages['unassigned'].push(task);
        }
      }
    });
    
    setGroupedTasks(grouped);
    setGroupedByStage(groupedStages);
    setLoading(false);
  }, [tasks, stages]);
  
  // פונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return 'gray';
      case 'in_progress':
      case 'בתהליך':
        return 'blue';
      case 'review':
      case 'לבדיקה':
        return 'orange';
      case 'done':
      case 'הושלם':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  // פונקציה לקבלת צבע לפי עדיפות
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה':
        return 'red';
      case 'medium':
      case 'בינונית':
        return 'orange';
      case 'low':
      case 'נמוכה':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  // פונקציה להמרת תאריך לפורמט מקומי
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא נקבע';
    
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      return 'תאריך לא תקין';
    }
  };
  
  // פונקציה לטיפול בצמצום/הרחבה של עמודה
  const toggleColumnCollapse = (status: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  // פונקציות לטיפול בגרירה ושחרור
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    // שמירת מזהה המשימה בנתוני הגרירה
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // הגדרת המשימה הנגררת
    setDraggingTask(task);
    setShowGhostCard(true);
    
    // עדכון מיקום כרטיס הרפאים
    setGhostCardPosition({ x: e.clientX, y: e.clientY });
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (viewMode === 'status') {
      setDragOverColumn(columnId);
    } else {
      setDragOverStage(columnId);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverStage(null);
  };
  
  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverColumn(null);
    setDragOverStage(null);
    setShowGhostCard(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    
    // קבלת מזהה המשימה מנתוני הגרירה
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (viewMode === 'status') {
      // עדכון סטטוס המשימה
      if (taskId && onStatusChange && draggingTask?.status !== columnId) {
        onStatusChange(taskId, columnId);
      
      // הצגת הודעה למשתמש
      toast({
        title: 'סטטוס המשימה עודכן',
          description: `המשימה עודכנה לסטטוס: ${statusLabels[columnId] || columnId}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
      }
    } else {
      // עדכון שלב המשימה
      if (taskId && onStageChange && draggingTask?.stage_id !== columnId) {
        onStageChange(taskId, columnId);
        
        // מציאת שם השלב להצגה בהודעה
        const stageName = columnId === 'unassigned' 
          ? 'ללא שלב' 
          : stages.find(stage => stage.id === columnId)?.title || columnId;
        
        // הצגת הודעה למשתמש
        toast({
          title: 'שלב המשימה עודכן',
          description: `המשימה הועברה לשלב: ${stageName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
      }
    }
    
    handleDragEnd();
  };
  
  // תצוגת טעינה
  if (loading) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">לוח קנבן</Heading>
        <HStack>
          {stages.length > 0 && (
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                colorScheme={viewMode === 'status' ? 'blue' : 'gray'}
                onClick={() => setViewMode('status')}
              >
                לפי סטטוס
              </Button>
              <Button
                colorScheme={viewMode === 'stage' ? 'blue' : 'gray'}
                onClick={() => setViewMode('stage')}
              >
                לפי שלבים
              </Button>
            </ButtonGroup>
          )}
          <Tooltip label="סנן משימות">
            <IconButton
              aria-label="סנן משימות"
              icon={<FiFilter />}
              size="sm"
              variant="outline"
            />
          </Tooltip>
        </HStack>
      </Flex>
      
      {/* כרטיס רפאים שעוקב אחרי העכבר בזמן גרירה */}
      {showGhostCard && draggingTask && (
        <Portal>
          <Box
            position="fixed"
            top={ghostCardPosition.y + 10}
            left={ghostCardPosition.x + 10}
            zIndex={9999}
            opacity={0.7}
            pointerEvents="none"
            bg="white"
            p={2}
            borderRadius="md"
            boxShadow="lg"
            borderLeftWidth="4px"
            borderLeftColor={`${getPriorityColor(draggingTask.priority)}.500`}
            width="250px"
          >
            <Text fontWeight="bold" fontSize="sm">{draggingTask.title}</Text>
          </Box>
        </Portal>
      )}
      
      <Flex 
        overflowX="auto" 
        pb={4}
        gap={4}
        h="calc(100vh - 300px)"
        className="kanban-board"
      >
        {viewMode === 'status' ? (
          // תצוגה לפי סטטוס
          statuses.map(status => (
          <Box 
            key={status}
            minW={collapsedColumns[status] ? "100px" : "300px"}
            w={collapsedColumns[status] ? "100px" : "300px"}
            h="100%"
            bg={useColorModeValue('gray.50', 'gray.700')}
            borderRadius="md"
            borderWidth="1px"
            borderColor={dragOverColumn === status 
              ? `${getStatusColor(status)}.500` 
              : useColorModeValue('gray.200', 'gray.600')}
            boxShadow={dragOverColumn === status ? "md" : "none"}
            transition="all 0.2s"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            onDragEnd={handleDragEnd}
              ref={(el) => {
                if (columnRefs.current) {
                  columnRefs.current[status] = el;
                }
              }}
          >
            <Box 
              p={3} 
              bg={useColorModeValue(`${getStatusColor(status)}.100`, `${getStatusColor(status)}.800`)}
              borderTopRadius="md"
              borderBottomWidth="1px"
              borderColor={useColorModeValue('gray.200', 'gray.600')}
            >
              <Flex justify="space-between" align="center">
                <HStack>
                  <Badge colorScheme={getStatusColor(status)} fontSize="sm" px={2} py={1}>
                    {statusLabels[status] || status}
                  </Badge>
                  <Text fontWeight="bold">{groupedTasks[status]?.length || 0}</Text>
                </HStack>
                
                <IconButton
                  aria-label={collapsedColumns[status] ? "הרחב עמודה" : "צמצם עמודה"}
                  icon={collapsedColumns[status] ? <FiMaximize size="14px" /> : <FiMinimize size="14px" />}
                  size="xs"
                  variant="ghost"
                  onClick={() => toggleColumnCollapse(status)}
                />
              </Flex>
            </Box>
            
            {!collapsedColumns[status] && (
              <VStack 
                p={2} 
                align="stretch" 
                spacing={2}
                h="calc(100% - 50px)"
                overflowY="auto"
                className="task-column"
              >
                {groupedTasks[status]?.map((task, index) => (
                  <MotionBox
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    p={3}
                    borderRadius="md"
                    borderLeftWidth="4px"
                    borderLeftColor={`${getPriorityColor(task.priority)}.500`}
                      bg={useColorModeValue('white', 'gray.800')}
                    boxShadow="sm"
                      _hover={{ boxShadow: 'md' }}
                    cursor="grab"
                    data-task-id={task.id}
                      draggable="true"
                      onDragStart={(e) => {
                        if (e.type === 'dragstart') {
                          handleDragStart(e as React.DragEvent<HTMLDivElement>, task);
                        }
                      }}
                  >
                    <Flex justify="space-between" align="flex-start">
                      <VStack align="flex-start" spacing={1} flex="1">
                        <Text fontWeight="bold" fontSize="sm">
                          {task.hierarchical_number && `${task.hierarchical_number}. `}{task.title}
                        </Text>
                        
                        {task.description && (
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>
                            {task.description}
                          </Text>
                        )}
                        
                        <HStack spacing={2} mt={1}>
                          {task.due_date && (
                            <Tooltip label={`תאריך יעד: ${formatDate(task.due_date)}`}>
                              <Flex align="center" fontSize="xs" color="gray.500">
                                <FiCalendar style={{ marginLeft: '4px' }} />
                                {formatDate(task.due_date)}
                              </Flex>
                            </Tooltip>
                          )}
                          
                          <Badge colorScheme={getPriorityColor(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
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
                ))}
                
                {groupedTasks[status]?.length === 0 && (
                  <Flex 
                    justify="center" 
                    align="center" 
                    h="100px" 
                    color="gray.500"
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor={dragOverColumn === status ? `${getStatusColor(status)}.300` : "gray.200"}
                    borderRadius="md"
                    transition="all 0.2s"
                    bg={dragOverColumn === status ? `${getStatusColor(status)}.50` : "transparent"}
                  >
                    <Text>גרור משימות לכאן</Text>
                  </Flex>
                )}
              </VStack>
            )}
            
            {collapsedColumns[status] && (
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
                  {statusLabels[status]} ({groupedTasks[status]?.length || 0})
                </Text>
              </Flex>
            )}
          </Box>
          ))
        ) : (
          // תצוגה לפי שלבים
          <>
            {stages.map(stage => (
              <Box 
                key={stage.id}
                minW={collapsedColumns[stage.id] ? "100px" : "300px"}
                w={collapsedColumns[stage.id] ? "100px" : "300px"}
                h="100%"
                bg={useColorModeValue('gray.50', 'gray.700')}
                borderRadius="md"
                borderWidth="1px"
                borderColor={dragOverStage === stage.id 
                  ? "blue.500" 
                  : useColorModeValue('gray.200', 'gray.600')}
                boxShadow={dragOverStage === stage.id ? "md" : "none"}
                transition="all 0.2s"
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragEnd={handleDragEnd}
                ref={(el) => {
                  if (columnRefs.current) {
                    columnRefs.current[stage.id] = el;
                  }
                }}
              >
                <Box 
                  p={3} 
                  bg={useColorModeValue('blue.100', 'blue.800')}
                  borderTopRadius="md"
                  borderBottomWidth="1px"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                >
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                        {stage.title}
                      </Badge>
                      <Text fontWeight="bold">{groupedByStage[stage.id]?.length || 0}</Text>
                    </HStack>
                    
                    <IconButton
                      aria-label={collapsedColumns[stage.id] ? "הרחב עמודה" : "צמצם עמודה"}
                      icon={collapsedColumns[stage.id] ? <FiMaximize size="14px" /> : <FiMinimize size="14px" />}
                      size="xs"
                      variant="ghost"
                      onClick={() => toggleColumnCollapse(stage.id)}
                    />
                  </Flex>
                </Box>
                
                {!collapsedColumns[stage.id] && (
                  <VStack 
                    p={2} 
                    align="stretch" 
                    spacing={2}
                    h="calc(100% - 50px)"
                    overflowY="auto"
                    className="task-column"
                  >
                    {groupedByStage[stage.id]?.map((task, index) => (
                      <MotionBox
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        p={3}
                        borderRadius="md"
                        borderLeftWidth="4px"
                        borderLeftColor={`${getPriorityColor(task.priority)}.500`}
                        bg={useColorModeValue('white', 'gray.800')}
                        boxShadow="sm"
                        _hover={{ boxShadow: 'md' }}
                        cursor="grab"
                        data-task-id={task.id}
                        draggable="true"
                        onDragStart={(e) => {
                          if (e.type === 'dragstart') {
                            handleDragStart(e as React.DragEvent<HTMLDivElement>, task);
                          }
                        }}
                      >
                        <Flex justify="space-between" align="flex-start">
                          <VStack align="flex-start" spacing={1} flex="1">
                            <Text fontWeight="bold" fontSize="sm">
                              {task.hierarchical_number && `${task.hierarchical_number}. `}{task.title}
                            </Text>
                            
                            {task.description && (
                              <Text fontSize="xs" color="gray.500" noOfLines={2}>
                                {task.description}
                              </Text>
                            )}
                            
                            <HStack spacing={2} mt={1}>
                              {task.due_date && (
                                <Tooltip label={`תאריך יעד: ${formatDate(task.due_date)}`}>
                                  <Flex align="center" fontSize="xs" color="gray.500">
                                    <FiCalendar style={{ marginLeft: '4px' }} />
                                    {formatDate(task.due_date)}
                                  </Flex>
                                </Tooltip>
                              )}
                              
                              <Badge colorScheme={getPriorityColor(task.priority)} size="sm">
                                {task.priority}
                              </Badge>
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
                    ))}
                    
                    {groupedByStage[stage.id]?.length === 0 && (
                      <Flex 
                        justify="center" 
                        align="center" 
                        h="100px" 
                        color="gray.500"
                        borderWidth="2px"
                        borderStyle="dashed"
                        borderColor={dragOverStage === stage.id ? "blue.300" : "gray.200"}
                        borderRadius="md"
                        transition="all 0.2s"
                        bg={dragOverStage === stage.id ? "blue.50" : "transparent"}
                      >
                        <Text>גרור משימות לכאן</Text>
                      </Flex>
                    )}
                  </VStack>
                )}
                
                {collapsedColumns[stage.id] && (
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
                      {stage.title} ({groupedByStage[stage.id]?.length || 0})
                    </Text>
                  </Flex>
                )}
              </Box>
            ))}
            
            {/* עמודה למשימות ללא שלב */}
            <Box 
              key="unassigned"
              minW={collapsedColumns['unassigned'] ? "100px" : "300px"}
              w={collapsedColumns['unassigned'] ? "100px" : "300px"}
              h="100%"
              bg={useColorModeValue('gray.50', 'gray.700')}
              borderRadius="md"
              borderWidth="1px"
              borderColor={dragOverStage === 'unassigned' 
                ? "gray.500" 
                : useColorModeValue('gray.200', 'gray.600')}
              boxShadow={dragOverStage === 'unassigned' ? "md" : "none"}
              transition="all 0.2s"
              onDragOver={(e) => handleDragOver(e, 'unassigned')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'unassigned')}
              onDragEnd={handleDragEnd}
              ref={(el) => {
                if (columnRefs.current) {
                  columnRefs.current['unassigned'] = el;
                }
              }}
            >
              <Box 
                p={3} 
                bg={useColorModeValue('gray.100', 'gray.800')}
                borderTopRadius="md"
                borderBottomWidth="1px"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
              >
                <Flex justify="space-between" align="center">
                  <HStack>
                    <Badge colorScheme="gray" fontSize="sm" px={2} py={1}>
                      ללא שלב
                    </Badge>
                    <Text fontWeight="bold">{groupedByStage['unassigned']?.length || 0}</Text>
                  </HStack>
                  
                  <IconButton
                    aria-label={collapsedColumns['unassigned'] ? "הרחב עמודה" : "צמצם עמודה"}
                    icon={collapsedColumns['unassigned'] ? <FiMaximize size="14px" /> : <FiMinimize size="14px" />}
                    size="xs"
                    variant="ghost"
                    onClick={() => toggleColumnCollapse('unassigned')}
                  />
                </Flex>
              </Box>
              
              {!collapsedColumns['unassigned'] && (
                <VStack 
                  p={2} 
                  align="stretch" 
                  spacing={2}
                  h="calc(100% - 50px)"
                  overflowY="auto"
                  className="task-column"
                >
                  {groupedByStage['unassigned']?.map((task, index) => (
                    <MotionBox
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      p={3}
                      borderRadius="md"
                      borderLeftWidth="4px"
                      borderLeftColor={`${getPriorityColor(task.priority)}.500`}
                      bg={useColorModeValue('white', 'gray.800')}
                      boxShadow="sm"
                      _hover={{ boxShadow: 'md' }}
                      cursor="grab"
                      data-task-id={task.id}
                      draggable="true"
                      onDragStart={(e) => {
                        if (e.type === 'dragstart') {
                          handleDragStart(e as React.DragEvent<HTMLDivElement>, task);
                        }
                      }}
                    >
                      <Flex justify="space-between" align="flex-start">
                        <VStack align="flex-start" spacing={1} flex="1">
                          <Text fontWeight="bold" fontSize="sm">
                            {task.hierarchical_number && `${task.hierarchical_number}. `}{task.title}
                          </Text>
                          
                          {task.description && (
                            <Text fontSize="xs" color="gray.500" noOfLines={2}>
                              {task.description}
                            </Text>
                          )}
                          
                          <HStack spacing={2} mt={1}>
                            {task.due_date && (
                              <Tooltip label={`תאריך יעד: ${formatDate(task.due_date)}`}>
                                <Flex align="center" fontSize="xs" color="gray.500">
                                  <FiCalendar style={{ marginLeft: '4px' }} />
                                  {formatDate(task.due_date)}
                                </Flex>
                              </Tooltip>
                            )}
                            
                            <Badge colorScheme={getPriorityColor(task.priority)} size="sm">
                              {task.priority}
                            </Badge>
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
                  ))}
                  
                  {groupedByStage['unassigned']?.length === 0 && (
                    <Flex 
                      justify="center" 
                      align="center" 
                      h="100px" 
                      color="gray.500"
                      borderWidth="2px"
                      borderStyle="dashed"
                      borderColor={dragOverStage === 'unassigned' ? "gray.400" : "gray.200"}
                      borderRadius="md"
                      transition="all 0.2s"
                      bg={dragOverStage === 'unassigned' ? "gray.50" : "transparent"}
                    >
                      <Text>גרור משימות לכאן</Text>
                    </Flex>
                  )}
                </VStack>
              )}
              
              {collapsedColumns['unassigned'] && (
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
                    ללא שלב ({groupedByStage['unassigned']?.length || 0})
                  </Text>
                </Flex>
              )}
            </Box>
          </>
        )}
      </Flex>
    </Box>
  );
};

export default TaskKanban; 