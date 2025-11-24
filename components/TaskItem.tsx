import React, { useState } from 'react';
import type { Task, Theme } from '../types';

interface TaskItemProps {
  task: Task;
  theme: Theme;
  onUpdate: (task: Task) => void;
  onRemove: (taskId: number) => void;
}

const StarRating: React.FC<{ rating: number; onRate: (rating: number) => void; theme: Theme; }> = ({ rating, onRate, theme }) => {
    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => onRate(star)}
                    className="text-2xl"
                    aria-label={`Rate ${star} stars`}
                >
                    <span className={star <= rating ? (theme === 'orange' ? 'text-orange-400' : 'text-yellow-400') : 'text-gray-400'}>★</span>
                </button>
            ))}
        </div>
    );
};


const TaskItem: React.FC<TaskItemProps> = ({ task, theme, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description);

  const handleUpdate = () => {
    if (description.trim()) {
        onUpdate({ ...task, description: description.trim() });
        setIsEditing(false);
    } else {
        // Reset to original if empty
        setDescription(task.description);
        setIsEditing(false);
    }
  };

  const handleToggleComplete = () => {
    onUpdate({ ...task, completed: !task.completed });
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...task, dueDate: e.target.value || null });
  };

  const handleRatingChange = (newRating: number) => {
    onUpdate({ ...task, importance: newRating });
  };
  
  const isOrange = theme === 'orange';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const borderFocusColor = isOrange ? 'border-orange-500' : 'border-blue-500';


  return (
    <div className={`flex items-center p-3 rounded-lg transition-colors ${task.completed ? 'bg-gray-100 dark:bg-gray-700 opacity-70' : (isOrange ? 'bg-gray-900' : 'bg-white dark:bg-gray-800 shadow-sm')}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={handleToggleComplete}
        className={`h-5 w-5 mr-4 rounded border-gray-300 ${checkboxColor} ${focusRingColor}`}
      />
      <div className="flex-grow">
        {isEditing ? (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdate();
                if (e.key === 'Escape') {
                    setDescription(task.description);
                    setIsEditing(false);
                }
            }}
            className={`w-full bg-transparent border-b ${borderFocusColor} focus:outline-none`}
            autoFocus
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}
          >
            {task.description}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2 md:space-x-4 ml-4">
        <StarRating rating={task.importance} onRate={handleRatingChange} theme={theme} />
        <input
            type="date"
            value={task.dueDate || ''}
            onChange={handleDateChange}
            className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-32 ${isOrange ? 'text-gray-900' : ''}`}
        />
        <button
          onClick={() => onRemove(task.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TaskItem;