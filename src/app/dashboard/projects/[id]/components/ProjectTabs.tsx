'use client';

import {
  Card,
  CardBody,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  HStack,
  Text,
  Box,
  Icon,
  Heading,
  Button,
  Tooltip
} from '@chakra-ui/react';
import {
  FiList,
  FiColumns,
  FiCalendar,
  FiTrello,
  FiFlag,
  FiPlus,
  FiActivity,
  FiCreditCard
} from 'react-icons/fi';
import TaskList from '@/components/tasks/TaskList';
import TaskKanban from '@/components/tasks/kanban/TaskKanban';
import TaskGantt from '@/components/tasks/TaskGantt';
import TaskTree from '@/components/tasks/TaskTree';
import StageManager from '@/components/stages/StageManager';
import { Stage } from '@/types/supabase';
import { Task as KanbanTask } from '@/components/tasks/kanban/types';

interface ProjectTabsProps {
  tabIndex: number;
  setTabIndex: (index: number) => void;
  projectId: string;
  tasks: KanbanTask[];
  stages: Stage[];
  projectName: string;
  loading: boolean;
  onCreateTask: () => void;
  onTaskCreated: (task: KanbanTask) => void;
  onTaskUpdated: (task: KanbanTask) => void;
  onTaskDeleted: (taskId: string) => void;
  onTaskEdited: (task: KanbanTask) => void;
  onTaskStatusChanged: (taskId: string, status: string) => void;
  onTaskDrop: (taskId: string, newStartDate: string, newEndDate: string) => void;
}

export default function ProjectTabs({
  tabIndex,
  setTabIndex,
  projectId,
  tasks,
  stages,
  projectName,
  loading,
  onCreateTask,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskEdited,
  onTaskStatusChanged,
  onTaskDrop
}: ProjectTabsProps) {
  return (
    <Card variant="outline" shadow="sm" mb={4}>
      <CardBody p={0}>
        <Tabs 
          index={tabIndex} 
          onChange={setTabIndex} 
          variant="enclosed" 
          isLazy
          colorScheme="blue"
        >
          <TabList overflowX="auto" overflowY="hidden">
            <Tooltip label="הצג את כל המשימות כרשימה">
              <Tab><HStack><FiList /><Text>רשימה</Text></HStack></Tab>
            </Tooltip>
            <Tooltip label="הצג משימות לפי שלבים בלוח קנבן">
              <Tab><HStack><FiColumns /><Text>קנבן</Text></HStack></Tab>
            </Tooltip>
            <Tooltip label="הצג לוח זמנים של המשימות">
              <Tab><HStack><FiCalendar /><Text>גאנט</Text></HStack></Tab>
            </Tooltip>
            <Tooltip label="הצג את מבנה המשימות בצורת עץ">
              <Tab><HStack><FiTrello /><Text>עץ</Text></HStack></Tab>
            </Tooltip>
            <Tooltip label="ניהול שלבי הפרויקט">
              <Tab><HStack><FiFlag /><Text>שלבים</Text></HStack></Tab>
            </Tooltip>
          </TabList>
          
          <TabPanels>
            {/* תצוגת רשימה */}
            <TabPanel>
              <Box>
                {tasks.length > 0 ? (
                  <TaskList 
                    projectId={projectId}
                    onTaskCreated={(newTask) => onTaskCreated(newTask as KanbanTask)}
                    onTaskUpdated={(updatedTask) => onTaskUpdated(updatedTask as KanbanTask)}
                    onTaskDeleted={onTaskDeleted}
                  />
                ) : (
                  <Card p={8} textAlign="center" variant="outline">
                    <CardBody>
                      <Icon as={FiCreditCard} w={12} h={12} color="gray.400" mb={4} />
                      <Heading size="md" mb={2}>אין משימות בפרויקט זה</Heading>
                      <Text mb={6} color="gray.500">
                        התחל ליצור משימות כדי לנהל את הפרויקט שלך
                      </Text>
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        onClick={onCreateTask}
                      >
                        צור משימה חדשה
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Box>
            </TabPanel>
            
            {/* תצוגת קנבן */}
            <TabPanel>
              <Box>
                {stages.length > 0 ? (
                  <TaskKanban
                    projectId={projectId}
                    stages={stages as any}
                    tasks={tasks as any}
                    onTaskUpdated={(updatedTask) => onTaskUpdated(updatedTask as KanbanTask)}
                    onTaskDeleted={onTaskDeleted}
                    getProjectName={() => projectName}
                  />
                ) : (
                  <Card p={8} textAlign="center" variant="outline">
                    <CardBody>
                      <Icon as={FiTrello} w={12} h={12} color="gray.400" mb={4} />
                      <Heading size="md" mb={2}>אין שלבים מוגדרים בפרויקט</Heading>
                      <Text mb={6} color="gray.500">
                        יש להגדיר שלבים בפרויקט כדי להציג את המשימות בתצוגת קנבן
                      </Text>
                      <Button
                        leftIcon={<FiFlag />}
                        colorScheme="blue"
                        onClick={() => setTabIndex(4)} // מעבר לטאב של ניהול שלבים
                      >
                        ניהול שלבי פרויקט
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Box>
            </TabPanel>
            
            {/* תצוגת גאנט */}
            <TabPanel>
              <Box>
                {tasks.length > 0 ? (
                  <TaskGantt
                    tasks={tasks as any}
                    onTaskDrop={onTaskDrop}
                  />
                ) : (
                  <Card p={8} textAlign="center" variant="outline">
                    <CardBody>
                      <Icon as={FiActivity} w={12} h={12} color="gray.400" mb={4} />
                      <Heading size="md" mb={2}>אין משימות להצגה בגאנט</Heading>
                      <Text mb={6} color="gray.500">
                        צור משימות עם תאריכי התחלה וסיום כדי להציג אותן בתצוגת גאנט
                      </Text>
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        onClick={onCreateTask}
                      >
                        צור משימה חדשה
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Box>
            </TabPanel>
            
            {/* תצוגת עץ */}
            <TabPanel>
              <TaskTree 
                tasks={tasks as any} 
                projectId={projectId}
                onTaskEdited={onTaskEdited}
                onTaskDeleted={onTaskDeleted}
                onTaskStatusChanged={onTaskStatusChanged}
                loading={loading}
              />
            </TabPanel>
            
            {/* תצוגת שלבים */}
            <TabPanel>
              <Box py={4}>
                <Heading size="md" mb={4}>ניהול שלבי הפרויקט</Heading>
                <Text mb={4} color="gray.600">
                  כאן תוכל לנהל את שלבי הפרויקט - להוסיף שלבים חדשים, לערוך או למחוק שלבים קיימים.
                </Text>
                <StageManager projectId={projectId} showTasks={true} />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
} 