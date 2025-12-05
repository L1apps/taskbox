
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
    fetchData,
    reorderListTasks,
    globalViewPersistence 
  } = useTaskBox();
  
  const { openModal } = useModal();

  const [listPersistence, setListPersistence] = useState<boolean>(true);
  const [sort, setSort] = useState<SortOption>(SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showFocusedOnly, setShowFocusedOnly] = useState<boolean>(false);
  // Grouping Mode: 0 = Default (Flat), 1 = Grouped by Parent (All), 2 = Grouped Only
  const [dependencyMode, setDependencyMode] = useState<number>(0);
  
  const [isCustomSortEnabled, setIsCustomSortEnabled] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  const [localSearch, setLocalSearch] = React.useState('');
  const [warningMessage, setWarningMessage] = React.useState<string | null>(null);

  useEffect(() => {
      if (!activeList?.id) return;

      const overrideKey = `taskbox-persistence-override-${activeList.id}`;
      const storedOverride = localStorage.getItem(overrideKey);
      
      let shouldPersist = globalViewPersistence;
      if (storedOverride !== null) shouldPersist = storedOverride === 'true';
      setListPersistence(shouldPersist);

      let initSort = SortOption.DEFAULT;
      let initShowCompleted = false;
      let initShowFocused = false;
      let initDepMode = 0;
      let initCustomSort = false;

      if (shouldPersist) {
          try {
              const savedState = JSON.parse(localStorage.getItem(`taskbox-view-state-${activeList.id}`) || '{}');
              if (savedState.sort) initSort = savedState.sort;
              if (savedState.showCompleted !== undefined) initShowCompleted = savedState.showCompleted;
              if (savedState.showFocusedOnly !== undefined) initShowFocused = savedState.showFocusedOnly;
              if (savedState.dependencyMode !== undefined) initDepMode = savedState.dependencyMode;
          } catch (e) {
              console.error("Error loading view state", e);
          }
      }

      const storedCustomSort = localStorage.getItem(`taskbox-custom-sort-${activeList.id}`);
      if (storedCustomSort === 'true') initCustomSort = true;

      setSort(initSort);
      setShowCompleted(initShowCompleted);
      setShowFocusedOnly(initShowFocused);
      setDependencyMode(initDepMode);
      setIsCustomSortEnabled(initCustomSort);
      setLocalSearch('');
      setDraggedTask(null);
      
  }, [activeList?.id, globalViewPersistence]);

  useEffect(() => {
      if (!activeList?.id) return;
      if (listPersistence) {
          const stateToSave = { sort, showCompleted, showFocusedOnly, dependencyMode };
          localStorage.setItem(`taskbox-view-state-${activeList.id}`, JSON.stringify(stateToSave));
      }
  }, [sort, showCompleted, showFocusedOnly, dependencyMode, activeList?.id, listPersistence]);
  
  const toggleCustomSort = () => {
      if (!activeList) return;
      const newValue = !isCustomSortEnabled;
      setIsCustomSortEnabled(newValue);
      localStorage.setItem(`taskbox-custom-sort-${activeList.id}`, String(newValue));
  };

  const toggleListPersistence = () => {
      if (!activeList) return;
      const newValue = !listPersistence;
      setListPersistence(newValue);
      localStorage.setItem(`taskbox-persistence-override-${activeList.id}`, String(newValue));
      if (!newValue) {
          localStorage.removeItem(`taskbox-view-state-${activeList.id}`);
      } else {
          const stateToSave = { sort, showCompleted, showFocusedOnly, dependencyMode };
          localStorage.setItem(`taskbox-view-state-${activeList.id}`, JSON.stringify(stateToSave));
      }
  };

  if (!activeList) {
      return <div className="p-16 text-center text-gray-500 flex flex-col justify-center h-full">Select a list or create one.</div>;
  }

  const list = activeList;
  const isContainer = list.children && list.children.length > 0;
  const tasks = list.tasks || [];
  const isEmpty = tasks.length === 0;

  const permission = list.currentUserPermission || 'OWNER';
  const isReadOnly = permission === 'VIEW';
  const canDelete = permission === 'FULL' || permission === 'OWNER';

  const handlePurgeCompleted = () => { 
      if(window.confirm('Purge completed?')) { 
          apiFetch(`/api/lists/${activeList.id}/tasks/completed`, {method:'DELETE'}).then(fetchData); 
      }
  };
  
  const handlePrint = () => window.print();

  const handleToggleAllTasks = async (completed: boolean) => {
      if (isReadOnly) return;
      try {
          await apiFetch(`/api/lists/${activeList.id}/tasks/bulk-status`, {
              method: 'PUT',
              body: JSON.stringify({ completed })
          });
          fetchData();
      } catch (e) { console.error("Failed to toggle tasks", e); }
  };

  const cycleDependencyMode = () => setDependencyMode((prev) => (prev + 1) % 3);

  // Parent-Child Grouping Logic
  const groupTasksByParent = (taskList: Task[]) => {
      const childrenMap = new Map<number, Task[]>();
      const taskMap = new Map<number, Task>();
      
      taskList.forEach(t => {
          taskMap.set(t.id, t);
          if (t.parentTaskId) {
              if (!childrenMap.has(t.parentTaskId)) childrenMap.set(t.parentTaskId, []);
              childrenMap.get(t.parentTaskId)!.push(t);
          }
      });

      const roots = taskList.filter(t => !t.parentTaskId || !taskMap.has(t.parentTaskId));
      const result: { task: Task; depth: number }[] = [];
      const processed = new Set<number>();

      const flatten = (task: Task, depth: number) => {
          if (processed.has(task.id)) return;
          processed.add(task.id);
          result.push({ task, depth });
          const children = childrenMap.get(task.id) || [];
          children.forEach(child => flatten(child, depth + 1));
      };

      roots.forEach(root => flatten(root, 0));
      return result;
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
      setDraggedTask(task);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData("text/plain", String(task.id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
      e.preventDefault();
      if (!draggedTask || draggedTask.id === targetTask.id) return;
      
      const allTasksSorted = [...tasks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const sourceIndex = allTasksSorted.findIndex(t => t.id === draggedTask.id);
      const targetIndex = allTasksSorted.findIndex(t => t.id === targetTask.id);

      if (sourceIndex === -1 || targetIndex === -1) return;

      const [removed] = allTasksSorted.splice(sourceIndex, 1);
      allTasksSorted.splice(targetIndex, 0, removed);

      const updates = allTasksSorted.map((t, index) => ({ id: t.id, sortOrder: index + 1 }));
      await reorderListTasks(list.id, updates);
      setDraggedTask(null);
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => showCompleted || !task.completed);
    
    if (showFocusedOnly) filteredTasks = filteredTasks.filter(t => t.focused);
    if (localSearch) filteredTasks = filteredTasks.filter(t => t.description.toLowerCase().includes(localSearch.toLowerCase()));

    const pinnedTasks = filteredTasks.filter(t => t.pinned);
    const unpinnedTasks = filteredTasks.filter(t => !t.pinned);

    // Calculate actual parents for this list
    const parentIds = new Set(tasks.map(t => t.parentTaskId).filter((id): id is number => id !== null && id !== undefined));

    const compareValues = (a: any, b: any, type: 'string' | 'number' | 'date' | 'boolean', direction: 'asc' | 'desc') => {
        let valA = a ?? '';
        let valB = b ?? '';
        if (type === 'string') {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (type === 'date') {
             return direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        }
        if (type === 'boolean') { valA = Number(a); valB = Number(b); }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    const sortTasks = (taskList: Task[]) => {
        if (isCustomSortEnabled && dependencyMode === 0) {
             return taskList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        }
        return taskList.sort((a, b) => {
             if (isCustomSortEnabled) return (a.sortOrder || 0) - (b.sortOrder || 0);
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
                case SortOption.RELATIONSHIP_ASC:
                case SortOption.RELATIONSHIP_DESC:
                    // Priority: Is a Parent OR Is a Child
                    const isParentA = parentIds.has(a.id);
                    const isChildA = !!a.parentTaskId;
                    const hasRelA = isParentA || isChildA;

                    const isParentB = parentIds.has(b.id);
                    const isChildB = !!b.parentTaskId;
                    const hasRelB = isParentB || isChildB;

                    const dir = sort === SortOption.RELATIONSHIP_ASC ? -1 : 1; // -1 Puts relationships at top

                    if (hasRelA !== hasRelB) {
                        return hasRelA ? dir : -dir;
                    }
                    
                    // Secondary sort by description
                    return a.description.localeCompare(b.description);
                default: return a.id - b.id;
            }
        });
    };
    
    if (isCustomSortEnabled && dependencyMode === 0) {
        return sortTasks([...filteredTasks]).map(task => ({ task, depth: 0 }));
    }

    const sortedPinned = sortTasks([...pinnedTasks]);
    const sortedUnpinned = sortTasks([...unpinnedTasks]);
    const combined = [...sortedPinned, ...sortedUnpinned];

    if (dependencyMode === 0) return combined.map(task => ({ task, depth: 0 }));

    let grouped = groupTasksByParent(combined);
    
    if (dependencyMode === 2) {
        const parents = new Set(combined.filter(t => t.parentTaskId).map(t => t.parentTaskId));
        const hasChildren = (id: number) => parents.has(id);
        grouped = grouped.filter(item => !!item.task.parentTaskId || hasChildren(item.task.id));
    }

    return grouped;
  }, [tasks, sort, showCompleted, showFocusedOnly, dependencyMode, localSearch, isCustomSortEnabled]);

  const completionStats = useMemo(() => {
    if (tasks.length === 0) return { percent: 0, completed: 0, total: 0 };
    const completedCount = tasks.filter(t => t.completed).length;
    return { percent: Math.round((completedCount / tasks.length) * 100), completed: completedCount, total: tasks.length };
  }, [tasks]);
  
  const allVisibleCompleted = useMemo(() => {
      if (sortedAndFilteredTasks.length === 0) return false;
      return sortedAndFilteredTasks.every(t => t.task.completed);
  }, [sortedAndFilteredTasks]);
  
  const hasCompletedTasks = useMemo(() => tasks.some(t => t.completed), [tasks]);

  const handleSortClick = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (isCustomSortEnabled) return;
      if (sort === optionAsc) setSort(optionDesc);
      else if (sort === optionDesc) setSort(SortOption.DEFAULT);
      else setSort(optionAsc);
  };

  const getSortIcon = (optionAsc: SortOption, optionDesc: SortOption) => {
      if (isCustomSortEnabled) return null;
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
        const colorClass = dependencyMode > 0 ? (isOrange ? 'text-orange-500' : 'text-blue-500') : 'text-gray-400';
       return (
           <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
       );
  };

  const getDependencyToggleText = () => {
      if (dependencyMode === 0) return "Show Grouped Tasks";
      if (dependencyMode === 1) return "Show Only Grouped Tasks";
      return "Show tasks without Grouping"; 
  };

  const isDragEnabled = isCustomSortEnabled && !localSearch;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full relative print:block print:h-auto print:overflow-visible">
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
              <button onClick={() => handleToggleAllTasks(!allVisibleCompleted)} disabled={isReadOnly} className={`p-2 rounded-md border ${isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {allVisibleCompleted 
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      }
                  </svg>
              </button>
          </Tooltip>

          <div className="relative flex-grow max-w-xs">
              <input type="text" placeholder="Filter current list..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className={`block w-full pl-8 pr-10 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputBg}`} />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                 <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              {localSearch && (
                  <button onClick={() => setLocalSearch('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              )}
          </div>

          <div className="flex items-center space-x-2 flex-grow sm:flex-grow-0 sm:ml-auto">
              <Tooltip text={listPersistence ? "Disable Saved View" : "Enable Saved View"} debugLabel="Persistence Toggle">
                  <button onClick={toggleListPersistence} className={`p-2 rounded-md border transition-colors ${listPersistence ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}>
                     {listPersistence ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                     )}
                  </button>
              </Tooltip>

              <Tooltip text={isCustomSortEnabled ? "Disable Custom Order" : "Enable Custom Order"} debugLabel="Custom Sort Toggle">
                  <button onClick={toggleCustomSort} className={`p-2 rounded-md border transition-colors ${isCustomSortEnabled ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="17" y2="16" /></svg>
                  </button>
              </Tooltip>

              <Tooltip text={showFocusedOnly ? "Hide only Focused Tasks" : "Show only Focused Tasks"} debugLabel="Focus Filter Toggle">
                  <button onClick={() => setShowFocusedOnly(!showFocusedOnly)} className={`p-2 rounded-md border transition-colors ${showFocusedOnly ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
              </Tooltip>

              <Tooltip text={getDependencyToggleText()} debugLabel="Dependency Filter Toggle">
                  <button onClick={cycleDependencyMode} className={`p-2 rounded-md border transition-colors ${dependencyMode > 0 ? (isOrange ? 'bg-orange-900/50 border-orange-500' : 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-500') : (isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700')}`}>
                      {getDependencyToggleIcon()}
                  </button>
              </Tooltip>

              <Tooltip text={showCompleted ? "Hide Completed tasks" : "Show Completed tasks"} debugLabel="Completed Filter Toggle">
                  <button onClick={() => setShowCompleted(!showCompleted)} className={`p-2 rounded-md border transition-colors ${showCompleted ? (isOrange ? 'bg-orange-900/50 border-orange-500 text-orange-400' : 'bg-blue-100 border-blue-400 text-blue-600 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-400') : (isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500')}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          {showCompleted ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />}
                      </svg>
                  </button>
              </Tooltip>

              {!isContainer && (
                <Tooltip text={isEmpty ? "List is empty" : "Print List"} debugLabel="Print View Button">
                     <button onClick={handlePrint} disabled={isEmpty} className={`p-2 rounded-md border transition-colors ${isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500 hover:text-orange-400' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500'} disabled:opacity-30 disabled:cursor-not-allowed`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                     </button>
                </Tooltip>
              )}

              <button onClick={handlePurgeCompleted} disabled={!hasCompletedTasks || !canDelete} className={`px-3 py-2 text-white text-sm rounded-md transition flex items-center space-x-2 ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>Purge Completed</span>
              </button>
          </div>
      </div>

      <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor} no-print`}>
          <div className={`w-[120px] text-center mr-3 flex items-center justify-start group ${isCustomSortEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`} onClick={() => handleSortClick(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}>
              <Tooltip text="Sort by Importance">
                  <div className="flex items-center">IMPORTANCE {getSortIcon(SortOption.IMPORTANCE_ASC, SortOption.IMPORTANCE_DESC)}</div>
              </Tooltip>
          </div>
          <div className={`flex-grow min-w-[150px] flex items-center group ${isCustomSortEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`} onClick={() => handleSortClick(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}>
              <Tooltip text="Sort by Description">
                  <div className="flex items-center">Task Description {getSortIcon(SortOption.DESCRIPTION_ASC, SortOption.DESCRIPTION_DESC)}</div>
              </Tooltip>
          </div>
          <div className="flex items-center justify-end space-x-2 shrink-0 ml-4">
              <div className={`w-28 md:w-32 text-center group ${isCustomSortEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`} onClick={() => handleSortClick(SortOption.RELATIONSHIP_ASC, SortOption.RELATIONSHIP_DESC)}>
                  <Tooltip text="Sort by Dependencies">
                      <div className="flex items-center justify-center">DEPENDENCIES {getSortIcon(SortOption.RELATIONSHIP_ASC, SortOption.RELATIONSHIP_DESC)}</div>
                  </Tooltip>
              </div>
              <div className={`w-10 text-center flex items-center justify-center group ${isCustomSortEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`} onClick={() => handleSortClick(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}>
                  <Tooltip text="Date Created">
                      <div className="flex items-center">DC {getSortIcon(SortOption.CREATED_DATE_ASC, SortOption.CREATED_DATE_DESC)}</div>
                  </Tooltip>
              </div>
              <div className={`w-32 text-center flex items-center justify-center group ${isCustomSortEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`} onClick={() => handleSortClick(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}>
                  <Tooltip text="Sort by Due Date">
                      <div className="flex items-center">Due Date {getSortIcon(SortOption.DUE_DATE_ASC, SortOption.DUE_DATE_DESC)}</div>
                  </Tooltip>
              </div>
              <div className="w-5"></div>
          </div>
      </div>

      <div className="space-y-3 flex-grow overflow-y-auto no-scrollbar pb-4 print:overflow-visible print:h-auto">
          {sortedAndFilteredTasks.map(({ task, depth }) => {
              return (
              <div key={task.id} style={{ marginLeft: `${depth * 1}rem` }}>
                  <TaskItem 
                    task={task} 
                    allTasksInList={tasks} 
                    onUpdate={updateTask} 
                    onRemove={removeTask} 
                    onCopyRequest={(t) => openModal('COPY_TASK', { task: t })}
                    theme={theme}
                    readOnly={isReadOnly}
                    canDelete={canDelete}
                    isCustomSort={isDragEnabled && dependencyMode === 0}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
              </div>
              );
          })}
          {sortedAndFilteredTasks.length === 0 && <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0 no-print">
          {!isReadOnly && <AddTaskForm onAddTask={(desc) => addTask(list.id, desc)} onWarning={setWarningMessage} theme={theme} currentTasks={tasks} isContainer={isContainer} />}
          <div className="mt-4">
              <div className="flex justify-between mb-1 items-baseline">
                <span className={`text-base font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>Completion <span className="text-xs text-gray-500 font-normal ml-1">({completionStats.completed} out of {completionStats.total})</span></span>
                <span className={`text-sm font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>{completionStats.percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${completionStats.percent}%` }}></div>
              </div>
          </div>
      </div>
      
      {warningMessage && <WarningModal message={warningMessage} onClose={() => setWarningMessage(null)} theme={theme} />}
    </div>
  );
};

export default TaskListView;
