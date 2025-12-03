
import React, { useMemo, useState, useEffect } from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';
import { useModal } from '../contexts/ModalContext';
import { SortOption, Task } from '../types';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import Tooltip from './Tooltip';
import WarningModal from './WarningModal';

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

  const [sort, setSort] = useState<SortOption>(SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showFocusedOnly, setShowFocusedOnly] = useState<boolean>(false);
  const [dependencyMode, setDependencyMode] = useState<number>(0);
  
  const [localSearch, setLocalSearch] = React.useState('');
  const [warningMessage, setWarningMessage] = React.useState<string | null>(null);

  // Reset view state when switching lists
  useEffect(() => {
      setSort(SortOption.DEFAULT);
      setShowCompleted(false);
      setShowFocusedOnly(false);
      setDependencyMode(0);
      setLocalSearch('');
  }, [activeList?.id]);

  if (!activeList) {
      return <div className="p-16 text-center text-gray-500 flex flex-col justify-center h-full">Select a list or create one.</div>;
  }

  const list = activeList;
  const isContainer = list.children && list.children.length > 0;
  const tasks = list.tasks || [];
  const isEmpty = tasks.length === 0;

  // Determine Permissions
  const permission = list.currentUserPermission || 'OWNER';
  const isReadOnly = permission === 'VIEW';
  const canDelete = permission === 'FULL' || permission === 'OWNER'; // MODIFY cannot delete tasks

  const handlePurgeCompleted = () => { 
      if(window.confirm('Purge completed?')) { 
          apiFetch(`/api/lists/${activeList.id}/tasks/completed`, {method:'DELETE'}).then(fetchData); 
      }
  };
  
  const handlePrint = () => {
      window.print();
  };

  const handleToggleAllTasks = async (completed: boolean) => {
      if (isReadOnly) return;
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

  const cycleDependencyMode = () => {
      setDependencyMode((prev) => (prev + 1) % 3);
  };

  // Grouping helper similar to Global View but for simple Task array
  const groupTasksByDependency = (taskList: Task[]) => {
      const processed = new Set<number>();
      const result: { task: Task; depth: number }[] = [];
      const taskMap = new Map<number, Task>();
      taskList.forEach(t => taskMap.set(t.id, t));

      for (const task of taskList) {
          if (processed.has(task.id)) continue;

          result.push({ task, depth: 0 });
          processed.add(task.id);

          let current = task;
          let depth = 0;
          // Limit depth matching API
          while(current.dependsOn && depth < 5) {
              const depId = current.dependsOn;
              if (taskMap.has(depId) && !processed.has(depId)) {
                  const depTask = taskMap.get(depId)!;
                  depth++;
                  result.push({ task: depTask, depth });
                  processed.add(depId);
                  current = depTask;
              } else {
                  break;
              }
          }
      }
      return result;
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => showCompleted || !task.completed);
    
    if (showFocusedOnly) {
        filteredTasks = filteredTasks.filter(t => t.focused);
    }

    if (localSearch) {
        const q = localSearch.toLowerCase();
        filteredTasks = filteredTasks.filter(t => t.description.toLowerCase().includes(q));
    }

    const pinnedTasks = filteredTasks.filter(t => t.pinned);
    const unpinnedTasks = filteredTasks.filter(t => !t.pinned);

    const compareValues = (a: any, b: any, type: 'string' | 'number' | 'date' | 'boolean', direction: 'asc' | 'desc') => {
        const isEmptyA = a === null || a === undefined || a === '';
        const isEmptyB = b === null || b === undefined || b === '';

        if (isEmptyA && isEmptyB) return 0;
        if (isEmptyA) return 1;
        if (isEmptyB) return -1;

        let valA = a;
        let valB = b;

        if (type === 'string') {
            valA = String(a).toLowerCase();
            valB = String(b).toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (type === 'date') {
             valA = String(a);
             valB = String(b);
             return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (type === 'boolean') {
            valA = Number(a);
            valB = Number(b);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    const sortTasks = (taskList: Task[]) => {
        const isDependencySort = dependencyMode > 0;

        // If Dependency Mode is ON, force sorting to put Dependents first to act as group anchors
        const sorted = taskList.sort((a, b) => {
            if (isDependencySort) {
                const aDep = !!a.dependsOn;
                const bDep = !!b.dependsOn;
                if (aDep && !bDep) return -1; 
                if (!aDep && bDep) return 1;
            }

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
                default: 
                    // Default Sort: ID ASC (Creation Order effectively, or user preference)
                    return a.id - b.id;
            }
        });
        return sorted;
    };

    const sortedPinned = sortTasks([...pinnedTasks]);
    const sortedUnpinned = sortTasks([...unpinnedTasks]);
    
    const combined = [...sortedPinned, ...sortedUnpinned];

    if (dependencyMode === 0) return combined.map(task => ({ task, depth: 0 }));

    let grouped = groupTasksByDependency(combined);
    
    if (dependencyMode === 2) {
        const dependencyIds = new Set(combined.filter(t => t.dependsOn).map(t => t.dependsOn));
        grouped = grouped.filter(item => !!item.task.dependsOn || dependencyIds.has(item.task.id));
    }

    return grouped;
  }, [tasks, sort, showCompleted, showFocusedOnly, dependencyMode, localSearch]);

  const completionStats = useMemo(() => {
    if (tasks.length === 0) return { percent: 0, completed: 0, total: 0 };
    const completedCount = tasks.filter(t => t.completed).length;
    const percent = Math.round((completedCount / tasks.length) * 100);
    return { percent, completed: completedCount, total: tasks.length };
  }, [tasks]);
  
  const allVisibleCompleted = useMemo(() => {
      if (sortedAndFilteredTasks.length === 0) return false;
      return sortedAndFilteredTasks.every(t => t.task.completed);
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
        const colorClass = dependencyMode > 0 
            ? (isOrange ? 'text-orange-500' : 'text-blue-500') 
            : 'text-gray-400';
            
       return (
           <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
       );
  };

  const getDependencyToggleText = () => {
      if (dependencyMode === 0) return "Group by Dependency";
      if (dependencyMode === 1) return "Show only Dependency Groups";
      return "Hide only Dependency Groups";
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full relative print:block print:h-auto print:overflow-visible">
      {/* List Header */}
      <div className="flex justify-between items-center mb-6">
          <div className="w-full">
            <div className="hidden print-visible pb-4 mb-4 border-b border-black w-full">
                <h1 className="text-2xl font-bold text-black">{list.title}</h1>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold print-hidden ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>
                {list.title}
                {isReadOnly && <span className="ml-3 text-xs font-normal border border-gray-400 rounded px-2 py-1 text-gray-500">View Only</span>}
            </h2>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center flex-wrap no-print">
          <Tooltip text="Check or Uncheck all" align="left" debugLabel="Bulk Task Toggle">
              <button
                  onClick={() => handleToggleAllTasks(!allVisibleCompleted)}
                  disabled={isReadOnly}
                  className={`p-2 rounded-md border ${isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {allVisibleCompleted 
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      }
                  </svg>
              </button>
          </Tooltip>

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
              
              <Tooltip text={showFocusedOnly ? "Hide only Focused Tasks" : "Show only Focused Tasks"} debugLabel="Focus Filter Toggle">
                  <button
                      onClick={() => setShowFocusedOnly(!showFocusedOnly)}
                      className={`p-2 rounded-md border transition-colors ${showFocusedOnly 
                          ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') 
                          : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}
                  >
                     {/* Lightning Bolt Icon - Consistent with TaskItem */}
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                  </button>
              </Tooltip>

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

              <Tooltip text={showCompleted ? "Hide Completed tasks" : "Show Completed tasks"} debugLabel="Completed Filter Toggle">
                  <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className={`p-2 rounded-md border transition-colors ${showCompleted 
                          ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') 
                          : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          {showCompleted ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          )}
                      </svg>
                  </button>
              </Tooltip>

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
                  disabled={!hasCompletedTasks || !canDelete}
                  className={`px-3 py-2 text-white text-sm rounded-md transition flex items-center space-x-2 ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>Purge Completed</span>
              </button>
          </div>
      </div>

      {/* Sortable Header Row */}
      <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor} no-print`}>
          {/* Matches TaskItem Left Group: Checkbox + Icons (~120px) */}
          <div className="w-[120px] text-center mr-3 cursor-pointer hover:text-blue-500 flex items-center justify-start group" onClick={() => handleSortClick(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}>
              <Tooltip text="Sort by Importance">
                  <div className="flex items-center">
                      IMPORTANCE {getSortIcon(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}
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
          {sortedAndFilteredTasks.map(({ task, depth }) => {
              return (
              <div key={task.id} style={{ marginLeft: `${depth * 1.5}rem` }}>
                  <TaskItem 
                    task={task} 
                    allTasksInList={tasks} 
                    onUpdate={updateTask} 
                    onRemove={removeTask} 
                    onCopyRequest={(t) => openModal('COPY_TASK', { task: t })}
                    theme={theme}
                    readOnly={isReadOnly}
                    canDelete={canDelete}
                  />
              </div>
              );
          })}
          {sortedAndFilteredTasks.length === 0 && <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0 no-print">
          {!isReadOnly && (
            <AddTaskForm 
                onAddTask={(desc) => addTask(list.id, desc)} 
                onWarning={setWarningMessage} 
                theme={theme} 
                currentTasks={tasks} 
                isContainer={isContainer} 
            />
          )}
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
