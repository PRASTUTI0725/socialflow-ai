import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Task, createEmptyTask } from '../lib/task-types';
import { loadTasks, saveTask, deleteTask as deleteTaskFromStore, getTasksByClient, updateTaskField as updateTaskInStore } from '../lib/task-store';

interface TaskContextType {
  tasks: Task[];
  tasksByClient: (clientId: string) => Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'assignedTo' | 'status' | 'dueDate'>>) => void;
  deleteTask: (id: string) => void;
  refreshTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const refreshTasks = useCallback(() => {
    setTasks(loadTasks());
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
    const task = createEmptyTask(taskData.clientId);
    Object.assign(task, taskData);
    saveTask(task);
    refreshTasks();
    return task;
  }, [refreshTasks]);

  const updateTask = useCallback((
    id: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'assignedTo' | 'status' | 'dueDate'>>
  ) => {
    updateTaskInStore(id, updates);
    refreshTasks();
  }, [refreshTasks]);

  const deleteTask = useCallback((id: string) => {
    deleteTaskFromStore(id);
    refreshTasks();
  }, [refreshTasks]);

  const tasksByClient = useCallback((clientId: string) => {
    return tasks.filter(t => t.clientId === clientId);
  }, [tasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      tasksByClient,
      addTask,
      updateTask,
      deleteTask,
      refreshTasks,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
