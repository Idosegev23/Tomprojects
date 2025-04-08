import supabase from '../supabase';
import { Task, NewTask, UpdateTask, TaskWithChildren } from '@/types/supabase';
import dropboxService from './dropboxService';
import { ExtendedTask } from '@/types/extendedTypes';
import { sanitizePath } from '@/utils/sanitizePath';
import { PROJECTS_PATH } from '@/config/config';

// תיעוד פעולות בקובץ build_tracking
async function updateBuildTracking(message: string) {
  try {
    console.log(`Build tracking: ${message}`);
    // ניתן להוסיף כאן קוד לתיעוד פעולות בקובץ או בבסיס נתונים
  } catch (error) {
    console.error('Error updating build tracking:', error);
  }
}

export const taskService = {
  // קריאת כל המשימות (גלובליות או לפי פרויקט)
  async getTasks(filters?: { projectId?: string, status?: string, category?: string }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    } else {
      // ברירת מחדל: החזר רק משימות גלובליות (ללא project_id)
      query = query.is('project_id', null);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  // קריאת משימה אחת לפי מזהה
  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching task with id ${id}:`, error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      console.error(`Error in getTaskById for task ${id}:`, err);
      return null;
    }
  },

  // פונקציה להסרת שדות שאינם חלק מהטבלה
  async removeNonExistingFields(task: any, forProjectTable: boolean = false): Promise<any> {
    const mainTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'estimated_hours', 'actual_hours',
      'start_date', 'due_date', 'completed_date', 'budget', 'dependencies',
      'assignees_info', 'watchers', 'labels', 'deleted', 'created_at',
      'updated_at', 'hierarchical_number', 'parent_task_id', 'is_template',
      'is_global_template', 'original_task_id', 'dropbox_folder' // Added dropbox_folder
    ];
    const projectTableFields = [
      'id', 'project_id', 'stage_id', 'title', 'description', 'category',
      'status', 'priority', 'responsible', 'due_date', 'assignees_info',
      'created_at', 'updated_at', 'hierarchical_number', 'parent_task_id',
      'dropbox_folder' // Added dropbox_folder
    ];
    const validFields = forProjectTable ? projectTableFields : mainTableFields;
    const cleanedTask = { ...task };
    for (const key in cleanedTask) {
      if (!validFields.includes(key)) {
        delete cleanedTask[key];
      }
    }
    return cleanedTask;
  },

  // קריאת משימות לפי שלב ופרויקט (אופציונלי)
  async getTasksByStage(stageId: string, projectId?: string): Promise<Task[]> {
    try {
      let query = supabase.from('tasks').select('*').eq('stage_id', stageId);
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      const { data, error } = await query.order('hierarchical_number', { ascending: true });
      if (error) {
        console.error(`Error fetching tasks for stage ${stageId}${projectId ? ` in project ${projectId}` : ''}:`, error);
        throw new Error(error.message);
      }
      return data || [];
    } catch (err) {
      console.error(`Error in getTasksByStage for stage ${stageId}:`, err);
      throw err;
    }
  },

  // קריאת משימות ספציפיות לפרויקט
  async getProjectSpecificTasks(projectId: string): Promise<Task[]> {
    console.warn(`Placeholder: getProjectSpecificTasks called for project ${projectId}`);
    // TODO: Implement logic to fetch from project-specific table or main table with filter
    try {
      // נניח שנקרא מהטבלה הראשית כרגע
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('hierarchical_number', { ascending: true });

      if (error) {
        console.error(`Error fetching project-specific tasks for project ${projectId}:`, error);
        throw new Error(error.message);
      }
      return data || [];
    } catch (err) {
      console.error(`Error in getProjectSpecificTasks for project ${projectId}:`, err);
      throw err;
    }
  },

  // Placeholder functions for hierarchical numbering
  async getProjectSpecificNextSubHierarchicalNumber(parentId: string, projectId: string): Promise<string> {
    console.warn('Placeholder: getProjectSpecificNextSubHierarchicalNumber called');
    return 'PLACEHOLDER_SUB';
  },
  async getNextSubHierarchicalNumber(parentId: string): Promise<string> {
    console.warn('Placeholder: getNextSubHierarchicalNumber called');
    return 'PLACEHOLDER_SUB_OLD';
  },
  async getProjectSpecificNextRootHierarchicalNumber(projectId: string): Promise<string> {
    console.warn('Placeholder: getProjectSpecificNextRootHierarchicalNumber called');
    return 'PLACEHOLDER_ROOT';
  },
  async getNextRootHierarchicalNumber(projectId: string): Promise<string> {
    console.warn('Placeholder: getNextRootHierarchicalNumber called');
    return 'PLACEHOLDER_ROOT_OLD';
  },

  // יצירת משימה
  async createTask(task: NewTask): Promise<Task> {
    try {
      if (!task.id) task.id = crypto.randomUUID();
      if (!task.start_date) task.start_date = new Date().toISOString().split('T')[0];

      if (task.assignees && !task.assignees_info) task.assignees_info = Array.isArray(task.assignees) ? task.assignees : [];
      else if (task.assignees_info && !Array.isArray(task.assignees_info)) task.assignees_info = [];

      let cleanedTaskData = { ...task };
      const dateFields = ['due_date'];
      for (const field of dateFields) {
        if (cleanedTaskData[field as keyof typeof cleanedTaskData] === '') delete cleanedTaskData[field as keyof typeof cleanedTaskData];
      }
      if (cleanedTaskData.responsible === '') cleanedTaskData.responsible = null;

      // Determine if using project-specific table
      const projectTableName = task.project_id ? `project_${task.project_id}_tasks` : null;
      let useProjectTable = false;
      if (projectTableName) {
        try {
          const { data: tableExists } = await supabase.rpc('check_table_exists', { table_name_param: projectTableName });
          useProjectTable = !!tableExists;
        } catch (checkError) { console.error(`Error checking table ${projectTableName}:`, checkError); }
      }

      // Clean fields based on target table
      cleanedTaskData = await this.removeNonExistingFields(cleanedTaskData, useProjectTable);

      if (cleanedTaskData.assignees_info && Array.isArray(cleanedTaskData.assignees_info)) {
        (cleanedTaskData as any).assignees_info = JSON.stringify(cleanedTaskData.assignees_info);
      }

      // Calculate hierarchical number if needed
      if (cleanedTaskData.project_id && !cleanedTaskData.hierarchical_number) {
        if (cleanedTaskData.parent_task_id) {
          try {
            cleanedTaskData.hierarchical_number = await this.getProjectSpecificNextSubHierarchicalNumber(cleanedTaskData.parent_task_id, cleanedTaskData.project_id);
          } catch { cleanedTaskData.hierarchical_number = await this.getNextSubHierarchicalNumber(cleanedTaskData.parent_task_id); }
        } else {
          try {
            cleanedTaskData.hierarchical_number = await this.getProjectSpecificNextRootHierarchicalNumber(cleanedTaskData.project_id);
          } catch { cleanedTaskData.hierarchical_number = await this.getNextRootHierarchicalNumber(cleanedTaskData.project_id); }
        }
      }

      let createdTask: Task;
      const targetTable = useProjectTable ? projectTableName : 'tasks';
      const taskToInsert = useProjectTable ? cleanedTaskData : await this.removeNonExistingFields(task, false); // Use fuller object for main table

      const { data, error } = await supabase
        .from(targetTable!)
        .insert(taskToInsert)
        .select('*')
        .single();

      if (error) {
        console.error(`Error inserting task into ${targetTable}:`, error);
        throw new Error(`שגיאה בהוספת משימה: ${error.message}`);
      }
      createdTask = data as Task;

      // Create Dropbox folder (no need to await if background creation is acceptable)
      if (createdTask.project_id) {
        this.createDropboxFolderForTask(createdTask, useProjectTable, targetTable!).catch(err => console.error('Error creating Dropbox folder:', err));
      }

      return createdTask;
    } catch (err) {
      console.error('Error in createTask:', err);
      throw new Error(err instanceof Error ? err.message : 'אירעה שגיאה ביצירת משימה');
    }
  },

  // עדכון משימה
  async updateTask(taskId: string, updates: Partial<ExtendedTask>): Promise<ExtendedTask> {
    console.warn(`Placeholder: updateTask called for task ${taskId} with updates:`, updates);
    // TODO: Implement actual update logic
    try {
      // Determine table (assuming main table for now)
      const tableName = 'tasks'; 
      const taskToUpdate = await this.removeNonExistingFields(updates, false);
      taskToUpdate.updated_at = new Date().toISOString(); // Ensure updated_at is set

      const { data, error } = await supabase
        .from(tableName)
        .update(taskToUpdate)
        .eq('id', taskId)
        .select('*')
        .single();

      if (error) {
        console.error(`Error updating task ${taskId}:`, error);
        throw new Error(error.message);
      }
      if (!data) throw new Error('Task not found after update');

      return data as ExtendedTask;
    } catch (err) {
      console.error(`Error in updateTask for ${taskId}:`, err);
      throw err;
    }
  },

  // עדכון סטטוס משימה
  async updateTaskStatus(taskId: string, status: string): Promise<ExtendedTask> {
    console.warn(`Placeholder: updateTaskStatus called for task ${taskId} with status ${status}`);
    // TODO: Implement actual status update logic
    try {
      return await this.updateTask(taskId, { status });
    } catch (err) {
      console.error(`Error in updateTaskStatus for ${taskId}:`, err);
      throw err;
    }
  },

  // מחיקת משימה
  async deleteTask(taskId: string, projectId: string): Promise<{ success: boolean; message?: string; deletedSubtasks?: string[] }> {
    console.warn(`Placeholder: deleteTask called for task ${taskId} in project ${projectId}`);
    // TODO: Implement actual deletion logic, including subtasks and table detection
    try {
      // Assuming main table for now
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error(`Error deleting task ${taskId}:`, error);
        throw new Error(error.message);
      }
      return { success: true, deletedSubtasks: [] }; // Assuming no subtasks handled yet
    } catch (err) {
      console.error(`Error in deleteTask for ${taskId}:`, err);
      throw err;
    }
  },

  // יצירת משימות ברירת מחדל לפרויקט נדלן
  async createDefaultTasksForRealEstateProject(projectId: string, firstStageId: string): Promise<Task[]> {
    console.warn(`Placeholder: createDefaultTasksForRealEstateProject called for project ${projectId} and stage ${firstStageId}`);
    // TODO: Implement actual logic using templates
    return [];
  },

  // Placeholder function for getting all non-hierarchical global task templates
  // TODO: Implement logic to fetch global templates (is_global_template = true)
  async getAllTaskTemplates(): Promise<Task[]> {
    console.warn(`Placeholder: getAllTaskTemplates called`);
    // Here you would typically:
    // 1. Fetch all tasks where is_global_template = true from the 'tasks' table.
    // 2. Return them as a flat array.
    return []; // Return empty array for now
  },

  // Placeholder function for creating a set of default task templates
  // TODO: Implement logic to create initial default global templates if they don't exist
  async createDefaultTaskTemplates(): Promise<Task[]> {
    console.warn(`Placeholder: createDefaultTaskTemplates called`);
    // Here you might check if default templates already exist, and if not, create them.
    return []; // Return empty array for now
  },

  // Placeholder function for getting all hierarchical global task templates
  // TODO: Implement logic to fetch global templates and build hierarchy
  async getAllHierarchicalTaskTemplates(): Promise<TaskWithChildren[]> { // Assuming TaskWithChildren is suitable
    console.warn(`Placeholder: getAllHierarchicalTaskTemplates called`);
    // Here you would typically:
    // 1. Fetch all tasks where is_global_template = true from the 'tasks' table.
    // 2. Build the hierarchy (e.g., using parent_task_id) into TaskWithChildren structure.
    // 3. Return the array of root template tasks with their children nested.
    return []; // Return empty array for now
  },

  // Placeholder function for getting unassigned tasks
  // TODO: Implement logic to fetch tasks where assignees_info is null or empty
  async getUnassignedTasks(): Promise<Task[]> {
    console.warn(`Placeholder: getUnassignedTasks called`);
    // Here you would typically fetch tasks where assignees_info is null or an empty array/JSON.
    return []; // Return empty array for now
  },

  // Placeholder function for assigning tasks to a project
  // TODO: Implement logic to update project_id for selected tasks
  async assignTasksToProject(taskIds: string[], projectId: string): Promise<Task[]> {
    console.warn(`Placeholder: assignTasksToProject called for tasks ${taskIds.join(', ')} to project ${projectId}`);
    // Here you would typically:
    // 1. Iterate through taskIds.
    // 2. Update the project_id for each task in the database.
    // 3. Potentially fetch and return the updated task objects.
    return []; // Return empty array for now
  },

  // Placeholder function for reordering tasks (hierarchy)
  // TODO: Implement logic to update hierarchical_number or similar based on new order
  async reorderTasks(projectId: string, parentTaskId: string | null): Promise<void> {
    console.warn(`Placeholder: reorderTasks called for project ${projectId} under parent ${parentTaskId}`);
    // Here you would typically:
    // 1. Receive the new order of tasks (maybe as an array of task IDs).
    // 2. Recalculate and update the hierarchical_number for the affected tasks.
    return; // Placeholder does nothing
  },

  // Placeholder function for syncing tasks after project table creation
  // TODO: Implement logic to copy/move relevant tasks to the project-specific table
  async syncProjectTasks(projectId: string): Promise<void> {
    console.warn(`Placeholder: syncProjectTasks called for project ${projectId}`);
    // Here you would typically:
    // 1. Find tasks in the main 'tasks' table belonging to this projectId.
    // 2. Copy or move these tasks to the newly created project_PROJECTID_tasks table.
    // 3. Potentially update references or perform clean-up.
    return; // Placeholder does nothing
  },

  // --- Dropbox Folder Logic ---

  async createDropboxFolderForTask(task: Task, useProjectTable: boolean, projectTableName: string): Promise<void> {
    try {
      const { data: projectData, error: projectError } = await supabase.from('projects').select('name, entrepreneur_id').eq('id', task.project_id).single();
      if (projectError || !projectData) { console.error(`Error fetching project for task ${task.id}:`, projectError); return; }

      let entrepreneurName: string | undefined;
      if (projectData.entrepreneur_id) {
        try {
          const { data: entrepreneurData } = await supabase.from('entrepreneurs').select('name').eq('id', projectData.entrepreneur_id).single();
          entrepreneurName = entrepreneurData?.name;
        } catch (e) { console.warn('Could not fetch entrepreneur name', e); }
      }

      const cleanProjectName = sanitizePath(projectData.name);
      let projectBasePath = PROJECTS_PATH;
      if (projectData.entrepreneur_id && entrepreneurName) {
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${projectBasePath}/${cleanEntrepreneurName}_${projectData.entrepreneur_id}`;
        try { await dropboxService.createFolder(entrepreneurPath); projectBasePath = entrepreneurPath; } catch (entError) { console.error(`Failed to ensure entrepreneur folder: ${entrepreneurPath}`, entError); projectBasePath = entrepreneurPath; /* Continue */ }
      }
      let projectFolderPath = `${projectBasePath}/${cleanProjectName}`;
      try {
        const projectFolderResult = await dropboxService.createFolder(projectFolderPath);
        projectFolderPath = projectFolderResult.path;
      } catch (projError) { console.error(`CRITICAL: Failed to ensure project folder: ${projectFolderPath}`, projError); return; }

      if (task.parent_task_id) await this.createSubtaskFolder(task, projectFolderPath, useProjectTable, projectTableName);
      else await this.createRootTaskFolder(task, projectFolderPath, useProjectTable, projectTableName);

    } catch (error) { console.error(`Error in createDropboxFolderForTask: ${error}`); }
  },

  async getTaskDropboxPath(task: Task, useProjectTable: boolean, projectTableName: string): Promise<string | null> {
    if (!task?.id) return null;
    try {
      const tableName = useProjectTable ? projectTableName : 'tasks';
      const { data, error } = await supabase.from(tableName).select('dropbox_folder').eq('id', task.id).single();
      if (error) { console.warn(`Error fetching DB path for task ${task.id}: ${error.message}`); return null; }
      return data?.dropbox_folder || null;
    } catch (dbError) { console.error(`DB error fetching path for task ${task.id}:`, dbError); return null; }
  },

  async createSubtaskFolder(task: Task, projectFolderPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    if (!task.parent_task_id) return;
    try {
      const parentTask = await this.getTaskById(task.parent_task_id);
      if (!parentTask) { console.error(`Parent task ${task.parent_task_id} not found for ${task.id}.`); return; }
      let parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
      if (!parentTaskDropboxPath) {
        console.log(`Parent folder path not found for ${parentTask.id}, attempting to create parent folder first.`);
        await this.createDropboxFolderForTask(parentTask, useProjectTable, projectTableName); // Create parent folder
        parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName); // Retry fetching path
        if (!parentTaskDropboxPath) { console.error(`Failed to create/find parent folder ${parentTask.id}. Aborting subtask folder.`); return; }
      }
      await this.createHierarchicalTaskFolderInternal(task, parentTaskDropboxPath, useProjectTable, projectTableName);
    } catch (error) { console.error(`Error creating subtask folder for ${task.id}:`, error); }
  },

  async createRootTaskFolder(task: Task, projectFolderPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    if (task.parent_task_id) return;
    await this.createHierarchicalTaskFolderInternal(task, projectFolderPath, useProjectTable, projectTableName);
  },

  async createHierarchicalTaskFolderInternal(task: Task, parentPath: string, useProjectTable: boolean, projectTableName: string): Promise<void> {
    try {
      const taskFolderNameBase = task.title ? sanitizePath(task.title) : `task_${task.id}`;
      const taskFolderName = task.hierarchical_number ? `${task.hierarchical_number} ${taskFolderNameBase}` : taskFolderNameBase;
      const fullTaskPath = `${parentPath}/${taskFolderName}`;
      console.log(`Attempting create/verify folder: ${fullTaskPath}`);
      const folderResult = await dropboxService.createFolder(fullTaskPath);
      const createdFolderPath = folderResult?.path;
      if (createdFolderPath) {
        const tableName = useProjectTable ? projectTableName : 'tasks';
        const { error: updateError } = await supabase.from(tableName).update({ dropbox_folder: createdFolderPath }).eq('id', task.id);
        if (updateError) console.error(`Failed to update task ${task.id} DB path:`, updateError);
        else console.log(`Updated task ${task.id} DB path: ${createdFolderPath}`);
      } else { console.error(`Folder creation failed for: ${fullTaskPath}`); }
    } catch (error: any) { console.error(`Error in createHierarchicalTaskFolderInternal for task ${task.id}:`, error); }
  },

  async createFullHierarchicalFolderStructureForProject(project: { id: string; name: string; entrepreneur_id?: string | null }, selectedEntrepreneurPath: string | null = null): Promise<{ success: boolean; message: string; project?: { id: string, path: string } }> {
    const { id: projectId, name: projectName, entrepreneur_id: entrepreneurId } = project;
    console.log(`Starting full folder structure creation for project ${projectId} (${projectName})`);
    let entrepreneurName: string | undefined;
    let finalProjectFolderPath: string | null = null;
    try {
      if (entrepreneurId) {
        try {
          const { data: entreData } = await supabase.from('entrepreneurs').select('name').eq('id', entrepreneurId).single();
          entrepreneurName = entreData?.name;
        } catch (e) { console.warn(`Could not fetch entrepreneur name for ${entrepreneurId}`, e); }
      }
      const projectTableName = `project_${projectId}_tasks`;
      let useProjectTable = false;
      try {
        const { data: tableExists } = await supabase.rpc('check_table_exists', { table_name_param: projectTableName });
        useProjectTable = !!tableExists;
      } catch (e) { console.error(`Error checking table ${projectTableName}`, e); }
      const tableName = useProjectTable ? projectTableName : 'tasks';
      const { data: tasks, error: fetchError } = await supabase.from(tableName).select('*').order('hierarchical_number', { ascending: true });
      if (fetchError) throw new Error(`Error fetching tasks from ${tableName}: ${fetchError.message}`);

      const cleanProjectName = sanitizePath(projectName);
      let projectBasePath = PROJECTS_PATH;
      if (selectedEntrepreneurPath) {
        const exists = await dropboxService.folderExists(selectedEntrepreneurPath);
        if (exists) projectBasePath = selectedEntrepreneurPath;
        else console.warn(`Selected entrepreneur path ${selectedEntrepreneurPath} does not exist! Fallback.`);
        finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`;
      }
      if (!finalProjectFolderPath && entrepreneurId && entrepreneurName) {
        const cleanEntrepreneurName = sanitizePath(entrepreneurName);
        const entrepreneurPath = `${PROJECTS_PATH}/${cleanEntrepreneurName}_${entrepreneurId}`;
        try { await dropboxService.createFolder(entrepreneurPath); projectBasePath = entrepreneurPath; finalProjectFolderPath = `${projectBasePath}/${cleanProjectName}`; } catch (entError) { console.error(`Failed ensure entrepreneur folder ${entrepreneurPath}`, entError); finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`; }
      } else if (!finalProjectFolderPath) finalProjectFolderPath = `${PROJECTS_PATH}/${cleanProjectName}`;

      const projectFolderResult = await dropboxService.createFolder(finalProjectFolderPath);
      finalProjectFolderPath = projectFolderResult.path;
      console.log(`Project folder ensured: ${finalProjectFolderPath}`);

      if (!tasks || tasks.length === 0) {
        console.log(`No tasks in ${tableName}. Base folders ensured.`);
        return { success: true, message: 'לא נמצאו משימות, תיקיות בסיס נוצרו.', project: { id: projectId, path: finalProjectFolderPath } };
      }

      const tasksMap = new Map<string, Task>(tasks.map(task => [task.id, task as Task]));
      const rootTasks = tasks.filter((task: Task) => !task.parent_task_id);
      const processedTaskIds = new Set<string>();
      const maxDepth = 10;
      console.log(`Processing ${rootTasks.length} root tasks...`);
      for (const rootTask of rootTasks) {
        if (!processedTaskIds.has(rootTask.id)) {
          await this.processTaskHierarchyFolders(rootTask, tasksMap, tasks as Task[], finalProjectFolderPath, projectTableName, useProjectTable, processedTaskIds, 0, maxDepth);
        }
      }
      console.log(`Finished structure creation for project ${projectId}.`);
      return { success: true, message: 'מבנה התיקיות נוצר/עודכן בהצלחה.', project: { id: projectId, path: finalProjectFolderPath } };
    } catch (error) {
      console.error(`Critical error during structure creation for ${projectId}:`, error);
      return { success: false, message: `שגיאה קריטית: ${error instanceof Error ? error.message : 'Unknown'}`, project: { id: projectId, path: finalProjectFolderPath || 'unknown' } };
    }
  },

  async processTaskHierarchyFolders(task: Task, tasksMap: Map<string, Task>, allTasks: Task[], projectFolderPath: string, projectTableName: string, useProjectTable: boolean, processedTaskIds: Set<string>, currentDepth: number, maxDepth: number): Promise<void> {
    if (currentDepth > maxDepth) { console.error(`Max depth (${maxDepth}) exceeded for task ${task.id}.`); return; }
    if (!task?.id) { console.error('Invalid task object.'); return; }
    if (processedTaskIds.has(task.id)) { console.log(`Task ${task.id} already processed.`); return; }
    if (task.parent_task_id === task.id) { console.error(`Circular ref (self): task ${task.id}.`); return; }
    if (task.parent_task_id && this.isCircularReference(task.id, task.parent_task_id, tasksMap)) { console.error(`Circular ref path: task ${task.id}.`); processedTaskIds.add(task.id); return; }

    console.log(`Processing task folder: ${task.id} (depth ${currentDepth})`);
    let parentTaskDropboxPath: string | null = null;
    if (task.parent_task_id) {
      const parentTask = tasksMap.get(task.parent_task_id);
      if (parentTask) {
        if (!processedTaskIds.has(parentTask.id)) {
          console.log(`Processing parent ${parentTask.id} first.`);
          await this.processTaskHierarchyFolders(parentTask, tasksMap, allTasks, projectFolderPath, projectTableName, useProjectTable, processedTaskIds, currentDepth, maxDepth);
          if (!processedTaskIds.has(parentTask.id)) { console.error(`Failed process parent ${parentTask.id} for child ${task.id}.`); return; }
        }
        parentTaskDropboxPath = await this.getTaskDropboxPath(parentTask, useProjectTable, projectTableName);
        if (!parentTaskDropboxPath) { console.error(`Parent path not found for ${parentTask.id}, aborting for ${task.id}.`); processedTaskIds.add(task.id); return; }
      } else { console.warn(`Parent ID ${task.parent_task_id} not found for task ${task.id}.`); }
    }

    processedTaskIds.add(task.id);
    try {
      const basePathForCurrentTask = parentTaskDropboxPath || projectFolderPath;
      await this.createHierarchicalTaskFolderInternal(task, basePathForCurrentTask, useProjectTable, projectTableName);
    } catch (folderError) { console.error(`Error creating folder for task ${task.id}:`, folderError); }

    await new Promise(resolve => setTimeout(resolve, 250));
    const childTasks = allTasks.filter((t: Task) => t.parent_task_id === task.id);
    if (childTasks.length > 0) {
      console.log(`Processing ${childTasks.length} children for task ${task.id}...`);
      for (const childTask of childTasks) {
        await this.processTaskHierarchyFolders(childTask, tasksMap, allTasks, projectFolderPath, projectTableName, useProjectTable, processedTaskIds, currentDepth + 1, maxDepth);
      }
    }
  },

  isCircularReference(taskId: string, parentId: string, tasksMap: Map<string, Task>, visited: Set<string> = new Set<string>()): boolean {
    visited.add(parentId);
    const parent = tasksMap.get(parentId);
    if (!parent) return false;
    if (parent.parent_task_id === taskId) return true;
    if (parent.parent_task_id && visited.has(parent.parent_task_id)) return true;
    if (!parent.parent_task_id) return false;
    return this.isCircularReference(taskId, parent.parent_task_id, tasksMap, visited);
  },
};

export default taskService; 