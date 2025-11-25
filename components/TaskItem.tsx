
import React, { useState, useMemo } from 'react';
import type { Task, Theme } from '../types';
import Tooltip from './Tooltip';

interface TaskItemProps {
  task: Task;
  theme: Theme;
  allTasksInList: Task[];
  onUpdate: (task: Task) => void;
  onRemove: (taskId: number) => void;
}

const ImportanceFlag: React.FC<{ level: number; onClick: () => void; }> = ({ level, onClick }) => {
    const levels = [
        { color: 'text-gray-400', label: 'Low Importance' },
        { color: 'text-yellow-500', label: 'Medium Importance' },
        { color: 'text-red-600', label: 'High Importance' },
    ];
    const current = levels[level] || levels[0];

    return (
        <Tooltip text={current.label}>
            <button onClick={onClick} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${current.color}`}>
                {/* Waving Flag Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4a1 1 0 011-1h1.5a1 1 0 01.6.2l1.9 1.9 1.9-1.9a1 1 0 01.6-.2H18a1 1 0 011 1v10a1 1 0 01-1 1h-1.5a1 1 0 01-.6-.2l-1.9-1.9-1.9 1.9a1 1 0 01-.6.2H5a1 1 0 01-1-1V4z" />
                    <path d="M4 16v5a1 1 0 11-2 0V4a1 1 0 011-1h1v13H4z" />
                </svg>
            </button>
        </Tooltip>
    );
};

const PinButton: React.FC<{ pinned: boolean; onClick: () => void }> = ({ pinned, onClick }) => {
    return (
        <Tooltip text={pinned ? "Unpin task" : "Pin task to top"}>
            <button onClick={onClick} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${pinned ? 'text-blue-500' : 'text-gray-400'}`}>
                {/* Vertical Push Pin Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                </svg>
            </button>
        </Tooltip>
    );
};


const TaskItem: React.FC<TaskItemProps> = ({ task, theme, allTasksInList, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description);

  const dependencyTask = useMemo(() => 
    task.dependsOn ? allTasksInList.find(t => t.id === task.dependsOn) : null,
    [task.dependsOn, allTasksInList]
  );

  const isDependencyIncomplete = dependencyTask ? !dependencyTask.completed : false;

  const handleUpdate = () => {
    if (description.trim()) {
        onUpdate({ ...task, description: description.trim() });
        setIsEditing(false);
    } else {
        setDescription(task.description);
        setIsEditing(false);
    }
  };
  
  const handleToggleImportance = () => {
      const newImportance = (task.importance + 1) % 3; // Cycles 0, 1, 2
      onUpdate({ ...task, importance: newImportance });
  };
  
  const handleTogglePinned = () => {
      onUpdate({ ...task, pinned: !task.pinned });
  };

  const handleToggleComplete = () => {
    if(isDependencyIncomplete) return;
    onUpdate({ ...task, completed: !task.completed });
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...task, dueDate: e.target.value || null });
  };

  const handleDependencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? Number(e.target.value) : null;
    onUpdate({ ...task, dependsOn: selectedId });
  };
  
  const isOrange = theme === 'orange';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const borderFocusColor = isOrange ? 'border-orange-500' : 'border-blue-500';
  // Enforce black text in inputs for Orange theme
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  
  const availableDependencies = allTasksInList.filter(t => t.id !== task.id && !t.pinned); // Cannot depend on a pinned task

  const CheckboxWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isDependencyIncomplete && dependencyTask) {
        return <Tooltip text={`Complete "${dependencyTask.description}" first`}>{children}</Tooltip>;
    }
    return <>{children}</>;
  };

  return (
    <div className={`flex items-center p-3 rounded-lg transition-colors ${task.pinned ? (isOrange ? 'bg-orange-900/50' : 'bg-blue-100 dark:bg-blue-900/50') : (task.completed ? 'bg-gray-100 dark:bg-gray-700 opacity-70' : (isOrange ? 'bg-gray-900' : 'bg-white dark:bg-gray-800 shadow-sm'))}`}>
      {/* Complete Checkbox */}
      <CheckboxWrapper>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggleComplete}
          disabled={isDependencyIncomplete}
          className={`h-5 w-5 rounded border-gray-300 ${checkboxColor} ${focusRingColor} ${isDependencyIncomplete ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          aria-label={isDependencyIncomplete ? `Cannot complete task, dependency '${dependencyTask?.description}' is incomplete` : 'Mark task as complete'}
        />
      </CheckboxWrapper>
      
      {/* Pin & Importance */}
      <div className="flex items-center space-x-3 mx-3">
          <PinButton pinned={task.pinned} onClick={handleTogglePinned} />
          <ImportanceFlag level={task.importance} onClick={handleToggleImportance} />
      </div>

      {/* Description */}
      <div className="flex-grow">
        {isEditing ? (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') { setDescription(task.description); setIsEditing(false); } }}
            className={`w-full bg-transparent border-b ${borderFocusColor} focus:outline-none ${inputTextColor} ${isOrange ? 'bg-white/10 rounded px-1' : ''}`}
            autoFocus
          />
        ) : (
          <p onClick={() => setIsEditing(true)} className={`cursor-pointer ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
            {task.description}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-2 md:space-x-3 ml-3 shrink-0">
        <div className="relative">
            <select
                value={task.dependsOn || ''}
                onChange={handleDependencyChange}
                className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-28 md:w-32 appearance-none pr-7 ${inputTextColor}`}
                aria-label="Set task dependency"
            >
                <option value="">Dependency</option>
                {availableDependencies.map(depTask => (
                    <option key={depTask.id} value={depTask.id} title={depTask.description}>
                        {depTask.description.length > 25 ? depTask.description.substring(0, 25) + '...' : depTask.description}
                    </option>
                ))}
            </select>
            <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300 ${inputTextColor}`}>
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
        <input
            type="date"
            value={task.dueDate || ''}
            onChange={handleDateChange}
            className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-28 md:w-32 ${inputTextColor}`}
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
