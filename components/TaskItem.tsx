
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
  readOnly?: boolean;
  canDelete?: boolean;
  isCustomSort?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, targetTask: Task) => void;
}

const ImportanceFlag: React.FC<{ level: number; onClick: () => void; disabled?: boolean }> = ({ level, onClick, disabled }) => {
    const levels = [
        { color: 'text-gray-400', label: 'Low Importance' },
        { color: 'text-yellow-500', label: 'Medium Importance' },
        { color: 'text-red-600', label: 'High Importance' },
    ];
    const current = levels[level] || levels[0];

    return (
        <Tooltip text={current.label} debugLabel="Task Importance Toggle">
            <button onClick={onClick} disabled={disabled} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${current.color} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4a1 1 0 011-1h1.5a1 1 0 01.6.2l1.9 1.9 1.9-1.9a1 1 0 01.6-.2H18a1 1 0 011 1v10a1 1 0 01-1 1h-1.5a1 1 0 01-.6-.2l-1.9-1.9-1.9 1.9a1 1 0 01-.6.2H5a1 1 0 01-1-1V4z" />
                    <path d="M4 16v5a1 1 0 11-2 0V4a1 1 0 011-1h1v13H4z" />
                </svg>
            </button>
        </Tooltip>
    );
};

const PinButton: React.FC<{ pinned: boolean; onClick: () => void; disabled?: boolean }> = ({ pinned, onClick, disabled }) => {
    return (
        <Tooltip text={pinned ? "Unpin task" : "Pin task to top"} debugLabel="Task Pin Button">
            <button onClick={onClick} disabled={disabled} className={`transition-transform duration-150 ease-in-out hover:scale-125 ${pinned ? 'text-blue-500' : 'text-gray-400'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </button>
        </Tooltip>
    );
};

const TaskItem: React.FC<TaskItemProps> = ({ 
    task, 
    theme, 
    allTasksInList, 
    onUpdate, 
    onRemove, 
    onCopyRequest, 
    readOnly = false, 
    canDelete = true,
    isCustomSort = false,
    onDragStart,
    onDragOver,
    onDrop
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description);

  const handleUpdate = () => {
    if (readOnly) return;
    if (description.trim()) {
        onUpdate({ ...task, description: description.trim() });
        setIsEditing(false);
    } else {
        setDescription(task.description);
        setIsEditing(false);
    }
  };
  
  const handleToggleImportance = () => {
      if (readOnly) return;
      const newImportance = (task.importance + 1) % 3;
      onUpdate({ ...task, importance: newImportance });
  };
  
  const handleTogglePinned = () => {
      if (readOnly) return;
      onUpdate({ ...task, pinned: !task.pinned });
  };
  
  const handleToggleFocus = () => {
      if (readOnly || task.completed) return;
      onUpdate({ ...task, focused: !task.focused });
  };

  // 1. Am I a Parent? (Do I have children?)
  const amIAParent = useMemo(() => {
      return allTasksInList.some(t => t.parentTaskId === task.id);
  }, [allTasksInList, task.id]);

  // 2. Can I be completed?
  const hasIncompleteChildren = useMemo(() => {
      return allTasksInList.some(t => t.parentTaskId === task.id && !t.completed);
  }, [allTasksInList, task.id]);

  const handleToggleComplete = () => {
    if (readOnly) return;
    
    if (!task.completed && hasIncompleteChildren) {
        alert("Cannot complete a Parent Task while it has incomplete sub-tasks.");
        return;
    }

    const newCompleted = !task.completed;
    const updatedTask = { ...task, completed: newCompleted };
    if (newCompleted) updatedTask.focused = false;
    onUpdate(updatedTask);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...task, dueDate: e.target.value || null });
  };

  // Compute current dropdown value based on complex state
  const dropdownValue = useMemo(() => {
      if (task.parentTaskId) return task.parentTaskId.toString();
      if (task.isParentSelectable) return '__ACTIVE__';
      return '__INACTIVE__';
  }, [task.parentTaskId, task.isParentSelectable]);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    
    // 3. Prevent Inactive state if I am a parent (Req 5.3)
    if (val === '__INACTIVE__' && amIAParent) {
        alert("Cannot set to Inactive. This task has sub-tasks attached. Please detach children first.");
        return;
    }

    // 4. Prevent becoming a child if I am a parent (Req 5.2 - Single Level)
    if (val !== '__ACTIVE__' && val !== '__INACTIVE__' && amIAParent) {
        alert("This task has sub-tasks. It cannot become a sub-task itself (Single level hierarchy).");
        return;
    }

    if (val === '__ACTIVE__') {
        onUpdate({ ...task, parentTaskId: null, isParentSelectable: true });
    } else if (val === '__INACTIVE__') {
        onUpdate({ ...task, parentTaskId: null, isParentSelectable: false });
    } else {
        const pid = Number(val);
        // Req 5.4: Child cannot be a parent -> so set isParentSelectable to false implicitly
        onUpdate({ ...task, parentTaskId: pid, isParentSelectable: false });
    }
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
  const readOnlyTextColor = isOrange ? 'text-gray-900' : 'text-gray-500 dark:text-gray-400';
  
  // Available Parents logic:
  // Req 1: Single-level only. Parent -> Child. No grandchildren.
  const availableParents = useMemo(() => {
      // If I am a parent, I cannot see *any* parents to select (preventing level 2 nesting)
      if (amIAParent) return [];

      return allTasksInList.filter(t => 
          t.id !== task.id && // Not self
          t.isParentSelectable && // Must be Active
          !t.parentTaskId // Target MUST NOT be a child (enforce single level)
      );
  }, [allTasksInList, task.id, amIAParent]);

  const CheckboxWrapper = ({ children }: { children: React.ReactNode }) => {
    if (readOnly) return <div className="opacity-50 cursor-not-allowed">{children}</div>;
    const tooltipText = hasIncompleteChildren 
        ? "Cannot complete: Sub-tasks are still active" 
        : "Mark task as complete";
    return <Tooltip text={tooltipText} align="left" debugLabel="Task Checkbox">{children}</Tooltip>;
  };

  const createdDate = task.createdAt 
    ? new Date(task.createdAt).toLocaleString() 
    : 'N/A';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (isCustomSort && onDragStart) onDragStart(e, task);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      if (isCustomSort && onDrop) onDrop(e, task);
  };

  return (
    <>
    <div 
        className={`print-hidden flex flex-col md:flex-row md:items-center p-3 rounded-lg transition-colors gap-2 md:gap-0 ${task.pinned ? (isOrange ? 'bg-orange-900/50' : 'bg-blue-100 dark:bg-blue-900/50') : (task.completed ? 'bg-gray-100 dark:bg-gray-700 opacity-70' : (isOrange ? 'bg-gray-900' : 'bg-white dark:bg-gray-800 shadow-sm'))} ${isCustomSort ? 'cursor-grab active:cursor-grabbing' : ''}`}
        draggable={isCustomSort}
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={handleDrop}
    >
      <div className="flex items-center">
        {isCustomSort && (
            <div className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                </svg>
            </div>
        )}

        <CheckboxWrapper>
            <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            disabled={readOnly || (!task.completed && hasIncompleteChildren)}
            className={`h-5 w-5 rounded border-gray-300 ${checkboxColor} ${focusRingColor} ${readOnly || (!task.completed && hasIncompleteChildren) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} mr-3`}
            />
        </CheckboxWrapper>
        
        <div className="flex items-center space-x-2 mr-3">
            <PinButton pinned={task.pinned} onClick={handleTogglePinned} disabled={readOnly} />
            <ImportanceFlag level={task.importance} onClick={handleToggleImportance} disabled={readOnly} />
            <FocusButton focused={task.focused} onClick={handleToggleFocus} disabled={task.completed || readOnly} />
        </div>
      </div>

      <div className="flex-grow min-w-0 flex items-center group/desc">
        {isEditing ? (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleUpdate}
            maxLength={102}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') { setDescription(task.description); setIsEditing(false); } }}
            className={`w-full bg-transparent border-b ${borderFocusColor} focus:outline-none ${inputTextColor} ${isOrange ? 'bg-white/10 rounded px-1' : ''}`}
            autoFocus
          />
        ) : (
          <>
              <p 
                onClick={() => !readOnly && setIsEditing(true)} 
                className={`break-words whitespace-normal ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
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

      <div className="flex items-center justify-end space-x-2 shrink-0 md:ml-4 mt-2 md:mt-0">
        <div className="relative">
            <Tooltip text="Task Relationship" debugLabel="Task Parent Dropdown">
                <select
                    value={dropdownValue}
                    onChange={handleParentChange}
                    disabled={readOnly || amIAParent}
                    className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-28 md:w-32 appearance-none pr-7 ${inputTextColor} ${readOnly || amIAParent ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                >
                    <option value="__ACTIVE__">{amIAParent ? "Assigned" : "Active"}</option>
                    <option value="__INACTIVE__">Inactive</option>
                    {availableParents.length > 0 && (
                        <optgroup label="Select Parent Task">
                            {availableParents.map(parentTask => (
                                <option key={parentTask.id} value={parentTask.id}>
                                    {parentTask.description.length > 20 ? parentTask.description.substring(0, 20) + '...' : parentTask.description}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
                <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300 ${inputTextColor}`}>
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                </div>
            </Tooltip>
        </div>
        
        <Tooltip text={`Created: ${createdDate}`} debugLabel="Task Creation Date">
            <div className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent w-10 text-center text-xs flex items-center justify-center cursor-default ${readOnlyTextColor}`}>
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
                disabled={readOnly}
                className={`text-sm p-1 rounded bg-gray-200 dark:bg-gray-700 border border-transparent focus:outline-none w-32 ${inputTextColor} ${readOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
            />
        </Tooltip>
        
        {canDelete && (
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
        )}
      </div>
    </div>

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
