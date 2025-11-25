import React, { useState } from 'react';
import { Theme } from '../types';

interface AddTaskFormProps {
  onAddTask: (description: string) => void;
  theme: Theme;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, theme }) => {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onAddTask(description.trim());
      setDescription('');
    }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a new task..."
        className={`flex-grow px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${themeRingColor} ${inputTextColor}`}
      />
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