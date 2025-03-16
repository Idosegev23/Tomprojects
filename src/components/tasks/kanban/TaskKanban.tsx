import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  useColorModeValue,
  Spinner,
  useToast,
  Portal,
  Text,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Task, Stage, Project } from '@/types/supabase';
import { TaskKanbanProps, statuses, statusLabels } from './types';
import { getStatusColor, groupTasksByStatus, groupTasksByStage, groupTasksByCategory } from './utils';
import { TaskKanbanHeader } from './';
import KanbanColumn from './KanbanColumn';

// קומפוננטה מונפשת
const MotionBox = motion(Box);

const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  stages = [],
  projects = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onStageChange,
}) => {
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [groupedByStage, setGroupedByStage] = useState<Record<string, Task[]>>({});
  const [groupedByCategory, setGroupedByCategory] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'status' | 'stage' | 'category'>('status');
  const [ghostCardPosition, setGhostCardPosition] = useState({ x: 0, y: 0 });
  const [showGhostCard, setShowGhostCard] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  const toast = useToast();
  const columnRefs = useRef<Record<string, any>>({});
  
  // פונקציה למציאת שם הפרויקט לפי מזהה
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };
  
  // קבוצות המשימות לפי סטטוס, שלב וקטגוריה
  useEffect(() => {
    // קיבוץ לפי סטטוס
    const grouped = groupTasksByStatus(tasks, statuses);
    setGroupedTasks(grouped);
    
    // קיבוץ לפי שלב
    if (stages.length > 0) {
      const stageIds = stages.map(stage => stage.id);
      const groupedStages = groupTasksByStage(tasks, stageIds);
      setGroupedByStage(groupedStages);
    }
    
    // קיבוץ לפי קטגוריה
    const groupedCategories = groupTasksByCategory(tasks);
    setGroupedByCategory(groupedCategories);
    
    setLoading(false);
  }, [tasks, stages]);
  
  // פונקציה לטיפול בצמצום/הרחבה של עמודה
  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };
  
  // פונקציות לטיפול בגרירה ושחרור
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    // שמירת מזהה המשימה בנתוני הגרירה
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // הגדרת המשימה הנגררת
    setDraggingTask(task);
    setDraggedTaskId(task.id);
    setShowGhostCard(true);
    
    // עדכון מיקום כרטיס הרפאים
    setGhostCardPosition({ x: e.clientX, y: e.clientY });
    
    // הוספת אפקט ויזואלי לאלמנט הנגרר
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
    
    // הגדרת תמונת גרירה שקופה (כדי להסתיר את ברירת המחדל)
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // תמונה שקופה
    e.dataTransfer.setDragImage(img, 0, 0);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // הוספת אפקט מעבר
    e.dataTransfer.dropEffect = 'move';
    
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
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setDragOverStage(null);
    setShowGhostCard(false);
    
    // החזרת האופסיטי של כל האלמנטים לרגיל
    document.querySelectorAll('.task-column [draggable="true"]').forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
    });
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    
    // קבלת מזהה המשימה מנתוני הגרירה
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId || !draggingTask) return;
    
    // איפוס מצב הגרירה
    setDragOverColumn(null);
    setDragOverStage(null);
    setShowGhostCard(false);
    
    try {
      if (viewMode === 'status') {
        // עדכון סטטוס המשימה
        if (draggingTask.status !== targetId) {
          if (onStatusChange) {
            await onStatusChange(taskId, targetId);
          }
          
          toast({
            title: 'סטטוס המשימה עודכן',
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
        }
      } else if (viewMode === 'stage') {
        // עדכון שלב המשימה
        if (draggingTask.stage_id !== targetId) {
          if (onStageChange) {
            await onStageChange(taskId, targetId);
          }
          
          toast({
            title: 'שלב המשימה עודכן',
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
        }
      }
      // לא ניתן לשנות קטגוריה בגרירה, לכן אין טיפול למצב 'category'
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'שגיאה בעדכון המשימה',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // פונקציה לטיפול בתזוזת העכבר בזמן גרירה
  const handleMouseMove = (e: MouseEvent) => {
    if (showGhostCard) {
      setGhostCardPosition({ x: e.clientX, y: e.clientY });
    }
  };
  
  // הוספת מאזין לתזוזת העכבר
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showGhostCard]);
  
  // תצוגת טעינה
  if (loading) {
    return (
      <Flex justify="center" align="center" p={8}>
        <Spinner size="xl" />
      </Flex>
    );
  }
  
  // הכנת הנתונים לתצוגה לפי מצב התצוגה הנבחר
  let columns: { id: string; title: string; tasks: Task[]; color: string }[] = [];
  
  if (viewMode === 'status') {
    // תצוגה לפי סטטוס
    columns = Object.keys(groupedTasks).map(status => ({
      id: status,
      title: statusLabels[status] || status,
      tasks: groupedTasks[status] || [],
      color: getStatusColor(status),
    }));
  } else if (viewMode === 'stage') {
    // תצוגה לפי שלב
    columns = Object.keys(groupedByStage).map(stageId => {
      const stage = stages.find(s => s.id === stageId);
      return {
        id: stageId,
        title: stage ? stage.title : 'לא משויך',
        tasks: groupedByStage[stageId] || [],
        color: 'blue',
      };
    });
  } else if (viewMode === 'category') {
    // תצוגה לפי קטגוריה
    columns = Object.keys(groupedByCategory).map(category => ({
      id: category,
      title: category || 'ללא קטגוריה',
      tasks: groupedByCategory[category] || [],
      color: 'purple',
    }));
  }
  
  // הוספת אנימציה לפעימה
  const pulseAnimation = `
    @keyframes pulse {
      0% {
        opacity: 0.3;
      }
      50% {
        opacity: 0.5;
      }
      100% {
        opacity: 0.3;
      }
    }
    
    @keyframes float {
      0% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-5px);
      }
      100% {
        transform: translateY(0px);
      }
    }
    
    .task-card:hover {
      animation: float 2s ease-in-out infinite;
    }
    
    .drop-highlight {
      box-shadow: 0 0 0 2px var(--chakra-colors-blue-500);
      transform: scale(1.02);
      transition: all 0.2s ease-in-out;
    }
  `;
  
  return (
    <Box>
      <style>{pulseAnimation}</style>
      
      <TaskKanbanHeader 
        viewMode={viewMode}
        setViewMode={setViewMode}
        hasStages={stages.length > 0}
      />
      
      {/* כרטיס רפאים שעוקב אחרי העכבר בזמן גרירה */}
      {showGhostCard && draggingTask && (
        <Portal>
          <MotionBox
            position="fixed"
            top={ghostCardPosition.y + 10}
            left={ghostCardPosition.x + 10}
            zIndex={9999}
            opacity={0.9}
            pointerEvents="none"
            bg={useColorModeValue('white', 'gray.800')}
            p={3}
            borderRadius="md"
            boxShadow="lg"
            borderLeftWidth="4px"
            borderLeftColor={`${getStatusColor(draggingTask.status)}.500`}
            width="250px"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Box>
              <Box fontWeight="bold" fontSize="sm">{draggingTask.title}</Box>
              {draggingTask.description && (
                <Box fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
                  {draggingTask.description}
                </Box>
              )}
            </Box>
          </MotionBox>
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
            <KanbanColumn
              key={status}
              id={status}
              title={statusLabels[status] || status}
              tasks={groupedTasks[status] || []}
              color={getStatusColor(status)}
              isCollapsed={!!collapsedColumns[status]}
              isDragOver={dragOverColumn === status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
              onToggleCollapse={() => toggleColumnCollapse(status)}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              getProjectName={getProjectName}
            />
          ))
        ) : (
          // תצוגה לפי שלבים
          <>
            {stages.map(stage => (
              <KanbanColumn
                key={stage.id}
                id={stage.id}
                title={stage.title}
                tasks={groupedByStage[stage.id] || []}
                color="blue"
                isCollapsed={!!collapsedColumns[stage.id]}
                isDragOver={dragOverStage === stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                onToggleCollapse={() => toggleColumnCollapse(stage.id)}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                getProjectName={getProjectName}
              />
            ))}
            
            {/* עמודה למשימות ללא שלב */}
            <KanbanColumn
              key="unassigned"
              id="unassigned"
              title="ללא שלב"
              tasks={groupedByStage['unassigned'] || []}
              color="gray"
              isCollapsed={!!collapsedColumns['unassigned']}
              isDragOver={dragOverStage === 'unassigned'}
              onDragOver={(e) => handleDragOver(e, 'unassigned')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'unassigned')}
              onToggleCollapse={() => toggleColumnCollapse('unassigned')}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              getProjectName={getProjectName}
            />
          </>
        )}
      </Flex>
    </Box>
  );
};

export default TaskKanban; 