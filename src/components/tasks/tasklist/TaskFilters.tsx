import React from 'react';
import {
  Box,
  Text,
  Flex,
  HStack,
  Input,
  Select,
  Divider,
  Card,
  CardBody,
  Button,
  InputGroup,
  InputLeftElement,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagLeftIcon,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiFilter, FiX, FiSearch, FiClock, FiActivity, FiStar, FiCheckCircle, FiLayers } from 'react-icons/fi';
import { ExtendedStage } from '@/types/extendedTypes';

interface TaskFiltersProps {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
  stageFilter: string;
  stages: ExtendedStage[];
  
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setPriorityFilter: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setStageFilter: (value: string) => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchTerm,
  statusFilter,
  priorityFilter,
  categoryFilter,
  stageFilter,
  stages,
  setSearchTerm,
  setStatusFilter,
  setPriorityFilter,
  setCategoryFilter,
  setStageFilter
}) => {
  
  // פונקציה לניקוי כל הפילטרים
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setStageFilter('');
  };
  
  return (
    <Card variant="outline" mb={4} boxShadow="sm">
      <CardBody>
        <HStack mb={2} align="center">
          <FiFilter />
          <Text fontWeight="bold">סינון וחיפוש</Text>
        </HStack>
        <Divider mb={3} />
        
        {/* סינון טקסטואלי */}
        <Flex gap={3} mb={4} wrap="wrap">
          <InputGroup flex={{ base: "1", md: "0 0 300px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="חיפוש משימות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          
          <Button 
            size="md"
            variant="outline"
            onClick={clearAllFilters}
            leftIcon={<FiX />}
          >
            נקה סינון
          </Button>
        </Flex>
        
        {/* תגי סינון מהירים - סטטוס */}
        <Box mb={4}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>סינון לפי סטטוס:</Text>
          <Wrap spacing={2}>
            <WrapItem>
              <Tag 
                size="md" 
                variant={statusFilter === '' ? 'solid' : 'outline'} 
                colorScheme="gray" 
                cursor="pointer"
                onClick={() => setStatusFilter('')}
              >
                הכל
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag 
                size="md" 
                variant={statusFilter === 'todo' ? 'solid' : 'outline'} 
                colorScheme="gray" 
                cursor="pointer"
                onClick={() => setStatusFilter('todo')}
              >
                <TagLeftIcon as={FiClock} />
                <TagLabel>לביצוע</TagLabel>
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag 
                size="md" 
                variant={statusFilter === 'in_progress' ? 'solid' : 'outline'} 
                colorScheme="blue" 
                cursor="pointer"
                onClick={() => setStatusFilter('in_progress')}
              >
                <TagLeftIcon as={FiActivity} />
                <TagLabel>בתהליך</TagLabel>
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag 
                size="md" 
                variant={statusFilter === 'review' ? 'solid' : 'outline'} 
                colorScheme="orange" 
                cursor="pointer"
                onClick={() => setStatusFilter('review')}
              >
                <TagLeftIcon as={FiStar} />
                <TagLabel>בבדיקה</TagLabel>
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag 
                size="md" 
                variant={statusFilter === 'done' ? 'solid' : 'outline'} 
                colorScheme="green" 
                cursor="pointer"
                onClick={() => setStatusFilter('done')}
              >
                <TagLeftIcon as={FiCheckCircle} />
                <TagLabel>הושלם</TagLabel>
              </Tag>
            </WrapItem>
          </Wrap>
        </Box>
        
        {/* תגי סינון מהירים - שלבים */}
        {stages.length > 0 && (
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>סינון לפי שלב:</Text>
            <Wrap spacing={2}>
              <WrapItem>
                <Tag 
                  size="md" 
                  variant={stageFilter === '' ? 'solid' : 'outline'} 
                  colorScheme="gray" 
                  cursor="pointer"
                  onClick={() => setStageFilter('')}
                >
                  כל השלבים
                </Tag>
              </WrapItem>
              {stages.map(stage => (
                <WrapItem key={stage.id}>
                  <Tag 
                    size="md" 
                    variant={stageFilter === stage.id ? 'solid' : 'outline'} 
                    colorScheme={stage.color || 'gray'} 
                    cursor="pointer"
                    onClick={() => setStageFilter(stage.id)}
                  >
                    <TagLeftIcon as={FiLayers} />
                    <TagLabel>{stage.title}</TagLabel>
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        )}
        
        {/* פילטרים נוספים */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <Select
            placeholder="סנן לפי עדיפות"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">כל העדיפויות</option>
            <option value="low">נמוכה</option>
            <option value="medium">בינונית</option>
            <option value="high">גבוהה</option>
          </Select>
          
          <Select
            placeholder="סנן לפי קטגוריה"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">כל הקטגוריות</option>
            <option value="פיתוח">פיתוח</option>
            <option value="עיצוב">עיצוב</option>
            <option value="תוכן">תוכן</option>
            <option value="שיווק">שיווק</option>
            <option value="תשתיות">תשתיות</option>
            <option value="אחר">אחר</option>
          </Select>
        </SimpleGrid>
      </CardBody>
    </Card>
  );
};

export default TaskFilters; 