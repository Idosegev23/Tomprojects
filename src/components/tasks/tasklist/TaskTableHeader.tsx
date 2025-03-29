import React from 'react';
import { Flex, Box, Checkbox, Icon, Text } from '@chakra-ui/react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

export type SortField = 'title' | 'hierarchical_number' | 'status' | 'priority' | 'responsible' | 'due_date' | null;
export type SortDirection = 'asc' | 'desc';

interface TaskTableHeaderProps {
  isAllSelected: boolean;
  onSelectAll: (isSelected: boolean) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const TaskTableHeader: React.FC<TaskTableHeaderProps> = ({ 
  isAllSelected, 
  onSelectAll,
  sortField,
  sortDirection,
  onSort
}) => {
  
  // פונקציה להצגת חץ המיון המתאים
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <Icon as={FiChevronUp} ml={1} /> 
      : <Icon as={FiChevronDown} ml={1} />;
  };
  
  // פונקציה ליצירת כותרת עמודה עם אפשרות מיון
  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Flex 
      align="center" 
      cursor="pointer" 
      onClick={() => onSort(field)}
      fontWeight={sortField === field ? "bold" : "medium"}
    >
      <Text>{children}</Text>
      {renderSortIcon(field)}
    </Flex>
  );
  
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
      <Box flex="2">
        <SortableHeader field="title">משימה</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <SortableHeader field="hierarchical_number">מספר</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>משימה ראשית</Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <SortableHeader field="status">סטטוס</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>
        <SortableHeader field="priority">עדיפות</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", lg: "block" }}>
        <SortableHeader field="responsible">אחראי</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", lg: "block" }}>
        <SortableHeader field="due_date">תאריך יעד</SortableHeader>
      </Box>
      <Box flex="1" display={{ base: "none", md: "block" }}>פעולות</Box>
    </Flex>
  );
};

export default TaskTableHeader; 