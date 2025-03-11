import React, { useEffect, useRef } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { Task } from '@/types/supabase';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';

interface TaskGanttProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskDrop?: (taskId: string, newStartDate: string, newEndDate: string) => void;
}

const TaskGantt: React.FC<TaskGanttProps> = ({ tasks, onTaskClick, onTaskDrop }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const bgColor = useColorModeValue('white', 'gray.800');
  
  // פונקציה לקבלת צבע לפי סטטוס
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
      case 'לביצוע':
        return '#CBD5E0'; // gray.300
      case 'in progress':
      case 'בתהליך':
        return '#4299E1'; // blue.400
      case 'review':
      case 'לבדיקה':
        return '#ED8936'; // orange.400
      case 'done':
      case 'הושלם':
        return '#48BB78'; // green.400
      default:
        return '#CBD5E0'; // gray.300
    }
  };
  
  // פונקציה לקבלת צבע לפי עדיפות
  const getPriorityBorderColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'גבוהה':
        return '#E53E3E'; // red.500
      case 'medium':
      case 'בינונית':
        return '#DD6B20'; // orange.500
      case 'low':
      case 'נמוכה':
        return '#38A169'; // green.500
      default:
        return '#718096'; // gray.500
    }
  };
  
  // המרת המשימות לפורמט של FullCalendar
  const getEvents = () => {
    return tasks.map(task => {
      const startDate = task.start_date || task.created_at;
      const endDate = task.due_date || task.start_date || task.created_at;
      
      return {
        id: task.id,
        resourceId: task.id,
        title: task.title,
        start: startDate,
        end: endDate,
        backgroundColor: getStatusColor(task.status),
        borderColor: getPriorityBorderColor(task.priority),
        textColor: '#1A202C', // gray.800
        extendedProps: {
          task: task
        }
      };
    });
  };
  
  // המרת המשימות למשאבים (שורות) בגאנט
  const getResources = () => {
    return tasks.map(task => {
      return {
        id: task.id,
        title: `${task.hierarchical_number || ''} ${task.title}`,
        parentId: task.parent_task_id || undefined
      };
    });
  };
  
  // טיפול באירוע לחיצה על משימה
  const handleEventClick = (info: any) => {
    if (onTaskClick) {
      const task = info.event.extendedProps.task;
      onTaskClick(task);
    }
  };
  
  // טיפול באירוע גרירה של משימה
  const handleEventDrop = (info: any) => {
    if (onTaskDrop) {
      const taskId = info.event.id;
      const newStartDate = info.event.start.toISOString().split('T')[0];
      const newEndDate = info.event.end ? info.event.end.toISOString().split('T')[0] : newStartDate;
      
      onTaskDrop(taskId, newStartDate, newEndDate);
    }
  };
  
  return (
    <Box bg={bgColor} p={4} borderRadius="md" boxShadow="sm" height="600px">
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        תצוגת גאנט
      </Text>
      
      <Box height="calc(100% - 40px)" dir="ltr">
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView="resourceTimeline"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          height="100%"
          resourceAreaWidth="20%"
          resourceAreaHeaderContent="משימות"
          resources={getResources()}
          events={getEvents()}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          resourceOrder="hierarchical_number"
          resourcesInitiallyExpanded={true}
          slotMinWidth={100}
          locale="he"
          direction="rtl"
          buttonText={{
            today: 'היום',
            day: 'יום',
            week: 'שבוע',
            month: 'חודש'
          }}
        />
      </Box>
    </Box>
  );
};

export default TaskGantt; 