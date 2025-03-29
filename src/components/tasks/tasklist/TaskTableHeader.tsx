import React from 'react';
import { Flex, Box, Checkbox } from '@chakra-ui/react';

interface TaskTableHeaderProps {
  isAllSelected: boolean;
  onSelectAll: (isSelected: boolean) => void;
}

const TaskTableHeader: React.FC<TaskTableHeaderProps> = ({ isAllSelected, onSelectAll }) => {
  return (
    <Flex
      bg="gray.100"
      p={3}
      borderTopRadius="md"
      fontWeight="bold"
      display={{ base: "none", md: "flex" }}
    >
      <Checkbox
        isChecked={isAllSelected}
        onChange={(e) => onSelectAll(e.target.checked)}
        mr={2}
      />
      <Box flex="2">משימה</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>מספר</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>משימה ראשית</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>שלב</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>סטטוס</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>עדיפות</Box>
      <Box flex="1" display={{ base: "none", lg: "block" }}>אחראי</Box>
      <Box flex="1" display={{ base: "none", lg: "block" }}>תאריך יעד</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>פעולות</Box>
    </Flex>
  );
};

export default TaskTableHeader; 