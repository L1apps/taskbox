import React from 'react';
import type { TaskList, Theme } from '../types';

interface TaskListTabsProps {
  lists: TaskList[];
  activeListId: number | null;
  onSelectList: (id: number) => void;
  onRemoveList: (id: number) => void;
  theme: Theme;
}

const TaskListTabs: React.FC<TaskListTabsProps> = ({ lists, activeListId, onSelectList, onRemoveList, theme }) => {
  const activeTabClass = theme === 'orange' ? 'border-orange-500 text-orange-500' : 'border-blue-500 text-blue-500';

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-4 overflow-x-auto px-4" aria-label="Tabs">
        {lists.map(list => (
          <div key={list.id} className="relative group flex-shrink-0">
            <button
              onClick={() => onSelectList(list.id)}
              className={`${
                activeListId === list.id
                  ? activeTabClass
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center pr-6`}
            >
              {list.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveList(list.id);
              }}
              className="absolute top-1/2 -translate-y-1/2 right-0 p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Delete ${list.title} list`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default TaskListTabs;