import React from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  HStack,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Icon,
  Button,
  Tag,
  TagLabel,
  Avatar,
  Wrap,
  WrapItem,
  CloseButton,
  useBreakpointValue,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { FaCalendarAlt, FaUserCircle, FaUsers } from 'react-icons/fa';
import { ExtendedTask } from './constants';

interface ScheduleTabProps {
  formData: Partial<ExtendedTask>;
  errors: Record<string, string>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  newAssignee: string;
  setNewAssignee: (value: string) => void;
  handleAddAssignee: () => void;
  handleRemoveAssignee: (assignee: string) => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  formData,
  errors,
  handleChange,
  newAssignee,
  setNewAssignee,
  handleAddAssignee,
  handleRemoveAssignee,
}) => {
  // התאמה למובייל - שינוי מספר העמודות בהתאם לגודל המסך
  const columns = useBreakpointValue({ base: 1, md: 2 });
  // התאמת כיוון הסטאק של שדה הוספת המשתתפים בהתאם לגודל המסך
  const stackDirection = useBreakpointValue({ base: "column", md: "row" }) as "column" | "row";
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAssignee();
    }
  };

  return (
    <VStack spacing={4} align="stretch" width="100%">
      <SimpleGrid columns={columns} spacing={4}>
        <FormControl>
          <FormLabel fontWeight="bold">תאריך התחלה</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaCalendarAlt} color="gray.400" />
            </InputLeftElement>
            <Input 
              type="date" 
              name="start_date" 
              value={formData.start_date || ''} 
              onChange={handleChange}
              borderRadius="md"
            />
          </InputGroup>
        </FormControl>
        
        <FormControl isInvalid={!!errors.due_date}>
          <FormLabel fontWeight="bold">תאריך יעד</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaCalendarAlt} color="gray.400" />
            </InputLeftElement>
            <Input 
              type="date" 
              name="due_date" 
              value={formData.due_date || ''} 
              onChange={handleChange}
              borderRadius="md"
            />
          </InputGroup>
          {errors.due_date && <FormErrorMessage>{errors.due_date}</FormErrorMessage>}
        </FormControl>
      </SimpleGrid>
      
      <FormControl>
        <FormLabel fontWeight="bold">אחראי ביצוע</FormLabel>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaUserCircle} color="gray.400" />
          </InputLeftElement>
          <Input 
            name="responsible" 
            value={formData.responsible || ''} 
            onChange={handleChange}
            placeholder="שם האחראי על המשימה"
            borderRadius="md"
          />
        </InputGroup>
      </FormControl>
      
      <FormControl>
        <FormLabel fontWeight="bold">משתתפים</FormLabel>
        <HStack mb={2} flexDirection={stackDirection} spacing={2} alignItems="flex-start">
          <InputGroup flex={1}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaUsers} color="gray.400" />
            </InputLeftElement>
            <Input 
              value={newAssignee} 
              onChange={(e) => setNewAssignee(e.target.value)}
              placeholder="הוסף משתתף"
              borderRadius="md"
              onKeyPress={handleKeyPress}
            />
          </InputGroup>
          <Button
            aria-label="הוסף משתתף"
            leftIcon={<AddIcon />}
            onClick={handleAddAssignee}
            colorScheme="blue"
            size="md"
            width={stackDirection === "column" ? "100%" : "auto"}
            mt={stackDirection === "column" ? 2 : 0}
          >
            הוסף
          </Button>
        </HStack>
        
        {formData.assignees_info && Array.isArray(formData.assignees_info) && formData.assignees_info.length > 0 && (
          <Wrap spacing={2} mt={2}>
            {formData.assignees_info.map((assignee, index) => (
              <WrapItem key={index}>
                <Tag colorScheme="blue" borderRadius="full" size="md">
                  <Avatar
                    src=""
                    name={assignee}
                    size="xs"
                    ml={-1}
                    mr={2}
                  />
                  <TagLabel>{assignee}</TagLabel>
                  <CloseButton 
                    size="sm" 
                    ml={1} 
                    onClick={() => handleRemoveAssignee(assignee)}
                  />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </FormControl>
    </VStack>
  );
};

export default ScheduleTab; 