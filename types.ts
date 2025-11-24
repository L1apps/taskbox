
export interface Task {
  id: number;
  description: string;
  completed: boolean;
  dueDate: string | null;
  importance: number; // 0 to 5
}

export interface TaskList {
  id: number;
  title: string;
  description: string;
  tasks: Task[];
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
