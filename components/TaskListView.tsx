
import React, { useState, useMemo } from 'react';
import type { Task, TaskListWithUsers, Theme, User } from '../types';
import { SortOption } from '../types';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import Tooltip from './Tooltip';

interface TaskListViewProps {
  list: TaskListWithUsers;
  currentUser: User;
  theme: Theme;
  onUpdateTask: (task: Task) => void;
  onAddTask: (description: string) => void;
  onRemoveTask: (taskId: number) => void;
  onPurgeCompleted: () => void;
  onRemoveList: () => void;
  onShareList: () => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ list, currentUser, theme, onUpdateTask, onAddTask, onRemoveTask, onPurgeCompleted, onRemoveList, onShareList }) => {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortOption>(SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useState(true);

  const tasks = list.tasks || [];

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks
      .filter(task => task.description.toLowerCase().includes(filter.toLowerCase()))
      .filter(task => showCompleted || !task.completed);

    // Separate pinned from unpinned tasks
    const pinnedTasks = filteredTasks.filter(t => t.pinned);
    const unpinnedTasks = filteredTasks.filter(t => !t.pinned);

    // Sort only the unpinned tasks
    switch (sort) {
      case SortOption.DESCRIPTION_ASC:
        unpinnedTasks.sort((a, b) => a.description.localeCompare(b.description));
        break;
      case SortOption.DESCRIPTION_DESC:
        unpinnedTasks.sort((a, b) => b.description.localeCompare(a.description));
        break;
      case SortOption.DUE_DATE_ASC:
        unpinnedTasks.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
        break;
      case SortOption.DUE_DATE_DESC:
        unpinnedTasks.sort((a, b) => (b.dueDate || 'a').localeCompare(a.dueDate || 'a'));
        break;
      case SortOption.CREATED_DATE_ASC:
        unpinnedTasks.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        break;
      case SortOption.CREATED_DATE_DESC:
        unpinnedTasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
      case SortOption.COMPLETED:
        unpinnedTasks.sort((a, b) => Number(a.completed) - Number(b.completed));
          break;
      case SortOption.IMPORTANCE:
        unpinnedTasks.sort((a, b) => b.importance - a.importance);
        break;
      default:
        // Keep original order which is likely insertion order (by id)
        unpinnedTasks.sort((a,b) => a.id - b.id);
        break;
    }
    // Pinned tasks always come first
    return [...pinnedTasks, ...unpinnedTasks];
  }, [tasks, filter, sort, showCompleted]);

  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedCount = tasks.filter(t => t.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks]);
  
  const isOrange = theme === 'orange';
  const progressColor = isOrange ? 'bg-orange-500' : 'bg-blue-500';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';
  const buttonColor = isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700';
  const headerTextColor = isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
  
  // Ensure text is black in inputs for orange theme
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const isOwner = list.ownerId === currentUser.id;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      
      {/* List Header with Title and Actions */}
      <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-bold ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>{list.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.description}</p>
          </div>
          
          {isOwner && (
            <div className="flex space-x-2">
                 <Tooltip text="List Settings & Sharing">
                    <button
                        onClick={onShareList}
                        className={`p-2 rounded-full transition-colors ${isOrange ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}
                        aria-label={`Settings for ${list.title} list`}
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </Tooltip>
                <Tooltip text={`Delete "${list.title}" list`}>
                    <button
                        onClick={onRemoveList}
                        className={`p-2 rounded-full transition-colors ${isOrange ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}
                        aria-label={`Delete ${list.title} list`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             {/* Trash Icon */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
          )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`flex-grow w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${focusRingColor} ${inputTextColor}`}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={`px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${focusRingColor} ${inputTextColor}`}
        >
          <option value={SortOption.DEFAULT}>Sort by (Default)</option>
          <option value={SortOption.IMPORTANCE}>Importance</option>
          <option value={SortOption.CREATED_DATE_ASC}>Created (Oldest)</option>
          <option value={SortOption.CREATED_DATE_DESC}>Created (Newest)</option>
          <option value={SortOption.DUE_DATE_ASC}>Due Date (Oldest)</option>
          <option value={SortOption.DUE_DATE_DESC}>Due Date (Newest)</option>
          <option value={SortOption.DESCRIPTION_ASC}>Description (A-Z)</option>
          <option value={SortOption.DESCRIPTION_DESC}>Description (Z-A)</option>
          <option value={SortOption.COMPLETED}>Completed</option>
        </select>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)}
            className={`h-4 w-4 rounded border-gray-300 ${checkboxColor} ${focusRingColor}`}
          />
          <span>Show Completed</span>
        </label>
        <div className="flex-grow sm:flex-grow-0 sm:ml-auto">
            <button
                onClick={onPurgeCompleted}
                className={`px-3 py-2 text-white text-sm rounded-md transition flex items-center space-x-2 ${buttonColor}`}
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Purge Completed</span>
            </button>
        </div>
      </div>

      {/* Header Row */}
      <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor}`}>
         <div className="w-8 text-center mr-3">Status</div>
         <div className="w-16 text-center mx-3">Priority</div>
         <div className="flex-grow">Task Description</div>
         <div className="w-32">Dependency</div>
         <div className="w-24 ml-2">Created</div>
         <div className="w-32 ml-2">Due Date</div>
         <div className="w-8 ml-3"></div>
      </div>

      <div className="space-y-3 flex-grow overflow-y-auto no-scrollbar pb-4">
        {sortedAndFilteredTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            allTasksInList={tasks} 
            onUpdate={onUpdateTask} 
            onRemove={onRemoveTask} 
            theme={theme} 
          />
        ))}
        {sortedAndFilteredTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <AddTaskForm onAddTask={onAddTask} theme={theme} />
        
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
    </div>
  );
};

export default TaskListView;
