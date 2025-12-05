
import React, { useState, useEffect } from 'react';
import { Theme, Task } from '../types';
import Tooltip from './Tooltip';

interface AddTaskFormProps {
  onAddTask: (description: string) => void;
  onWarning: (message: string) => void;
  theme: Theme;
  currentTasks: Task[];
  isContainer?: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, onWarning, theme, currentTasks, isContainer = false }) => {
  const [description, setDescription] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
      if (!description.trim()) {
          setIsDuplicate(false);
          return;
      }
      const duplicateFound = currentTasks.some(t => t.description.toLowerCase() === description.trim().toLowerCase());
      setIsDuplicate(duplicateFound);
  }, [description, currentTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isContainer) {
        onWarning("This list contains sublists. It cannot contain tasks.");
        return;
    }
    if (description.trim()) {
      onAddTask(description.trim());
      setDescription('');
      setIsDuplicate(false);
    }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 relative">
      <div className="flex-grow relative">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a new task..."
            maxLength={102}
            className={`w-full pl-4 pr-14 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${themeRingColor} ${inputTextColor} ${isDuplicate ? 'pl-10 border-yellow-400' : ''}`}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <span className="text-xs text-gray-400 pointer-events-none">{description.length}/102</span>
              {description && (
                  <button 
                    type="button"
                    onClick={() => setDescription('')}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              )}
          </div>

          {isDuplicate && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Tooltip text="This task already exists in this list" align="left">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                  </Tooltip>
              </div>
          )}
      </div>
      <button
        type="submit"
        className={`px-4 py-2 text-white rounded-md transition-colors flex items-center justify-center ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span className="ml-2 hidden sm:inline">Add Task</span>
      </button>
    </form>
  );
};

export default AddTaskForm;
