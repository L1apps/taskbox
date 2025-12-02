
import React, { useState, useMemo } from 'react';
import type { Task, Theme } from '../types';
import Tooltip from './Tooltip';

interface TaskItemProps {
  task: Task;
  theme: Theme;
  allTasksInList: Task[];
  onUpdate: (task: Task) => void;
  onRemove: (taskId: number) => void;
  onCopyRequest: (task: Task) => void;
}

const ImportanceFlag: React.FC<{ level: number; onClick: () => void; }> = ({ level, onClick }) => {
    const levels = [
        { color: 'text-gray-400', label: 'Low Importance' },
        { color: 'text-yellow-500', label: 'Medium Importance' },
        { color: 'text-red-600', label: 'High Importance' },
    ];
    const current = levels[level] || levels[0];

    return (
        <Tooltip text={current.label} debugLabel="Task Importance Toggle">
            <button onClick={onClick} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${current.color}`}>
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
        <Tooltip text={pinned ? "Unpin task" : "Pin task to top"} debugLabel="Task Pin Button">
            <button onClick={onClick} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${pinned ? 'text-blue-500' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                </svg>
            </button>
        </Tooltip>
    );
};

const FocusButton: React.FC<{ focused: boolean; onClick: () => void; disabled: boolean }> = ({ focused, onClick, disabled }) => {
    return (
        <Tooltip text={focused ? "Unfocus Task" : "Focus Task"} debugLabel="Task Focus Toggle">
            <button 
                onClick={onClick} 
                disabled={disabled}
                className={`transition-transform duration-150 ease-in-out hover:scale-125 ${focused ? 'text-blue-600' : 'text-gray-400'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
                {focused ? (
                    // Focused: Circle with Check (Blue)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                ) : (
                    // Unfocused: Circle with Plus
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </button>
        </Tooltip>
    );
};

const TaskItem: React.FC<TaskItemProps> = ({ task, theme, allTasksInList, onUpdate, onRemove, onCopyRequest }) => {
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
      const newImportance = (task.importance + 1) % 3;
      onUpdate({ ...task, importance: newImportance });
  };
  
  const handleTogglePinned = () => {
      onUpdate({ ...task, pinned: !task.pinned });
  };
  
  const handleToggleFocus = () => {
      if (task.completed) return;
      onUpdate({ ...task, focused: !task.focused });
  };

  const handleToggleComplete = () => {
    if(isDependencyIncomplete) return;
    
    const newCompleted = !task.completed;
    const updatedTask = { ...task, completed: newCompleted };

    // If completing the task, remove focus status.
    // This allows the backend validation to pass (which prevents focusing a completed task).
    if (newCompleted) {
        updatedTask.focused = false;
    }

    onUpdate(updatedTask);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...task, dueDate: e.target.value || null });
  };

  const handleDependencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? Number(e.target.value) : null;
    onUpdate({ ...task, dependsOn: selectedId });
  };
  
  const handleCopyClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      onCopyRequest(task);
  };
  
  const isOrange = theme === 'orange';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const borderFocusColor = isOrange ? 'border-orange-500' : 'border-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const readOnlyTextColor = isOrange ? 'text-gray-900' : 'text-gray-500 dark:text-gray-400'; // Changed color slightly for icon
  
  // Fix: Allowed pinned tasks to appear in dependency dropdown
  const availableDependencies = allTasksInList.filter(t => t.id !== task.id);

  const CheckboxWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isDependencyIncomplete && dependencyTask) {
        return <Tooltip text={`Complete "${dependencyTask.description}" first`} align="left" debugLabel="Task Checkbox (Blocked)">{children}</Tooltip>;
    }
    return <Tooltip text="Mark task as complete" align="left" debugLabel="Task Checkbox">{children}</Tooltip>;
  };

  const createdDate = task.createdAt 
    ? new Date(task.createdAt).toLocaleString() 
    : 'N/A';

  return (
    <>
    {/* Screen View */}
    <div className={`print-hidden flex flex-col md:flex-row md:items-center p-3 rounded-lg transition-colors gap-2 md:gap-0 ${task.pinned ? (isOrange ? 'bg-orange-900/50' : 'bg-blue-100 dark:bg-blue-900/50') : (task.completed ? 'bg-gray-100 dark:bg-gray-700 opacity-70' : (isOrange ? 'bg-gray-900' : 'bg-white dark:bg-gray-800 shadow-sm'))}`}>
      
      {/* Left Group */}
      <div className="flex items-center">
        <CheckboxWrapper>
            <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            disabled={isDependencyIncomplete}
            className={`h-5 w-5 rounded border-gray-300 ${checkboxColor} ${focusRingColor} ${isDependencyIncomplete ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} mr-3`}
            />
        </CheckboxWrapper>
        
        <div className="flex items-center space-x-2 mr-3">
            <PinButton pinned={task.pinned} onClick={handleTogglePinned} />
            <ImportanceFlag level={task.importance} onClick={handleToggleImportance} />
            <FocusButton focused={task.focused} onClick={handleToggleFocus} disabled={task.completed} />
        </div>
      </div>

      {/* Description */}
      <div className="flex-grow min-w-0 flex items-center group/desc">
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
          <>
              <p 
                onClick={() => setIsEditing(true)} 
                className={`cursor-pointer break-words whitespace-normal ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}
              >
                {task.description}
              </p>
              <div className="opacity-0 group-hover/desc:opacity-100 transition-opacity ml-2 shrink-0 self-start mt-1">
                 <Tooltip text="Copy / Move" debugLabel="Task Copy/Move Button">
                    <button onClick={handleCopyClick} className="text-gray-400 hover:text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                 </Tooltip>
              </div>
          </>
        )}
      </div>

      {/* Controls Group */}
      <div className="flex items-center justify-end space-x-2 shrink-0 md:ml-4 mt-2 md:mt-0">
        <div className="relative">
            <Tooltip text="Set task dependency" debugLabel="Task Dependency Dropdown">
                <select
                    value={task.dependsOn || ''}
                    onChange={handleDependencyChange}
                    className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-28 md:w-32 appearance-none pr-7 ${inputTextColor} cursor-pointer`}
                >
                    <option value="">None</option>
                    {availableDependencies.map(depTask => (
                        <option key={depTask.id} value={depTask.id} title={depTask.description}>
                            {depTask.description.length > 25 ? depTask.description.substring(0, 25) + '...' : depTask.description}
                        </option>
                    ))}
                </select>
                <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300 ${inputTextColor}`}>
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </Tooltip>
        </div>
        
        <Tooltip text={`Created: ${createdDate}`} debugLabel="Task Creation Date">
            <div className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent w-10 text-center text-xs flex items-center justify-center cursor-default ${readOnlyTextColor}`}>
                {/* Rectangular Clock Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        </Tooltip>

        <Tooltip text="Set Due Date" debugLabel="Task Due Date Input">
            <input
                type="date"
                value={task.dueDate || ''}
                onChange={handleDateChange}
                className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-32 ${inputTextColor} cursor-pointer`}
            />
        </Tooltip>
        
        <Tooltip text="Delete task" align="right" debugLabel="Task Delete Button">
            <button
            onClick={() => onRemove(task.id)}
            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            </button>
        </Tooltip>
      </div>
    </div>

    {/* Print View Only - Clean Simple Line with Fixed Checkbox Size */}
    <div className="hidden print-visible flex items-start py-2 border-b border-gray-300">
        <div 
            className="border-2 border-black mr-4 flex items-center justify-center text-black shrink-0" 
            style={{ width: '16px', height: '16px', marginTop: '4px' }}
        >
            {task.completed && <span className="font-bold text-lg leading-none" style={{ fontSize: '14px' }}>✓</span>}
        </div>
        <div className="flex-grow text-black text-lg">
             {task.description}
        </div>
    </div>
    </>
  );
};

export default TaskItem;
