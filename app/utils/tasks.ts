import { gapi } from 'gapi-script';

/**
 * Interface for Google Task
 */
export interface Task {
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status?: 'needsAction' | 'completed';
  completed?: string;
}

/**
 * Get all tasks from the default task list
 * @returns [success, result] - Tuple of success boolean and tasks array/error
 */
export const getTasks = async (): Promise<[boolean, Task[]]> => {
  try {
    // Check if we're authenticated
    // @ts-ignore - Google Auth types are not complete
    if (!gapi.auth2?.getAuthInstance()?.isSignedIn.get()) {
      throw new Error('Not authenticated');
    }

    // Get the default task list
    // @ts-ignore - Google Tasks API types are not complete
    const taskLists = await gapi.client.tasks.tasklists.list({
      maxResults: 10
    });

    if (!taskLists.result.items || taskLists.result.items.length === 0) {
      return [true, []];
    }

    const defaultTaskList = taskLists.result.items[0].id;

    // Get all tasks from the default list
    // @ts-ignore - Google Tasks API types are not complete
    const response = await gapi.client.tasks.tasks.list({
      tasklist: defaultTaskList,
      showCompleted: true,
      maxResults: 100
    });

    const tasks = response.result.items || [];
    return [true, tasks];
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [false, []];
  }
};

/**
 * Add a new task to the default task list
 * @param task - Task data to add
 * @returns [success, result] - Tuple of success boolean and result/error
 */
export const addTask = async (task: Task): Promise<[boolean, any]> => {
  try {
    // Check if we're authenticated
    // @ts-ignore - Google Auth types are not complete
    if (!gapi.auth2?.getAuthInstance()?.isSignedIn.get()) {
      throw new Error('Not authenticated');
    }

    // Validate task data
    if (!task.title) {
      throw new Error('Task must have a title');
    }

    // Get the default task list
    // @ts-ignore - Google Tasks API types are not complete
    const taskLists = await gapi.client.tasks.tasklists.list({
      maxResults: 10
    });

    if (!taskLists.result.items || taskLists.result.items.length === 0) {
      throw new Error('No task lists found');
    }

    const defaultTaskList = taskLists.result.items[0].id;

    // Create the task
    // @ts-ignore - Google Tasks API types are not complete
    const response = await gapi.client.tasks.tasks.insert({
      tasklist: defaultTaskList,
      resource: {
        title: task.title,
        notes: task.notes,
        due: task.due
      }
    });

    console.log('Task created:', response);
    return [true, response];
  } catch (err) {
    console.error('Error adding task:', err);
    return [false, err];
  }
};
