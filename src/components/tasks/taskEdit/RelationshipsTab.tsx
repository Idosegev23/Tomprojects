import React from 'react';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  VStack,
  Select,
  Switch,
  Box,
  Text,
  Flex,
  Icon,
  Tag,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FaChevronLeft } from 'react-icons/fa';
import { Task } from '@/types/supabase';
import { ExtendedTask, getStatusLabel, sortTasksByHierarchicalNumber } from './constants';

interface RelationshipsTabProps {
  formData: Partial<ExtendedTask>;
  errors: Record<string, string>;
  isSubtask: boolean;
  handleSubtaskToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  parentTasks: Task[];
  childTaskOptions: Task[];
  selectedParentId: string | null;
  selectedPath: string[];
  hierarchyPath: Array<{id: string, title: string}>;
  potentialParentTasks: Task[];
  handleParentTaskChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubTaskSelection: (level: number, taskId: string) => void;
}

const RelationshipsTab: React.FC<RelationshipsTabProps> = ({
  formData,
  errors,
  isSubtask,
  handleSubtaskToggle,
  parentTasks,
  childTaskOptions,
  selectedParentId,
  selectedPath,
  hierarchyPath,
  potentialParentTasks,
  handleParentTaskChange,
  handleSubTaskSelection,
}) => {
  // התאמה למובייל - רווח בהתאם לגודל המסך
  const spacing = useBreakpointValue({ base: 3, md: 4 });
  const fontSize = useBreakpointValue({ base: "sm", md: "md" });
  const infoBoxPadding = useBreakpointValue({ base: 2, md: 3 });

  return (
    <VStack spacing={spacing} align="stretch" width="100%">
      <Box mb={spacing}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>קשרים היררכיים</Text>
        <Text fontSize={fontSize} color="gray.600">
          משימות יכולות להיות מסודרות בצורה היררכית. בחר משימת אב ואז תוכל לבחור גם תת-משימה מתוך הרשימה אם קיימות תתי-משימות.
        </Text>
      </Box>
      
      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0} htmlFor="subtask-toggle" fontWeight="bold">
          הגדר כתת-משימה
        </FormLabel>
        <Switch 
          id="subtask-toggle"
          isChecked={isSubtask} 
          onChange={handleSubtaskToggle}
          colorScheme="blue"
        />
      </FormControl>
      
      {isSubtask && (
        <>
          {/* בחירת משימת אב */}
          <FormControl isInvalid={!!errors.parent_task_id}>
            <FormLabel fontWeight="bold">משימת אב</FormLabel>
            {parentTasks.length > 0 ? (
              <Select 
                name="parent_task_id"
                value={selectedParentId || ''} 
                onChange={handleParentTaskChange}
                placeholder="בחר משימת אב"
                borderRadius="md"
              >
                <option value="">בחר משימת אב</option>
                {parentTasks.map(parentTask => (
                  <option key={parentTask.id} value={parentTask.id}>
                    {parentTask.hierarchical_number ? `${parentTask.hierarchical_number} - ` : ''}
                    {parentTask.title}
                    {parentTask.status && ` (${getStatusLabel(parentTask.status)})`}
                  </option>
                ))}
              </Select>
            ) : (
              <Text color="orange.500" mt={2}>
                אין משימות שיכולות לשמש כמשימות אב. צור קודם משימות ראשיות.
              </Text>
            )}
            {errors.parent_task_id && <FormErrorMessage>{errors.parent_task_id}</FormErrorMessage>}
          </FormControl>
          
          {/* תצוגת מסלול היררכיה */}
          {hierarchyPath.length > 0 && (
            <Box mt={2} mb={2}>
              <Text fontSize={fontSize} fontWeight="medium" mb={1}>מסלול היררכיה:</Text>
              <Flex wrap="wrap" gap={1} alignItems="center">
                {hierarchyPath.map((item, index) => (
                  <React.Fragment key={item.id || index}>
                    {index > 0 && <Icon as={FaChevronLeft} color="gray.500" fontSize="xs" />}
                    <Tag 
                      size={fontSize === "sm" ? "sm" : "md"}
                      colorScheme={index === hierarchyPath.length - 1 ? "blue" : "gray"}
                      variant={index === hierarchyPath.length - 1 ? "solid" : "subtle"}
                    >
                      {item.title}
                    </Tag>
                  </React.Fragment>
                ))}
              </Flex>
            </Box>
          )}
          
          {/* בחירת תת-משימה אם יש משימת אב נבחרת */}
          {selectedParentId && (
            <FormControl mt={3}>
              <FormLabel fontWeight="bold">
                תת-משימה {childTaskOptions.length === 0 ? '(אין תתי-משימות זמינות)' : '(אופציונלי)'}
              </FormLabel>
              <Select
                value={selectedPath[0] || ''}
                onChange={(e) => handleSubTaskSelection(0, e.target.value)}
                placeholder="בחר תת-משימה (אופציונלי)"
                borderRadius="md"
                isDisabled={childTaskOptions.length === 0}
              >
                <option value="">השאר תחת המשימה הראשית</option>
                {childTaskOptions.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.hierarchical_number ? `${task.hierarchical_number} - ` : ''}
                    {task.title}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {childTaskOptions.length > 0 
                  ? "בחר תת-משימה אם ברצונך למקם את המשימה החדשה תחתיה במקום תחת המשימה הראשית" 
                  : "אין תתי-משימות למשימה זו. המשימה החדשה תהיה תת-משימה ישירה של המשימה הראשית"}
              </Text>
            </FormControl>
          )}
          
          {/* שדה בחירה רקורסיבי עבור תתי-משימות ברמה השנייה */}
          {selectedPath.length > 0 && selectedPath[0] && (
            <FormControl mt={3}>
              <FormLabel fontWeight="bold">תת-משימה נוספת (אופציונלי)</FormLabel>
              <Select
                value={selectedPath[1] || ''}
                onChange={(e) => handleSubTaskSelection(1, e.target.value)}
                placeholder="בחר תת-משימה נוספת (אופציונלי)"
                borderRadius="md"
              >
                <option value="">השאר תחת התת-משימה הנוכחית</option>
                {potentialParentTasks
                  .filter(task => task.parent_task_id === selectedPath[0])
                  .sort(sortTasksByHierarchicalNumber)
                  .map(task => (
                    <option key={task.id} value={task.id}>
                      {task.hierarchical_number ? `${task.hierarchical_number} - ` : ''}
                      {task.title}
                    </option>
                  ))}
              </Select>
              <Text fontSize="sm" color="gray.500" mt={1}>
                בחר תת-משימה נוספת אם ברצונך למקם את המשימה החדשה עמוק יותר בהיררכיה
              </Text>
            </FormControl>
          )}
          
          <Box 
            mt={4} 
            p={infoBoxPadding} 
            bg="blue.50" 
            borderRadius="md" 
            borderWidth="1px" 
            borderColor="blue.200"
          >
            <Text fontSize={fontSize} fontWeight="medium" color="blue.700">
              <strong>הערה:</strong> המספור ההיררכי ייווצר אוטומטית בהתאם למשימת האב או תת-המשימה שנבחרה.
            </Text>
            <Text fontSize="sm" color="blue.600" mt={1}>
              המשימה החדשה תמוקם תחת המשימה האחרונה שבחרת במסלול ההיררכיה.
            </Text>
          </Box>
        </>
      )}
    </VStack>
  );
};

export default RelationshipsTab; 