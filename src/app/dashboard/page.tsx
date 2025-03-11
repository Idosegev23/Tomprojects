'use client';

import React from 'react';
import { 
  Box, 
  SimpleGrid, 
  Heading, 
  Text, 
  Flex, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  Card, 
  CardBody,
  CardHeader,
  Icon
} from '@chakra-ui/react';
import { FiUsers, FiFolder, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';

export default function Dashboard() {
  return (
    <Box>
      <Heading mb={6}>דאשבורד</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={8}>
        <StatCard 
          title="פרויקטים פעילים" 
          value={12} 
          helpText="↑ 3 מהחודש שעבר" 
          icon={FiFolder} 
          color="blue.500" 
        />
        <StatCard 
          title="משימות פתוחות" 
          value={48} 
          helpText="↓ 12 מהשבוע שעבר" 
          icon={FiCheckSquare}
          color="green.500" 
        />
        <StatCard 
          title="משימות באיחור" 
          value={5} 
          helpText="↑ 2 מהשבוע שעבר" 
          icon={FiAlertCircle}
          color="red.500" 
        />
        <StatCard 
          title="חברי צוות" 
          value={8} 
          helpText="ללא שינוי" 
          icon={FiUsers}
          color="purple.500" 
        />
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">פרויקטים אחרונים</Heading>
          </CardHeader>
          <CardBody>
            <Text>פה יוצגו הפרויקטים האחרונים שנוספו או עודכנו</Text>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <Heading size="md">משימות למעקב</Heading>
          </CardHeader>
          <CardBody>
            <Text>פה יוצגו המשימות הקרובות או הדורשות טיפול</Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  helpText?: string;
  icon: any;
  color: string;
}

function StatCard({ title, value, helpText, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Stat>
              <StatLabel>{title}</StatLabel>
              <StatNumber>{value}</StatNumber>
              {helpText && <StatHelpText>{helpText}</StatHelpText>}
            </Stat>
          </Box>
          <Box>
            <Flex 
              w="48px" 
              h="48px" 
              bg={`${color}10`} 
              color={color} 
              borderRadius="full" 
              justifyContent="center" 
              alignItems="center"
            >
              <Icon as={icon} boxSize="24px" />
            </Flex>
          </Box>
        </Flex>
      </CardBody>
    </Card>
  );
} 