import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  useColorModeValue,
  Spinner,
  useToast,
  Portal,
  Text,
  Kbd,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Project } from '@/types/supabase';
import { TaskKanbanProps, statuses, statusLabels, Task } from './types';
import { 
  getStatusColor, 
  groupTasksByStatus, 
  groupTasksByCategory, 
  processTasksWithParentInfo 
} from './utils';
import TaskKanbanHeader from './TaskKanbanHeader';
import KanbanColumn from './KanbanColumn';

// קומפוננטה מונפשת
const MotionBox = motion(Box);

/**
 * רכיב קנבן למשימות - מציג משימות בצורה ויזואלית לפי סטטוס או קטגוריה
 * עם תמיכה במשימות אב ותתי-משימות
 */
const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  projects = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const [processedTasks, setProcessedTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [groupedByCategory, setGroupedByCategory] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'status' | 'category'>('status');
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
  
  // עיבוד וקיבוץ המשימות לפי סטטוס וקטגוריה
  useEffect(() => {
    // עיבוד המשימות והוספת סימון משימות אב
    const processed = processTasksWithParentInfo(tasks);
    setProcessedTasks(processed);
    
    // קיבוץ לפי סטטוס
    const grouped = groupTasksByStatus(processed, statuses);
    setGroupedTasks(grouped);
    
    // קיבוץ לפי קטגוריה
    const groupedCategories = groupTasksByCategory(processed);
    setGroupedByCategory(groupedCategories);
    
    setLoading(false);
  }, [tasks]);
  
  // פונקציה לטיפול בצמצום/הרחבה של עמודה
  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };
  
  // פונקציות לטיפול בגרירה ושחרור
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    console.log('התחלת גרירה עבור משימה:', task.id, task.title);
    
    // שמירת מזהה המשימה בנתוני הגרירה
    try {
      // הגדרת כמה פורמטים שונים לתמיכה טובה יותר בדפדפנים שונים
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.setData('application/json', JSON.stringify({
        id: task.id,
        status: task.status
      }));
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
        e.currentTarget.classList.add('dragging');
      }
      
      // הגדרת תמונת גרירה שקופה (כדי להסתיר את ברירת המחדל)
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // תמונה שקופה
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch (error) {
      console.error('שגיאה בהתחלת גרירה:', error);
      // איפוס הגרירה במקרה של שגיאה
      handleDragEnd();
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // הוספת אפקט מעבר
    e.dataTransfer.dropEffect = 'move';
    
    setDragOverColumn(columnId);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setDragOverColumn(null);
  };
  
  const handleDragEnd = () => {
    setDraggingTask(null);
    setDraggedTaskId(null);
    setDragOverColumn(null);
    setShowGhostCard(false);
    
    // החזרת האופסיטי של כל האלמנטים לרגיל
    document.querySelectorAll('.task-column [draggable="true"]').forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
    });
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // קבלת מזהה המשימה מנתוני הגרירה
    let taskId;
    let taskData;
    let sourceStatus;
    
    try {
      // קבלת מידע על המשימה מנתוני הדראג אנד דרופ
      taskId = e.dataTransfer.getData('text/plain');
      console.log('נתוני גרירה שהתקבלו:', taskId);
      
      // ניסיון לקרוא את המידע המורחב
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        taskData = JSON.parse(jsonData);
        console.log('נתוני JSON שהתקבלו:', taskData);
      }
      
      // קבלת הסטטוס המקורי של המשימה (אם קיים)
      sourceStatus = e.dataTransfer.getData('source-status');
      console.log('סטטוס מקורי:', sourceStatus);
    } catch (error) {
      console.error('שגיאה בקריאת נתוני גרירה:', error);
    }
    
    // שמירת המשימה הנגררת לפני איפוס המצב
    const currentDraggingTask = draggingTask;
    
    // איפוס מצב הגרירה
    setDragOverColumn(null);
    setShowGhostCard(false);
    
    if (!taskId) {
      console.log('אין מזהה משימה בנתוני הגרירה');
      handleDragEnd();
      return;
    }
    
    try {
      if (viewMode === 'status') {
        // קביעת סטטוס המקור - או מהנתונים שהועברו, או מהמשימה שנגררה, או מה-JSON
        const originalStatus = sourceStatus || (currentDraggingTask?.status) || (taskData && taskData.status);
        console.log(`סטטוס מקורי שזוהה: ${originalStatus}, סטטוס יעד: ${targetId}`);
        
        // עדכון סטטוס המשימה רק אם הסטטוס אכן השתנה
        if (originalStatus !== targetId) {
          console.log(`מעדכן סטטוס של משימה ${taskId} מ-${originalStatus} ל-${targetId}`);
          
          if (onStatusChange) {
            try {
              await onStatusChange(taskId, targetId);
              
              toast({
                title: 'סטטוס המשימה עודכן',
                description: `הסטטוס שונה ל${statusLabels[targetId] || targetId}`,
                status: 'success',
                duration: 2000,
                isClosable: true,
              });
              
              // עדכון רישום בנייה אחרי עדכון מוצלח
              console.log(`עדכון סטטוס משימה ${taskId} הושלם בהצלחה`);
            } catch (updateError) {
              console.error('שגיאה בעדכון סטטוס המשימה:', updateError);
              
              toast({
                title: 'שגיאה בעדכון סטטוס המשימה',
                description: updateError instanceof Error ? updateError.message : 'שגיאה לא ידועה',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
            }
          } else {
            console.log('אין פונקציית onStatusChange - לא מעדכן סטטוס');
          }
        } else {
          console.log('הסטטוס לא השתנה - דילוג על העדכון');
        }
      }
      // לא ניתן לשנות קטגוריה בגרירה
    } catch (error) {
      console.error('שגיאה בעדכון המשימה:', error);
      toast({
        title: 'שגיאה בעדכון המשימה',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      // ודא שהמצב תמיד מנוקה בסוף התהליך
      handleDragEnd();
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
  
  // כרטיס רפאים שעוקב אחרי העכבר בזמן גרירה
  const GhostCard = showGhostCard && draggingTask && (
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
        borderLeftColor={getStatusColor(draggingTask.status) + '.500'}
        width="250px"
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <Text fontWeight="bold" fontSize="sm">{draggingTask.title}</Text>
      </MotionBox>
    </Portal>
  );
  
  return (
    <Box>
      <style>{pulseAnimation}</style>
      
      <TaskKanbanHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      {/* כרטיס רפאים */}
      {GhostCard}
      
      <Flex 
        overflowX="auto" 
        pb={4}
        gap={4}
        h="calc(100vh - 300px)"
        className="kanban-board"
      >
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={column.tasks}
            color={column.color}
            isCollapsed={!!collapsedColumns[column.id]}
            isDragOver={dragOverColumn === column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            onToggleCollapse={() => toggleColumnCollapse(column.id)}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            getProjectName={getProjectName}
          />
        ))}
      </Flex>
    </Box>
  );
};

export default TaskKanban; 