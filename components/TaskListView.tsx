
import React, { useState, useMemo } from 'react';
import type { Task, TaskListWithUsers, Theme, User } from '../types';
import { SortOption } from '../types';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import Tooltip from './Tooltip';
import WarningModal from './WarningModal';

interface TaskListViewProps {
  list: TaskListWithUsers;
  currentUser: User;
  theme: Theme;
  onUpdateTask: (task: Task) => void;
  onAddTask: (description: string) => void;
  onRemoveTask: (taskId: number) => void;
  onPurgeCompleted: () => void;
  onToggleAllTasks: (completed: boolean) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ list, theme, onUpdateTask, onAddTask, onRemoveTask, onPurgeCompleted, onToggleAllTasks }) => {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortOption>(SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useState(true);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Check if this list acts as a container (has sublists)
  const isContainer = list.children && list.children.length > 0;

  const tasks = list.tasks || [];

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks
      .filter(task => task.description.toLowerCase().includes(filter.toLowerCase()))
      .filter(task => showCompleted || !task.completed);

    const pinnedTasks = filteredTasks.filter(t => t.pinned);
    const unpinnedTasks = filteredTasks.filter(t => !t.pinned);

    // Helper for robust safe sorting
    const compareValues = (a: any, b: any, type: 'string' | 'number' | 'date' | 'boolean', direction: 'asc' | 'desc') => {
        // Handle null/undefined/empty - push to bottom usually
        const isEmptyA = a === null || a === undefined || a === '';
        const isEmptyB = b === null || b === undefined || b === '';

        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1; // A is empty, goes to end
        if (isEmptyB) return -1; // B is empty, goes to end

        let valA = a;
        let valB = b;

        if (type === 'string') {
            valA = String(a).toLowerCase();
            valB = String(b).toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (type === 'date') {
             // Treat dates as strings for comparison but ensure valid
             valA = String(a);
             valB = String(b);
             return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (type === 'boolean') {
            valA = Number(a);
            valB = Number(b);
        }

        // Numbers/Booleans
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    const sortTasks = (taskList: Task[]) => {
        return taskList.sort((a, b) => {
            switch (sort) {
                case SortOption.DESCRIPTION_ASC: return compareValues(a.description, b.description, 'string', 'asc');
                case SortOption.DESCRIPTION_DESC: return compareValues(a.description, b.description, 'string', 'desc');
                case SortOption.DUE_DATE_ASC: return compareValues(a.dueDate, b.dueDate, 'date', 'asc');
                case SortOption.DUE_DATE_DESC: return compareValues(a.dueDate, b.dueDate, 'date', 'desc');
                case SortOption.CREATED_DATE_ASC: return compareValues(a.createdAt, b.createdAt, 'date', 'asc');
                case SortOption.CREATED_DATE_DESC: return compareValues(a.createdAt, b.createdAt, 'date', 'desc');
                case SortOption.COMPLETED_ASC: return compareValues(a.completed, b.completed, 'boolean', 'asc');
                case SortOption.COMPLETED_DESC: return compareValues(a.completed, b.completed, 'boolean', 'desc');
                case SortOption.IMPORTANCE_ASC: return compareValues(a.importance, b.importance, 'number', 'asc');
                case SortOption.IMPORTANCE_DESC: return compareValues(a.importance, b.importance, 'number', 'desc');
                case SortOption.DEPENDENCY_ASC: return compareValues(a.dependsOn, b.dependsOn, 'number', 'asc');
                case SortOption.DEPENDENCY_DESC: return compareValues(a.dependsOn, b.dependsOn, 'number', 'desc');
                default: return a.id - b.id;
            }
        });
    };

    const sortedPinned = sortTasks([...pinnedTasks]);
    const sortedUnpinned = sortTasks([...unpinnedTasks]);

    return [...sortedPinned, ...sortedUnpinned];
  }, [tasks, filter, sort, showCompleted]);

  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedCount = tasks.filter(t => t.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks]);
  
  const allVisibleCompleted = useMemo(() => {
      if (sortedAndFilteredTasks.length === 0) return false;
      return sortedAndFilteredTasks.every(t => t.completed);
  }, [sortedAndFilteredTasks]);
  
  const hasCompletedTasks = useMemo(() => {
      return tasks.some(t => t.completed);
  }, [tasks]);

  const handleSortClick = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (sort === optionAsc) setSort(optionDesc);
      else if (sort === optionDesc) setSort(SortOption.DEFAULT);
      else setSort(optionAsc);
  };

  const getSortIcon = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (sort === optionAsc) return <span className="ml-1 text-xs">▲</span>;
      if (sort === optionDesc) return <span className="ml-1 text-xs">▼</span>;
      return <span className="ml-1 text-xs opacity-0 group-hover:opacity-50">▲▼</span>;
  };

  const isOrange = theme === 'orange';
  const progressColor = isOrange ? 'bg-orange-500' : 'bg-blue-500';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';
  const buttonColor = isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700';
  const headerTextColor = isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full relative">
      {/* List Header - Always visible */}
      <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-bold ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>{list.title}</h2>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center flex-wrap">
          {/* Bulk Toggle (Moved to Left) */}
          <Tooltip text="Check or Uncheck all" align="left">
              <button
                  onClick={() => onToggleAllTasks(!allVisibleCompleted)}
                  className={`p-2 rounded-md border ${isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'} transition-colors`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {allVisibleCompleted 
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      }
                  </svg>
              </button>
          </Tooltip>

          <input
          type="text"
          placeholder="Search tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`flex-grow w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${focusRingColor} ${inputTextColor}`}
          />
          
          <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} className={`h-4 w-4 rounded border-gray-300 ${checkboxColor} ${focusRingColor}`} />
          <span>Show Completed</span>
          </label>

          <div className="flex items-center space-x-2 flex-grow sm:flex-grow-0 sm:ml-auto">
              <button
                  onClick={onPurgeCompleted}
                  disabled={!hasCompletedTasks}
                  className={`px-3 py-2 text-white text-sm rounded-md transition flex items-center space-x-2 ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>Purge Completed</span>
              </button>
          </div>
      </div>

      {/* Sortable Header Row */}
      <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor}`}>
          <div className="w-10 text-center mr-3 cursor-pointer hover:text-blue-500 flex items-center justify-center group" onClick={() => handleSortClick(SortOption.COMPLETED_ASC, SortOption.COMPLETED_DESC)}>Status {getSortIcon(SortOption.COMPLETED_ASC, SortOption.COMPLETED_DESC)}</div>
          <div className="w-20 text-center mx-3 cursor-pointer hover:text-blue-500 flex items-center justify-center group" onClick={() => handleSortClick(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}>Priority {getSortIcon(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}</div>
          <div className="flex-grow min-w-[150px] cursor-pointer hover:text-blue-500 flex items-center group" onClick={() => handleSortClick(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}>Task Description {getSortIcon(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}</div>
          <div className="w-32 cursor-pointer hover:text-blue-500 flex items-center group" onClick={() => handleSortClick(SortOption.DEPENDENCY_ASC, SortOption.DEPENDENCY_DESC)}>Dependency {getSortIcon(SortOption.DEPENDENCY_ASC, SortOption.DEPENDENCY_DESC)}</div>
          <div className="w-24 ml-2 cursor-pointer hover:text-blue-500 flex items-center group" onClick={() => handleSortClick(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}>Created {getSortIcon(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}</div>
          <div className="w-32 ml-2 cursor-pointer hover:text-blue-500 flex items-center group" onClick={() => handleSortClick(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}>Due Date {getSortIcon(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}</div>
          <div className="w-16 ml-3"></div>
      </div>

      <div className="space-y-3 flex-grow overflow-y-auto no-scrollbar pb-4">
          {sortedAndFilteredTasks.map(task => (
          <TaskItem key={task.id} task={task} allTasksInList={tasks} onUpdate={onUpdateTask} onRemove={onRemoveTask} theme={theme} />
          ))}
          {sortedAndFilteredTasks.length === 0 && <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <AddTaskForm 
            onAddTask={onAddTask} 
            onWarning={setWarningMessage} 
            theme={theme} 
            currentTasks={tasks} 
            isContainer={isContainer} 
          />
          <div className="mt-4">
              <div className="flex justify-between mb-1">
              <span className={`text-base font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>Completion</span>
              <span className={`text-sm font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${completionPercentage}%` }}></div>
              </div>
          </div>
      </div>
      
      {warningMessage && (
          <WarningModal 
            message={warningMessage} 
            onClose={() => setWarningMessage(null)} 
            theme={theme} 
          />
      )}
    </div>
  );
};

export default TaskListView;
