import { generateId } from '@/lib/utils';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description: string;
  assignedTo: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createEmptyTask(clientId: string): Task {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    clientId,
    title: '',
    description: '',
    assignedTo: '',
    status: 'todo',
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  };
}
