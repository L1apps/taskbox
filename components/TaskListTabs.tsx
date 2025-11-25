
import React from 'react';
import type { TaskListWithUsers, Theme, User } from '../types';
import Tooltip from './Tooltip';

interface TaskListTabsProps {
  lists: TaskListWithUsers[];
  activeListId: number | null;
  currentUser: User;
  onSelectList: (id: number) => void;
  onRemoveList: (id: number) => void;
  onShareList: (list: TaskListWithUsers) => void;
  theme: Theme;
}

const TaskListTabs: React.FC<TaskListTabsProps> = ({ lists, activeListId, currentUser, onSelectList, onRemoveList, onShareList, theme }) => {
  const isOrange = theme === 'orange';
  
  // Tab Styling
  const activeTabClass = isOrange 
    ? 'bg-black text-orange-500 shadow-md' 
    : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md';
    
  const inactiveTabClass = isOrange
    ? 'text-gray-400 hover:bg-gray-800 hover:text-orange-300'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

  return (
    // relative z-30 ensures this container sits ABOVE the TaskListView (which is static/z-0)
    // This allows tooltips from the tabs to drop down OVER the list content without being covered.
    <div className="relative z-30">
      <nav className="flex space-x-1 overflow-x-auto no-scrollbar px-4 pt-4 pb-0 bg-gray-100 dark:bg-gray-900/50 rounded-t-lg" aria-label="Tabs">
        {lists.map(list => {
            const isOwner = list.ownerId === currentUser.id;
            const isActive = activeListId === list.id;
            
            return (
              <div 
                key={list.id} 
                className={`
                    relative group flex-shrink-0 flex items-center px-4 py-3 rounded-t-lg cursor-pointer transition-colors duration-200 select-none
                    ${isActive ? activeTabClass : inactiveTabClass}
                    ${isActive ? 'z-10' : 'z-0'}
                `}
                onClick={() => onSelectList(list.id)}
              >
                <span className="font-medium text-sm whitespace-nowrap mr-2">
                  {list.title}
                </span>
                
                {isOwner && (
                    <div className="flex items-center space-x-1">
                        <Tooltip text="List Settings & Sharing">
                            <button
                                onClick={(e) => { e.stopPropagation(); onShareList(list); }}
                                className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? (isOrange ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400') : 'text-gray-400'}`}
                                aria-label={`Settings for ${list.title} list`}
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        </Tooltip>
                        <Tooltip text={`Delete "${list.title}" list`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveList(list.id);
                              }}
                              className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? (isOrange ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400') : 'text-gray-400'}`}
                              aria-label={`Delete ${list.title} list`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                        </Tooltip>
                    </div>
                )}
              </div>
            )
        })}
      </nav>
    </div>
  );
};

export default TaskListTabs;
