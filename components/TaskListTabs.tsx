
import React from 'react';
import type { TaskListWithUsers, Theme } from '../types';

interface TaskListTabsProps {
  lists: TaskListWithUsers[];
  activeListId: number | null;
  onSelectList: (id: number) => void;
  theme: Theme;
}

const TaskListTabs: React.FC<TaskListTabsProps> = ({ lists, activeListId, onSelectList, theme }) => {
  const isOrange = theme === 'orange';
  
  // Refined Tab Styling for Transparent Sidebar
  const activeTabClass = isOrange 
    ? 'bg-black text-orange-500 border-l-4 border-orange-500 shadow-sm' 
    : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500 shadow-sm';
    
  const inactiveTabClass = isOrange
    ? 'text-gray-400 hover:bg-black/50 hover:text-orange-300'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50';

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-2 pl-2 md:pl-0 md:pr-2">
      <nav className="flex flex-col gap-2" aria-label="Tabs">
        {lists.map(list => {
            const isActive = activeListId === list.id;
            
            return (
              <div 
                key={list.id} 
                className={`
                    flex items-center justify-between px-4 py-3 rounded-l-lg md:rounded-r-lg cursor-pointer transition-colors duration-200 select-none
                    ${isActive ? activeTabClass : inactiveTabClass}
                `}
                onClick={() => onSelectList(list.id)}
              >
                <div className="font-medium text-sm truncate w-full" title={list.title}>
                  {list.title}
                </div>
              </div>
            )
        })}
      </nav>
    </div>
  );
};

export default TaskListTabs;
