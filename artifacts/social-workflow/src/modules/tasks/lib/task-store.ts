import { Task } from './task-types';

const TASKS_STORAGE_KEY = 'socialidiots_tasks';

export function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(TASKS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTask(task: Task): void {
  const tasks = loadTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function saveTasksBatch(tasks: Task[]): void {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function deleteTask(id: string): void {
  const tasks = loadTasks().filter(t => t.id !== id);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function getTasksByClient(clientId: string): Task[] {
  return loadTasks().filter(t => t.clientId === clientId);
}

export function updateTaskField(id: string, updates: Partial<Task>): void {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  
  if (task) {
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    saveTasksBatch(tasks);
  }
}
