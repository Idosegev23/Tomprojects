import React from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  FormErrorMessage,
  VStack,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Icon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { FaTasks } from 'react-icons/fa';
import { ExtendedTask, PRIORITY_MAP, STATUS_MAP } from './constants';

interface BasicInfoTabProps {
  formData: Partial<ExtendedTask>;
  errors: Record<string, string>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  errors,
  handleChange,
}) => {
  // התאמה למובייל - מספר עמודות בגריד משתנה לפי גודל המסך
  const columns = useBreakpointValue({ base: 1, md: 2 });

  return (
    <VStack spacing={4} align="stretch" width="100%">
      <FormControl isRequired isInvalid={!!errors.title}>
        <FormLabel fontWeight="bold">כותרת</FormLabel>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FaTasks} color="gray.400" />
          </InputLeftElement>
          <Input 
            name="title" 
            value={formData.title || ''} 
            onChange={handleChange} 
            placeholder="הזן כותרת למשימה"
            borderRadius="md"
          />
        </InputGroup>
        {errors.title && <FormErrorMessage>{errors.title}</FormErrorMessage>}
      </FormControl>
      
      <FormControl>
        <FormLabel fontWeight="bold">תיאור</FormLabel>
        <Textarea 
          name="description" 
          value={formData.description || ''} 
          onChange={handleChange} 
          placeholder="הזן תיאור למשימה"
          rows={3}
          borderRadius="md"
        />
      </FormControl>
      
      <SimpleGrid columns={columns} spacing={4}>
        <FormControl>
          <FormLabel fontWeight="bold">סטטוס</FormLabel>
          <Select 
            name="status" 
            value={formData.status || 'todo'} 
            onChange={handleChange}
            borderRadius="md"
          >
            {Object.entries(STATUS_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
        
        <FormControl>
          <FormLabel fontWeight="bold">עדיפות</FormLabel>
          <Select 
            name="priority" 
            value={formData.priority || 'medium'} 
            onChange={handleChange}
            borderRadius="md"
          >
            {Object.entries(PRIORITY_MAP).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>
    </VStack>
  );
};

export default BasicInfoTab; 