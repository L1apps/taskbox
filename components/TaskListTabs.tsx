
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
    ? 'bg-black text-orange-500 border-l-4 border-orange-500 shadow-md' 
    : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500 shadow-md';
    
  const inactiveTabClass = isOrange
    ? 'text-gray-400 hover:bg-gray-800 hover:text-orange-300'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-2 pr-2">
      <nav className="flex flex-col gap-2" aria-label="Tabs">
        {lists.map(list => {
            const isOwner = list.ownerId === currentUser.id;
            const isActive = activeListId === list.id;
            
            return (
              <div 
                key={list.id} 
                className={`
                    relative group flex items-center justify-between px-4 py-3 rounded-r-lg cursor-pointer transition-colors duration-200 select-none
                    ${isActive ? activeTabClass : inactiveTabClass}
                `}
                onClick={() => onSelectList(list.id)}
              >
                <div className="font-medium text-sm truncate mr-2" title={list.title}>
                  {list.title}
                </div>
                
                {isOwner && (
                    <div className="flex items-center space-x-1 shrink-0">
                        <Tooltip text="List Settings & Sharing">
                            <button
                                onClick={(e) => { e.stopPropagation(); onShareList(list); }}
                                className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? (isOrange ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400') : 'text-gray-400'}`}
                                aria-label={`Settings for ${list.title} list`}
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
