import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useColorModeValue,
  Badge,
  Icon,
  HStack,
  Flex,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  useBreakpointValue,
} from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { FaTasks } from 'react-icons/fa';
import { FiFolder } from 'react-icons/fi';

// הייבוא של הקומפוננטות שיצרנו
import BasicInfoTab from './BasicInfoTab';
import ScheduleTab from './ScheduleTab';
import RelationshipsTab from './RelationshipsTab';
import DropboxTab from './DropboxTab';
import TemplateDialog from './TemplateDialog';

// הייבוא של ההוקים שיצרנו
import { useTaskForm } from './useTaskForm';
import { useTaskFormActions } from './useTaskFormActions';

// הייבוא של הקבועים וסוגי הנתונים
import { TaskEditModalProps, getPriorityColor, getStatusColor, getStatusLabel } from './constants';

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  projectId,
  onTaskCreated,
  onTaskUpdated,
}) => {
  console.log('TaskEditModal רונדר:', { isOpen, task, projectId });
  
  // שימוש בהוק המותאם לניהול הפורם
  const formHook = useTaskForm({
    task,
    projectId,
    onClose,
    onTaskCreated,
    onTaskUpdated
  });
  
  // שימוש בהוק המותאם לפעולות על הפורם
  const formActions = useTaskFormActions({
    formData: formHook.formData,
    isSubtask: formHook.isSubtask,
    potentialParentTasks: formHook.potentialParentTasks,
    selectedParentId: formHook.selectedParentId,
    selectedPath: formHook.selectedPath,
    hierarchyPath: formHook.hierarchyPath,
    isEditMode: formHook.isEditMode,
    loading: formHook.loading,
    task,
    projectId,
    validateForm: formHook.validateForm,
    setLoading: formHook.setLoading,
    setChildTaskOptions: formHook.setChildTaskOptions,
    setSelectedParentId: formHook.setSelectedParentId,
    setFormData: formHook.setFormData,
    setSelectedPath: formHook.setSelectedPath,
    setHierarchyPath: formHook.setHierarchyPath,
    setCreatedTaskData: formHook.setCreatedTaskData,
    setIsTemplateDialogOpen: formHook.setIsTemplateDialogOpen,
    setTemplateName: formHook.setTemplateName,
    setTemplateSaveLoading: formHook.setTemplateSaveLoading,
    onClose,
    onTaskCreated,
    onTaskUpdated,
  });
  
  // צבעי רקע לפי מצב התצוגה החשוכה/בהירה
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // התאמות למובייל
  const modalSize = useBreakpointValue({ base: "full", md: "xl" });
  const modalWidth = useBreakpointValue({ base: "100%", md: "700px" });
  const tabFontSize = useBreakpointValue({ base: "sm", md: "md" });
  const modalPadding = useBreakpointValue({ base: 3, md: 4 });
  const tabsOrientation = useBreakpointValue({ base: "column", md: "horizontal" }) as "horizontal" | "vertical";
  
  // רינדור הכותרת של המודל
  const renderModalHeader = () => (
    <ModalHeader 
      bg={getPriorityColor(formHook.formData.priority || 'medium')} 
      color="white" 
      borderTopRadius="md"
      display="flex"
      alignItems="center"
      p={modalPadding}
    >
      <Icon as={FaTasks} mr={2} />
      {formHook.isEditMode ? 'עריכת משימה' : 'יצירת משימה חדשה'}
      {formHook.isEditMode && (
        <Badge ml={2} colorScheme={getStatusColor(formHook.formData.status || 'todo').split('.')[0]}>
          {getStatusLabel(formHook.formData.status || 'todo')}
        </Badge>
      )}
    </ModalHeader>
  );
  
  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size={modalSize}
        scrollBehavior="inside"
        motionPreset="slideInBottom"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent 
          borderRadius="md" 
          boxShadow="xl"
          maxWidth="95vw"
          width={modalWidth}
          mx={2}
        >
          {renderModalHeader()}
          <ModalCloseButton color="white" />
          
          <ModalBody p={0}>
            <Tabs 
              isFitted 
              variant="enclosed" 
              defaultIndex={0} 
              index={formHook.activeTab} 
              onChange={formHook.setActiveTab}
              orientation={tabsOrientation}
            >
              <TabList mb={4}>
                <Tab 
                  _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}
                  fontSize={tabFontSize}
                >
                  פרטים בסיסיים
                </Tab>
                <Tab 
                  _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}
                  fontSize={tabFontSize}
                >
                  לוח זמנים ואחראים
                </Tab>
                <Tab 
                  _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}
                  fontSize={tabFontSize}
                >
                  קשרים
                </Tab>
                <Tab 
                  _selected={{ fontWeight: "bold", borderBottomWidth: "3px" }}
                  fontSize={tabFontSize}
                >
                  <Icon as={FiFolder} mr={1} />
                  קבצים
                </Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Box p={modalPadding}>
                    <BasicInfoTab 
                      formData={formHook.formData}
                      errors={formHook.errors}
                      handleChange={formHook.handleChange}
                    />
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box p={modalPadding}>
                    <ScheduleTab 
                      formData={formHook.formData}
                      errors={formHook.errors}
                      handleChange={formHook.handleChange}
                      newAssignee={formHook.newAssignee}
                      setNewAssignee={formHook.setNewAssignee}
                      handleAddAssignee={formHook.handleAddAssignee}
                      handleRemoveAssignee={formHook.handleRemoveAssignee}
                    />
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box p={modalPadding}>
                    <RelationshipsTab 
                      formData={formHook.formData}
                      errors={formHook.errors}
                      isSubtask={formHook.isSubtask}
                      handleSubtaskToggle={formHook.handleSubtaskToggle}
                      parentTasks={formHook.parentTasks}
                      childTaskOptions={formHook.childTaskOptions}
                      selectedParentId={formHook.selectedParentId}
                      selectedPath={formHook.selectedPath}
                      hierarchyPath={formHook.hierarchyPath}
                      potentialParentTasks={formHook.potentialParentTasks}
                      handleParentTaskChange={formActions.handleParentTaskChange}
                      handleSubTaskSelection={formActions.handleSubTaskSelection}
                    />
                  </Box>
                </TabPanel>
                <TabPanel>
                  <Box p={modalPadding}>
                    <DropboxTab 
                      formData={formHook.formData}
                      errors={formHook.errors}
                      handleChange={formHook.handleChange}
                      isEditMode={formHook.isEditMode}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          
          <ModalFooter 
            borderTop="1px" 
            borderColor={borderColor} 
            py={3} 
            bg={bgColor}
            flexDirection={{ base: "column", md: "row" }}
          >
            <Flex 
              width="100%" 
              justifyContent="space-between"
              flexDirection={{ base: "column", md: "row" }}
              gap={{ base: 2, md: 0 }}
            >
              <Button 
                variant="ghost" 
                onClick={onClose}
                width={{ base: "100%", md: "auto" }}
                order={{ base: 2, md: 1 }}
              >
                ביטול
              </Button>
              
              <HStack 
                spacing={2} 
                justify={{ base: "stretch", md: "flex-end" }}
                width={{ base: "100%", md: "auto" }}
                order={{ base: 1, md: 2 }}
              >
                {formHook.activeTab > 0 && (
                  <Button 
                    variant="ghost" 
                    mr={2} 
                    onClick={() => formHook.setActiveTab(prev => prev - 1)}
                    width={{ base: "50%", md: "auto" }}
                  >
                    הקודם
                  </Button>
                )}
                
                {formHook.activeTab < 3 ? (
                  <Button 
                    colorScheme="blue" 
                    onClick={() => formHook.setActiveTab(prev => prev + 1)}
                    width={{ base: formHook.activeTab > 0 ? "50%" : "100%", md: "auto" }}
                  >
                    הבא
                  </Button>
                ) : (
                  <Button 
                    colorScheme="blue" 
                    leftIcon={formHook.isEditMode ? <EditIcon /> : <AddIcon />}
                    onClick={formActions.handleSubmit}
                    isLoading={formHook.loading}
                    loadingText={formHook.isEditMode ? "מעדכן..." : "יוצר..."}
                    width={{ base: "100%", md: "auto" }}
                  >
                    {formHook.isEditMode ? "עדכן משימה" : "צור משימה"}
                  </Button>
                )}
              </HStack>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* דיאלוג שאלה האם לשמור כתבנית ברירת מחדל */}
      <TemplateDialog 
        isOpen={formHook.isTemplateDialogOpen}
        onClose={formActions.handleCloseTemplateDialog}
        templateName={formHook.templateName}
        setTemplateName={formHook.setTemplateName}
        onSaveTemplate={formActions.handleSaveAsTemplate}
        isLoading={formHook.templateSaveLoading}
        cancelRef={formActions.cancelRef}
      />
    </>
  );
};

export default TaskEditModal; 