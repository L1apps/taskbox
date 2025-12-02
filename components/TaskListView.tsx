
import React, { useMemo } from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';
import { useModal } from '../contexts/ModalContext';
import { SortOption, Task } from '../types';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import Tooltip from './Tooltip';
import WarningModal from './WarningModal';
import useLocalStorage from '../hooks/useLocalStorage';

const TaskListView: React.FC = () => {
  const { 
    activeList, 
    theme, 
    updateTask, 
    addTask, 
    removeTask, 
    apiFetch, 
    fetchData 
  } = useTaskBox();
  
  const { openModal } = useModal();

  // Changed to useLocalStorage to persist state across re-renders and list switches
  const [sort, setSort] = useLocalStorage<SortOption>('taskbox-sort-preference', SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useLocalStorage<boolean>('taskbox-show-completed', true);
  const [showFocusedOnly, setShowFocusedOnly] = useLocalStorage<boolean>('taskbox-show-focused-only', false);
  
  // Dependency View Mode: 0 = Default, 1 = Grouped + All, 2 = Grouped Dependencies Only
  const [dependencyMode, setDependencyMode] = useLocalStorage<number>('taskbox-dependency-mode', 0);
  
  const [localSearch, setLocalSearch] = React.useState('');
  const [warningMessage, setWarningMessage] = React.useState<string | null>(null);

  if (!activeList) {
      return <div className="p-16 text-center text-gray-500 flex flex-col justify-center h-full">Select a list or create one.</div>;
  }

  const list = activeList;
  const isContainer = list.children && list.children.length > 0;
  const tasks = list.tasks || [];
  const isEmpty = tasks.length === 0;

  // Helper to map task IDs to tasks for dependency lookup
  const allTasksMap = useMemo(() => {
      const map = new Map<number, Task>();
      tasks.forEach(t => map.set(t.id, t));
      return map;
  }, [tasks]);

  const handlePurgeCompleted = () => { 
      if(window.confirm('Purge completed?')) { 
          apiFetch(`/api/lists/${activeList.id}/tasks/completed`, {method:'DELETE'}).then(fetchData); 
      }
  };
  
  const handlePrint = () => {
      window.print();
  };

  const handleToggleAllTasks = async (completed: boolean) => {
      try {
          await apiFetch(`/api/lists/${activeList.id}/tasks/bulk-status`, {
              method: 'PUT',
              body: JSON.stringify({ completed })
          });
          fetchData();
      } catch (e) {
          console.error("Failed to toggle tasks", e);
      }
  };

  // Cycle dependency mode: 0 -> 1 -> 2 -> 0
  const cycleDependencyMode = () => {
      setDependencyMode((prev) => (prev + 1) % 3);
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => showCompleted || !task.completed);
    
    // Filter Focused Only
    if (showFocusedOnly) {
        filteredTasks = filteredTasks.filter(t => t.focused);
    }

    // Filter Dependencies Only (Mode 2)
    if (dependencyMode === 2) {
        // Show tasks that have dependencies OR are dependencies for others in this list
        filteredTasks = filteredTasks.filter(t => {
            const isWaiting = !!t.dependsOn;
            const isNeeded = tasks.some(other => other.dependsOn === t.id);
            return isWaiting || isNeeded;
        });
    }
    
    // Local Search Filter
    if (localSearch) {
        const q = localSearch.toLowerCase();
        filteredTasks = filteredTasks.filter(t => t.description.toLowerCase().includes(q));
    }

    const pinnedTasks = filteredTasks.filter(t => t.pinned);
    const unpinnedTasks = filteredTasks.filter(t => !t.pinned);

    // Helper for robust safe sorting
    const compareValues = (a: any, b: any, type: 'string' | 'number' | 'date' | 'boolean', direction: 'asc' | 'desc') => {
        // Handle null/undefined/empty - push to bottom usually
        const isEmptyA = a === null || a === undefined || a === '';
        const isEmptyB = b === null || b === undefined || b === '';

        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1; // A is empty, goes to end
        if (isEmptyB) return -1; // B is empty, goes to end

        let valA = a;
        let valB = b;

        if (type === 'string') {
            valA = String(a).toLowerCase();
            valB = String(b).toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (type === 'date') {
             // Treat dates as strings for comparison but ensure valid
             valA = String(a);
             valB = String(b);
             return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (type === 'boolean') {
            valA = Number(a);
            valB = Number(b);
        }

        // Numbers/Booleans
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    const sortTasks = (taskList: Task[]) => {
        // Special logic for Dependency sorting to group pairs
        // Force grouping if dependencyMode is 1 or 2
        const isDependencySort = dependencyMode > 0;

        if (isDependencySort) {
            // First, do a base sort (ID or CreatedAt) to ensure stability within groups
            const baseSorted = [...taskList].sort((a,b) => a.id - b.id);
            
            // Group by dependency relationships
            // Logic: If task A depends on task B, try to keep them together.
            return baseSorted.sort((a, b) => {
                // If a depends on b, b comes first (or vice versa based on direction)
                if (a.dependsOn === b.id) return 1;
                if (b.dependsOn === a.id) return -1;
                
                // Grouping: Sort by the 'chain ID' (either the ID it depends on, or its own ID if root)
                const chainA = a.dependsOn || a.id;
                const chainB = b.dependsOn || b.id;
                
                if (chainA !== chainB) {
                    return chainA - chainB;
                }
                
                // Secondary sort if in same chain
                return a.id - b.id;
            });
        }

        return taskList.sort((a, b) => {
            switch (sort) {
                case SortOption.DESCRIPTION_ASC: return compareValues(a.description, b.description, 'string', 'asc');
                case SortOption.DESCRIPTION_DESC: return compareValues(a.description, b.description, 'string', 'desc');
                case SortOption.DUE_DATE_ASC: return compareValues(a.dueDate, b.dueDate, 'date', 'asc');
                case SortOption.DUE_DATE_DESC: return compareValues(a.dueDate, b.dueDate, 'date', 'desc');
                case SortOption.CREATED_DATE_ASC: return compareValues(a.createdAt, b.createdAt, 'date', 'asc');
                case SortOption.CREATED_DATE_DESC: return compareValues(a.createdAt, b.createdAt, 'date', 'desc');
                case SortOption.COMPLETED_ASC: return compareValues(a.completed, b.completed, 'boolean', 'asc');
                case SortOption.COMPLETED_DESC: return compareValues(a.completed, b.completed, 'boolean', 'desc');
                case SortOption.IMPORTANCE_ASC: return compareValues(a.importance, b.importance, 'number', 'asc');
                case SortOption.IMPORTANCE_DESC: return compareValues(a.importance, b.importance, 'number', 'desc');
                default: return a.id - b.id;
            }
        });
    };

    const sortedPinned = sortTasks([...pinnedTasks]);
    const sortedUnpinned = sortTasks([...unpinnedTasks]);

    return [...sortedPinned, ...sortedUnpinned];
  }, [tasks, sort, showCompleted, showFocusedOnly, dependencyMode, localSearch]);

  const completionStats = useMemo(() => {
    if (tasks.length === 0) return { percent: 0, completed: 0, total: 0 };
    const completedCount = tasks.filter(t => t.completed).length;
    const percent = Math.round((completedCount / tasks.length) * 100);
    return { percent, completed: completedCount, total: tasks.length };
  }, [tasks]);
  
  const allVisibleCompleted = useMemo(() => {
      if (sortedAndFilteredTasks.length === 0) return false;
      return sortedAndFilteredTasks.every(t => t.completed);
  }, [sortedAndFilteredTasks]);
  
  const hasCompletedTasks = useMemo(() => {
      return tasks.some(t => t.completed);
  }, [tasks]);

  const handleSortClick = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (sort === optionAsc) setSort(optionDesc);
      else if (sort === optionDesc) setSort(SortOption.DEFAULT);
      else setSort(optionAsc);
  };

  const getSortIcon = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (sort === optionAsc) return <span className="ml-1 text-xs">▲</span>;
      if (sort === optionDesc) return <span className="ml-1 text-xs">▼</span>;
      return <span className="ml-1 text-xs opacity-0 group-hover:opacity-50">▲▼</span>;
  };

  const isOrange = theme === 'orange';
  const progressColor = isOrange ? 'bg-orange-500' : 'bg-blue-500';
  const buttonColor = isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700';
  const headerTextColor = isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
  const inputBg = isOrange ? 'bg-gray-800 text-gray-100 border-gray-600' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100';

  const getDependencyToggleIcon = () => {
      if (dependencyMode === 0) {
          // Default: Gray
          return (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
          );
      } else if (dependencyMode === 1) {
          // Grouped + All: Blue
          return (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
          );
      } else {
          // Dependencies Only: Purple
          return (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
          );
      }
  };

  const getDependencyToggleText = () => {
      if (dependencyMode === 0) return "Show Dependency Groups";
      if (dependencyMode === 1) return "Show only Dependency Groups";
      return "Hide only Dependency Groups";
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full relative print:block print:h-auto print:overflow-visible">
      {/* List Header - Always visible */}
      <div className="flex justify-between items-center mb-6">
          <div className="w-full">
            {/* Print Only Header */}
            <div className="hidden print-visible pb-4 mb-4 border-b border-black w-full">
                <h1 className="text-2xl font-bold text-black">{list.title}</h1>
            </div>
            
            <h2 className={`text-2xl sm:text-3xl font-bold print-hidden ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>{list.title}</h2>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center flex-wrap no-print">
          {/* Bulk Toggle */}
          <Tooltip text="Check or Uncheck all" align="left" debugLabel="Bulk Task Toggle">
              <button
                  onClick={() => handleToggleAllTasks(!allVisibleCompleted)}
                  className={`p-2 rounded-md border ${isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'} transition-colors`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {allVisibleCompleted 
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      }
                  </svg>
              </button>
          </Tooltip>

          {/* Local List Search */}
          <div className="relative flex-grow max-w-xs">
              <input 
                  type="text" 
                  placeholder="Filter current list..." 
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className={`block w-full pl-8 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputBg}`}
              />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                 <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
              </div>
              {localSearch && (
                  <button 
                      onClick={() => setLocalSearch('')}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
              )}
          </div>

          <div className="flex items-center space-x-2 flex-grow sm:flex-grow-0 sm:ml-auto">
              
              {/* Filter Focused Only Toggle */}
              <Tooltip text={showFocusedOnly ? "Hide only Focused Tasks" : "Show only Focused Tasks"} debugLabel="Focus Filter Toggle">
                  <button
                      onClick={() => setShowFocusedOnly(!showFocusedOnly)}
                      className={`p-2 rounded-md border transition-colors ${showFocusedOnly 
                          ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') 
                          : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                  </button>
              </Tooltip>

              {/* Show Dependencies Toggle - 3 way */}
              <Tooltip text={getDependencyToggleText()} debugLabel="Dependency Filter Toggle">
                  <button
                      onClick={cycleDependencyMode}
                      className={`p-2 rounded-md border transition-colors ${dependencyMode > 0 
                          ? (isOrange ? 'bg-orange-900/50 border-orange-500' : 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-500') 
                          : (isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700')}`}
                  >
                      {getDependencyToggleIcon()}
                  </button>
              </Tooltip>

              {/* Show Completed Icon Toggle */}
              <Tooltip text={showCompleted ? "Hide Completed tasks" : "Show Completed tasks"} debugLabel="Completed Filter Toggle">
                  <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className={`p-2 rounded-md border transition-colors ${showCompleted 
                          ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') 
                          : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}
                  >
                      {showCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                      ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                      )}
                  </button>
              </Tooltip>

              {/* Print Button - Only for task lists, not containers. Also disabled if empty. */}
              {!isContainer && (
                <Tooltip text={isEmpty ? "List is empty" : "Print List"} debugLabel="Print View Button">
                     <button
                        onClick={handlePrint}
                        disabled={isEmpty}
                        className={`p-2 rounded-md border transition-colors ${isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500 hover:text-orange-400' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500'} disabled:opacity-30 disabled:cursor-not-allowed`}
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                         </svg>
                     </button>
                </Tooltip>
              )}

              <button
                  onClick={handlePurgeCompleted}
                  disabled={!hasCompletedTasks}
                  className={`px-3 py-2 text-white text-sm rounded-md transition flex items-center space-x-2 ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>Purge Completed</span>
              </button>
          </div>
      </div>

      {/* Sortable Header Row - Fixed Alignment */}
      <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor} no-print`}>
          {/* Matches TaskItem Left Group: Checkbox + Icons (~120px) */}
          <div className="w-[120px] text-center mr-3 cursor-pointer hover:text-blue-500 flex items-center justify-start group" onClick={() => handleSortClick(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}>
              <Tooltip text="Sort by Priority">
                  <div className="flex items-center">
                      PRIORITY {getSortIcon(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}
                  </div>
              </Tooltip>
          </div>
          
          <div className="flex-grow min-w-[150px] cursor-pointer hover:text-blue-500 flex items-center group" onClick={() => handleSortClick(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}>
              <Tooltip text="Sort by Description">
                  <div className="flex items-center">
                      Task Description {getSortIcon(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}
                  </div>
              </Tooltip>
          </div>
          
          {/* Matches TaskItem Controls Group */}
          <div className="flex items-center justify-end space-x-2 shrink-0 ml-4">
              <div className="w-28 md:w-32 text-center">
                  <span>Dependency</span>
              </div>
              <div className="w-10 text-center cursor-pointer hover:text-blue-500 flex items-center justify-center group" onClick={() => handleSortClick(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}>
                  <Tooltip text="Date Created">
                      <div className="flex items-center">
                          DC {getSortIcon(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}
                      </div>
                  </Tooltip>
              </div>
              <div className="w-32 text-center cursor-pointer hover:text-blue-500 flex items-center justify-center group" onClick={() => handleSortClick(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}>
                  <Tooltip text="Sort by Due Date">
                      <div className="flex items-center">
                          Due Date {getSortIcon(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}
                      </div>
                  </Tooltip>
              </div>
              <div className="w-5"></div>
          </div>
      </div>

      <div className="space-y-3 flex-grow overflow-y-auto no-scrollbar pb-4 print:overflow-visible print:h-auto">
          {sortedAndFilteredTasks.map(task => {
              const dependencyName = task.dependsOn ? allTasksMap.get(task.dependsOn)?.description : null;
              
              return (
              <div key={task.id}>
                  <TaskItem 
                    task={task} 
                    allTasksInList={tasks} 
                    onUpdate={updateTask} 
                    onRemove={removeTask} 
                    onCopyRequest={(t) => openModal('COPY_TASK', { task: t })}
                    theme={theme} 
                  />
                  {dependencyMode > 0 && dependencyName && (
                      <div className={`ml-8 mt-1 p-2 text-sm rounded border-l-2 flex items-center gap-2 ${isOrange ? 'border-orange-500 bg-gray-800 text-gray-300' : 'border-blue-400 bg-blue-50 dark:bg-gray-700 dark:text-gray-300'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Waiting on: <strong>{dependencyName}</strong></span>
                      </div>
                  )}
              </div>
              );
          })}
          {sortedAndFilteredTasks.length === 0 && <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0 no-print">
          <AddTaskForm 
            onAddTask={(desc) => addTask(list.id, desc)} 
            onWarning={setWarningMessage} 
            theme={theme} 
            currentTasks={tasks} 
            isContainer={isContainer} 
          />
          <div className="mt-4">
              <div className="flex justify-between mb-1 items-baseline">
                <span className={`text-base font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>
                    Completion <span className="text-xs text-gray-500 font-normal ml-1">({completionStats.completed} out of {completionStats.total})</span>
                </span>
                <span className={`text-sm font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>{completionStats.percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${completionStats.percent}%` }}></div>
              </div>
          </div>
      </div>
      
      {warningMessage && (
          <WarningModal 
            message={warningMessage} 
            onClose={() => setWarningMessage(null)} 
            theme={theme} 
          />
      )}
    </div>
  );
};

export default TaskListView;
