
export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
  sessionTimeout?: string;
}

export interface SharedUser extends User {
    permission?: 'VIEW' | 'MODIFY' | 'FULL';
}

export interface Task {
  id: number;
  description: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string; // ISO Date string
  importance: number; // 0: Low, 1: Medium, 2: High
  parentTaskId?: number | null; // Changed from dependsOn to parentTaskId for sub-task logic
  isParentSelectable: boolean; // New field: determines if task can be a parent (Active/Inactive)
  pinned: boolean;
  focused: boolean; // Added for Focused list
  list_id?: number; // Added for search results context
  sortOrder: number; // Added for custom sorting
  globalSortOrder: number; // Added for global view sorting
}

export interface TaskList {
  id: number;
  title: string;
  description: string;
  parentId: number | null; // Replaces folderId
  tasks: Task[];
  pinned?: boolean; // Added for list pinning
  children?: TaskListWithUsers[]; // For nested structure
}

export interface TaskListWithUsers extends TaskList {
  ownerId: number;
  sharedWith: SharedUser[];
  currentUserPermission?: 'OWNER' | 'VIEW' | 'MODIFY' | 'FULL' | 'NONE';
}

export type Theme = 'light' | 'dark' | 'orange';

export enum SortOption {
    DEFAULT = 'default',
    DESCRIPTION_ASC = 'description_asc',
    DESCRIPTION_DESC = 'description_desc',
    DUE_DATE_ASC = 'due_date_asc',
    DUE_DATE_DESC = 'due_date_desc',
    CREATED_DATE_ASC = 'created_date_asc',
    CREATED_DATE_DESC = 'created_date_desc',
    COMPLETED_ASC = 'completed_asc',
    COMPLETED_DESC = 'completed_desc',
    IMPORTANCE_ASC = 'importance_asc',
    IMPORTANCE_DESC = 'importance_desc',
    DEPENDENCY_ASC = 'dependency_asc',
    DEPENDENCY_DESC = 'dependency_desc',
    RELATIONSHIP_ASC = 'relationship_asc',
    RELATIONSHIP_DESC = 'relationship_desc',
    CUSTOM = 'custom', // Added for custom sorting logic
}

export interface LogEntry {
    id: number;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

export type ModalType = 
    | 'ADD_LIST' 
    | 'MOVE_LIST' 
    | 'MERGE_LIST' 
    | 'RENAME_LIST' 
    | 'ABOUT' 
    | 'STATS' 
    | 'ADMIN' 
    | 'USER_SETTINGS' 
    | 'IMPORT' 
    | 'PASTE' 
    | 'EXPORT' 
    | 'SHARE_LIST' 
    | 'COPY_TASK';

export interface ModalData {
    type: ModalType;
    props?: any;
}
