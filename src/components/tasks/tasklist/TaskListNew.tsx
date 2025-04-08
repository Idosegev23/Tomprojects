import React, { useState } from 'react';
import { Box, Heading, Flex, Button, HStack, IconButton, Tooltip, Spinner } from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { Task } from '@/types/supabase';
import { useTaskList } from './useTaskList';
import TaskTable from './TaskTable';
import TaskFilters from './TaskFilters';
import TaskEditModal from '@/components/tasks/TaskEditModal';
import QuickAddTask from '@/components/tasks/QuickAddTask';

interface TaskListProps {
  projectId: string;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  projectId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted
}) => {
  console.log('TaskListNew נטען. projectId:', projectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  
  const {
    tasks,
    stages,
    loading,
    error,
    selectedTasks,
    selectedTask,
    isTaskModalOpen,
    setIsTaskModalOpen,
    setSelectedTask,
    handleCreateTask,
    handleEditTask,
    handleTaskCreated,
    handleTaskUpdated,
    handleDeleteTask,
    handleRefresh,
    handleTaskSelection,
    handleSelectAll,
    handleDeleteSelected,
    getParentTask
  } = useTaskList({
    projectId,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted
  });
  
  console.log('TaskListNew: isTaskModalOpen =', isTaskModalOpen);
  
  // סינון משימות לפי קריטריונים
  const filteredTasks = tasks.filter(task => {
    // סינון לפי חיפוש
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // סינון לפי סטטוס
    const matchesStatus = !statusFilter || task.status === statusFilter;
    
    // סינון לפי עדיפות
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    
    // סינון לפי קטגוריה
    const matchesCategory = !categoryFilter || task.category === categoryFilter;
    
    // סינון לפי שלב
    const matchesStage = !stageFilter || task.stage_id === stageFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesStage;
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" p={8}>
        <Spinner size="xl" thickness="4px" color="blue.500" />
      </Flex>
    );
  }
  
  return (
    <Box>
      {/* כותרת ופעולות */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Heading size="md">רשימת משימות</Heading>
        
        <HStack>
          <Tooltip label="רענן נתונים">
            <IconButton
              icon={<FiRefreshCw />}
              aria-label="רענן נתונים"
              colorScheme="blue"
              variant="outline"
              onClick={handleRefresh}
              isLoading={loading}
              size={{ base: 'sm', md: 'md' }}
            />
          </Tooltip>
          
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={(e) => {
              console.log('לחיצה על כפתור משימה חדשה');
              handleCreateTask();
            }}
            size={{ base: 'sm', md: 'md' }}
            boxShadow="sm"
          >
            משימה חדשה
          </Button>
          
          {selectedTasks.length > 0 && (
            <Button
              leftIcon={<FiTrash2 />}
              colorScheme="red"
              variant="outline"
              onClick={handleDeleteSelected}
              size={{ base: 'sm', md: 'md' }}
            >
              מחק נבחרים ({selectedTasks.length})
            </Button>
          )}
        </HStack>
      </Flex>
      
      {/* הוספת משימה מהירה */}
      <QuickAddTask projectId={projectId} onTaskCreated={handleTaskCreated} />
      
      {/* סינון וחיפוש */}
      <TaskFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        categoryFilter={categoryFilter}
        stageFilter={stageFilter}
        stages={stages}
        setSearchTerm={setSearchTerm}
        setStatusFilter={setStatusFilter}
        setPriorityFilter={setPriorityFilter}
        setCategoryFilter={setCategoryFilter}
        setStageFilter={setStageFilter}
      />
      
      {/* טבלת משימות */}
      <TaskTable
        tasks={filteredTasks}
        selectedTasks={selectedTasks}
        onTaskSelection={handleTaskSelection}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onSelectAll={handleSelectAll}
        onCreateTask={handleCreateTask}
        onRefresh={handleRefresh}
        getParentTask={getParentTask}
        isLoading={loading}
      />
      
      {/* מודל עריכת משימה */}
      <TaskEditModal 
        isOpen={isTaskModalOpen} 
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }} 
        task={selectedTask as any} 
        projectId={projectId}
        onTaskCreated={handleTaskCreated} 
        onTaskUpdated={handleTaskUpdated}
      />
    </Box>
  );
};

export default TaskList; 