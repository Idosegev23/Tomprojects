import React, { useState, useEffect } from 'react';
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
  Select,
  Box,
  List,
  ListItem,
  Text,
  InputRightElement,
  Spinner,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FaCalendarAlt, FaUserCircle, FaUsers, FaSearch } from 'react-icons/fa';
import { ExtendedTask } from './constants';
import userService, { UserInfo } from '@/lib/services/userService';

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
  
  // מצב לניהול רשימת המשתמשים
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  
  // טעינת רשימת המשתמשים
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
        
        // אם יש responsible, נמצא את המשתמש המתאים ונגדיר אותו כנבחר
        if (formData.responsible) {
          const user = allUsers.find(u => u.id === formData.responsible || u.email === formData.responsible);
          if (user) {
            setSelectedUser(user);
          }
        }
      } catch (error) {
        console.error('שגיאה בטעינת רשימת המשתמשים:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    loadUsers();
  }, [formData.responsible]);
  
  // חיפוש משתמשים לפי מונח חיפוש
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm) {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
        return;
      }
      
      setIsLoadingUsers(true);
      try {
        const filteredUsers = await userService.searchUsers(searchTerm);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('שגיאה בחיפוש משתמשים:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);
  
  // פונקציה לבחירת משתמש כאחראי
  const handleSelectUser = (user: UserInfo) => {
    setSelectedUser(user);
    
    // עדכון ב-formData - שומרים את ID של המשתמש
    const syntheticEvent = {
      target: {
        name: 'responsible',
        value: user.id
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleChange(syntheticEvent);
    setShowUsersList(false);
    setSearchTerm('');
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAssignee();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && users.length > 0) {
      e.preventDefault();
      handleSelectUser(users[0]);
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
        <Box position="relative">
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Icon as={FaUserCircle} color="gray.400" />
            </InputLeftElement>
            <Input 
              placeholder={selectedUser ? `${selectedUser.fullName || selectedUser.email}` : "חפש אחראי..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={() => setShowUsersList(true)}
              onFocus={() => setShowUsersList(true)}
              onKeyPress={handleSearchKeyPress}
              borderRadius="md"
            />
            <InputRightElement width="3rem">
              {isLoadingUsers ? (
                <Spinner size="sm" color="blue.400" />
              ) : (
                <Icon 
                  as={ChevronDownIcon} 
                  color="gray.400" 
                  cursor="pointer"
                  onClick={() => setShowUsersList(!showUsersList)}
                />
              )}
            </InputRightElement>
          </InputGroup>
          
          {showUsersList && (
            <Box 
              position="absolute" 
              top="100%" 
              left="0" 
              right="0" 
              mt={1}
              bg="white" 
              boxShadow="md" 
              borderRadius="md" 
              maxH="200px" 
              overflow="auto"
              zIndex={10}
              border="1px solid"
              borderColor="gray.200"
            >
              <List spacing={0}>
                {users.length > 0 ? (
                  users.map((user) => (
                    <ListItem 
                      key={user.id} 
                      p={2} 
                      _hover={{ bg: "blue.50" }}
                      cursor="pointer"
                      onClick={() => handleSelectUser(user)}
                      display="flex"
                      alignItems="center"
                    >
                      <Avatar size="xs" name={user.fullName || user.email} src={user.avatar_url} ml={-1} mr={2} />
                      <Text fontWeight="medium">{user.fullName || user.email}</Text>
                      <Text fontSize="sm" color="gray.500" ml={2}>
                        {user.fullName ? user.email : ''}
                      </Text>
                    </ListItem>
                  ))
                ) : (
                  <ListItem p={2} textAlign="center" color="gray.500">
                    {isLoadingUsers ? 'טוען משתמשים...' : 'לא נמצאו משתמשים מתאימים'}
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </Box>
        
        {selectedUser && (
          <Tag 
            colorScheme="blue" 
            borderRadius="full" 
            size="md" 
            mt={2}
          >
            <Avatar
              src={selectedUser.avatar_url}
              name={selectedUser.fullName || selectedUser.email}
              size="xs"
              ml={-1}
              mr={2}
            />
            <TagLabel>
              {selectedUser.fullName || selectedUser.email}
            </TagLabel>
            <CloseButton 
              size="sm" 
              ml={1} 
              onClick={() => {
                setSelectedUser(null);
                const syntheticEvent = {
                  target: {
                    name: 'responsible',
                    value: ''
                  }
                } as React.ChangeEvent<HTMLInputElement>;
                handleChange(syntheticEvent);
              }}
            />
          </Tag>
        )}
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