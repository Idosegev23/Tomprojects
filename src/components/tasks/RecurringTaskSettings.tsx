import React, { useState } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Switch,
  Collapse,
  Select,
  RadioGroup,
  Radio,
  Stack,
  HStack,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Divider,
  useColorModeValue,
  Icon
} from '@chakra-ui/react';
import { FiRepeat } from 'react-icons/fi';

interface RecurringTaskSettings {
  isRecurring: boolean;
  recurrencePattern: string;
  recurrenceInterval: number;
  weekDays?: string[];
  monthDay?: number;
  endType: string;
  occurrences?: number;
  endDate?: string;
}

interface RecurringTaskSettingsProps {
  settings: RecurringTaskSettings;
  onChange: (settings: RecurringTaskSettings) => void;
}

const defaultSettings: RecurringTaskSettings = {
  isRecurring: false,
  recurrencePattern: 'daily',
  recurrenceInterval: 1,
  weekDays: ['sunday'],
  monthDay: 1,
  endType: 'never',
  occurrences: 10,
  endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
};

const RecurringTaskSettings: React.FC<RecurringTaskSettingsProps> = ({
  settings = defaultSettings,
  onChange,
}) => {
  const updateSettings = (update: Partial<RecurringTaskSettings>) => {
    onChange({ ...settings, ...update });
  };

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  
  return (
    <Box 
      bg={bgColor} 
      p={4} 
      borderRadius="md" 
      borderWidth="1px"
      borderColor={settings.isRecurring ? 'purple.200' : 'gray.200'}
    >
      <FormControl display="flex" alignItems="center">
        <Icon as={FiRepeat} mr={2} color="purple.500" />
        <FormLabel htmlFor="is-recurring" mb="0" fontWeight="medium">
          משימה חוזרת
        </FormLabel>
        <Switch
          id="is-recurring"
          colorScheme="purple"
          isChecked={settings.isRecurring}
          onChange={(e) => updateSettings({ isRecurring: e.target.checked })}
        />
      </FormControl>
      
      <Collapse in={settings.isRecurring} animateOpacity>
        <VStack spacing={4} mt={4} align="stretch">
          <FormControl>
            <FormLabel>דפוס חזרה</FormLabel>
            <Select
              value={settings.recurrencePattern}
              onChange={(e) => updateSettings({ recurrencePattern: e.target.value })}
            >
              <option value="daily">יומי</option>
              <option value="weekly">שבועי</option>
              <option value="monthly">חודשי</option>
              <option value="yearly">שנתי</option>
            </Select>
          </FormControl>
          
          <Divider />
          
          {/* הגדרות לפי דפוס */}
          {settings.recurrencePattern === 'daily' && (
            <FormControl>
              <FormLabel>חזור כל</FormLabel>
              <HStack>
                <NumberInput
                  min={1}
                  max={365}
                  value={settings.recurrenceInterval}
                  onChange={(valueString) => updateSettings({ recurrenceInterval: parseInt(valueString) })}
                  width="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text>ימים</Text>
              </HStack>
            </FormControl>
          )}
          
          {settings.recurrencePattern === 'weekly' && (
            <VStack spacing={2} align="stretch">
              <FormControl>
                <FormLabel>חזור כל</FormLabel>
                <HStack>
                  <NumberInput
                    min={1}
                    max={52}
                    value={settings.recurrenceInterval}
                    onChange={(valueString) => updateSettings({ recurrenceInterval: parseInt(valueString) })}
                    width="100px"
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text>שבועות, בימים:</Text>
                </HStack>
              </FormControl>
              
              <HStack spacing={2} flexWrap="wrap">
                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day, index) => (
                  <Box 
                    key={day} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    px={2} 
                    py={1}
                    bg={settings.weekDays?.includes(day) ? 'purple.100' : 'transparent'}
                    color={settings.weekDays?.includes(day) ? 'purple.700' : 'inherit'}
                    fontWeight={settings.weekDays?.includes(day) ? 'bold' : 'normal'}
                    cursor="pointer"
                    onClick={() => {
                      const newWeekDays = settings.weekDays?.includes(day)
                        ? settings.weekDays.filter(d => d !== day)
                        : [...(settings.weekDays || []), day];
                      updateSettings({ weekDays: newWeekDays });
                    }}
                  >
                    {getDayName(day)}
                  </Box>
                ))}
              </HStack>
            </VStack>
          )}
          
          {settings.recurrencePattern === 'monthly' && (
            <FormControl>
              <FormLabel>ביום</FormLabel>
              <HStack>
                <NumberInput
                  min={1}
                  max={31}
                  value={settings.monthDay}
                  onChange={(valueString) => updateSettings({ monthDay: parseInt(valueString) })}
                  width="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text>לחודש, כל</Text>
                <NumberInput
                  min={1}
                  max={12}
                  value={settings.recurrenceInterval}
                  onChange={(valueString) => updateSettings({ recurrenceInterval: parseInt(valueString) })}
                  width="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text>חודשים</Text>
              </HStack>
            </FormControl>
          )}
          
          {settings.recurrencePattern === 'yearly' && (
            <FormControl>
              <FormLabel>חזור כל</FormLabel>
              <HStack>
                <NumberInput
                  min={1}
                  max={10}
                  value={settings.recurrenceInterval}
                  onChange={(valueString) => updateSettings({ recurrenceInterval: parseInt(valueString) })}
                  width="100px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text>שנים</Text>
              </HStack>
            </FormControl>
          )}
          
          <Divider />
          
          {/* הגדרות סיום */}
          <FormControl>
            <FormLabel>סיום חזרה</FormLabel>
            <RadioGroup
              value={settings.endType}
              onChange={(value) => updateSettings({ endType: value })}
            >
              <Stack direction="column" spacing={2}>
                <Radio value="never">לעולם</Radio>
                
                <Radio value="after">
                  <HStack>
                    <Text>אחרי</Text>
                    <NumberInput
                      min={1}
                      max={999}
                      value={settings.occurrences}
                      onChange={(valueString) => updateSettings({ occurrences: parseInt(valueString) })}
                      width="100px"
                      isDisabled={settings.endType !== 'after'}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text>פעמים</Text>
                  </HStack>
                </Radio>
                
                <Radio value="onDate">
                  <HStack>
                    <Text>בתאריך</Text>
                    <Input
                      type="date"
                      value={settings.endDate}
                      onChange={(e) => updateSettings({ endDate: e.target.value })}
                      width="180px"
                      isDisabled={settings.endType !== 'onDate'}
                    />
                  </HStack>
                </Radio>
              </Stack>
            </RadioGroup>
          </FormControl>
        </VStack>
      </Collapse>
    </Box>
  );
};

// פונקציה עזר להמרת שמות ימים לעברית
function getDayName(day: string): string {
  const dayMap: {[key: string]: string} = {
    'sunday': 'א',
    'monday': 'ב',
    'tuesday': 'ג',
    'wednesday': 'ד',
    'thursday': 'ה',
    'friday': 'ו',
    'saturday': 'ש',
  };
  
  return dayMap[day] || day;
}

export default RecurringTaskSettings; 