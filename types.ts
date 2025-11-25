
export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
}

export interface Task {
  id: number;
  description: string;
  completed: boolean;
  dueDate: string | null;
  importance: number; // 0: Low, 1: Medium, 2: High
  dependsOn?: number | null;
  pinned: boolean;
}

export interface TaskList {
  id: number;
  title: string;
  description: string;
  tasks: Task[];
}

export interface TaskListWithUsers extends TaskList {
  ownerId: number;
  sharedWith: User[];
}

export type Theme = 'light' | 'dark' | 'orange';

export enum SortOption {
    DEFAULT = 'default',
    DESCRIPTION_ASC = 'description_asc',
    DESCRIPTION_DESC = 'description_desc',
    DUE_DATE_ASC = 'due_date_asc',
    DUE_DATE_DESC = 'due_date_desc',
    COMPLETED = 'completed',
    IMPORTANCE = 'importance',
}

export interface LogEntry {
    id: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}