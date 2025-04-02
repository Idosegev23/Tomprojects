import React from 'react';
import {
  Flex,
  Heading,
  Text,
  HStack,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  Kbd,
} from '@chakra-ui/react';
import { FiFilter, FiTag } from 'react-icons/fi';
import { GoStack } from "react-icons/go";
import { TaskKanbanHeaderProps } from './types';

const TaskKanbanHeader: React.FC<TaskKanbanHeaderProps> = ({
  viewMode,
  setViewMode,
}) => {
  return (
    <>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">לוח קנבן</Heading>
        <HStack>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              colorScheme={viewMode === 'status' ? 'blue' : 'gray'}
              onClick={() => setViewMode('status')}
              leftIcon={<FiTag />}
            >
              לפי סטטוס
            </Button>
            <Button
              colorScheme={viewMode === 'category' ? 'blue' : 'gray'}
              onClick={() => setViewMode('category')}
              leftIcon={<GoStack />}
            >
              לפי קטגוריה
            </Button>
          </ButtonGroup>
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
      
      <Text fontSize="sm" color="gray.500" mb={4}>
        <Kbd>גרור</Kbd> משימות בין העמודות כדי לשנות את הסטטוס שלהן
      </Text>
    </>
  );
};

export default TaskKanbanHeader; 