
import React, { useMemo, useState, useEffect } from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';
import { useModal } from '../contexts/ModalContext';
import TaskItem from './TaskItem';
import { Task, SortOption } from '../types';
import Tooltip from './Tooltip';
import useLocalStorage from '../hooks/useLocalStorage';

const GlobalTaskListView: React.FC = () => {
    const { lists, specialView, theme, updateTask, removeTask } = useTaskBox();
    const { openModal } = useModal();
    
    // State for local view controls
    const [sort, setSort] = useLocalStorage<SortOption>('taskbox-global-sort', SortOption.DEFAULT);
    const [showCompleted, setShowCompleted] = useLocalStorage<boolean>('taskbox-global-show-completed', false);
    
    // Dependency View Mode: 0 = Default, 1 = Grouped + All, 2 = Grouped Dependencies Only
    // Changed to useState to ensure it resets when switching lists/views as requested
    const [dependencyMode, setDependencyMode] = useState<number>(0);

    const [localSearch, setLocalSearch] = React.useState('');
    const [showListFilter, setShowListFilter] = useState(false);
    
    // Default to all lists selected initially. State stores IDs of excluded lists.
    const [excludedListIds, setExcludedListIds] = useState<Set<number>>(new Set());

    // Reset filter and dependency mode when switching special views
    useEffect(() => {
        setExcludedListIds(new Set());
        // If "Dependent Tasks" sidebar item is clicked, default to mode 2
        if (specialView === 'dependencies') {
            setDependencyMode(2);
        } else {
            setDependencyMode(0);
        }
    }, [specialView]);

    const filterMenuRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
                setShowListFilter(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Helper to get all dependency tasks regardless of filter
    const allTasksMap = useMemo(() => {
        const map = new Map<number, Task>();
        lists.forEach(l => l.tasks?.forEach(t => map.set(t.id, t)));
        return map;
    }, [lists]);

    const rawTasks = useMemo(() => {
        const allTasks: { task: Task; listTitle: string }[] = [];
        lists.forEach(list => {
            // Check filter
            if (excludedListIds.has(list.id)) return;

            if (list.tasks) {
                list.tasks.forEach(task => {
                    let match = false;
                    if (specialView === 'all') match = true;
                    if (specialView === 'importance' && task.importance === 2) match = true;
                    if (specialView === 'pinned' && task.pinned) match = true;
                    
                    // Special Logic: Sidebar "Dependent Tasks"
                    if (specialView === 'dependencies' && task.dependsOn) match = true;
                    
                    if (specialView === 'focused' && task.focused) match = true;

                    if (match) {
                        allTasks.push({ task, listTitle: list.title });
                    }
                });
            }
        });
        return allTasks;
    }, [lists, specialView, excludedListIds]);

    // Cycle dependency mode: 0 -> 1 -> 2 -> 0
    const cycleDependencyMode = () => {
        setDependencyMode((prev) => (prev + 1) % 3);
    };

    const sortedAndFilteredResults = useMemo(() => {
        let processed = rawTasks.filter(({ task }) => {
            if (!showCompleted && task.completed) return false;
            if (localSearch && !task.description.toLowerCase().includes(localSearch.toLowerCase())) return false;
            
            // Dependency Mode 2: Show only dependencies
            // We check if the task IS a dependency (isNeeded) OR HAS a dependency (isWaiting)
            // But for simple visualization, usually "has dependency" is what we group.
            if (dependencyMode === 2) {
                const isWaiting = !!task.dependsOn;
                // If we also want to show parent tasks, we'd need to scan all. 
                // For now, consistent with other views: show tasks that are part of a chain.
                if (!isWaiting) return false;
            }

            return true;
        });

        // Sorting Logic
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

        const sortTasks = (taskList: typeof processed) => {
            // Only group if mode > 0
            const isDependencySort = dependencyMode > 0;

            if (isDependencySort) {
                const baseSorted = [...taskList].sort((a,b) => a.task.id - b.task.id);
                return baseSorted.sort((aItem, bItem) => {
                    const a = aItem.task;
                    const b = bItem.task;
                    // If a depends on b, b comes first
                    if (a.dependsOn === b.id) return 1;
                    if (b.dependsOn === a.id) return -1;
                    
                    const chainA = a.dependsOn || a.id;
                    const chainB = b.dependsOn || b.id;
                    
                    if (chainA !== chainB) return chainA - chainB;
                    return a.id - b.id;
                });
            }

            return taskList.sort((aItem, bItem) => {
                const a = aItem.task;
                const b = bItem.task;
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
                        if (a.importance !== b.importance) return b.importance - a.importance;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
            });
        };

        return sortTasks(processed);
    }, [rawTasks, showCompleted, localSearch, sort, dependencyMode]);

    const isOrange = theme === 'orange';
    const highlightColor = isOrange ? 'text-orange-400' : 'text-blue-600 dark:text-blue-400';
    const headerTextColor = isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
    const inputBg = isOrange ? 'bg-gray-800 text-gray-100 border-gray-600' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100';

    const getTitle = () => {
        switch(specialView) {
            case 'all': return 'All Tasks';
            case 'importance': return 'High Importance';
            case 'pinned': return 'Pinned Tasks';
            case 'dependencies': return 'Dependent Tasks';
            case 'focused': return 'Focused';
            default: return 'Global View';
        }
    };

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

    const handlePrint = () => {
        window.print();
    };

    const toggleListExclusion = (id: number) => {
        setExcludedListIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (excludedListIds.size > 0) {
            // Some excluded -> Select All (clear exclusions)
            setExcludedListIds(new Set());
        } else {
            // All selected -> Deselect All (exclude everything)
            const allIds = new Set(lists.map(l => l.id));
            setExcludedListIds(allIds);
        }
    };

    const getDependencyToggleIcon = () => {
        if (dependencyMode === 2) {
             return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            );
        }
        if (dependencyMode === 1) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            );
        }
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        );
    };

    const getDependencyToggleText = () => {
        if (dependencyMode === 0) return "Show Dependency Groups";
        if (dependencyMode === 1) return "Show only Dependency Groups";
        return "Hide only Dependency Groups";
    };

    const isAllSelected = excludedListIds.size === 0;

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full relative print:block print:h-auto print:overflow-visible">
            <div className="mb-6 flex justify-between items-center">
                 <div className="w-full">
                    {/* Print Only Header */}
                    <div className="hidden print-visible pb-4 mb-4 border-b border-black w-full">
                        <h1 className="text-2xl font-bold text-black">{getTitle()}</h1>
                    </div>
                    
                    <h2 className={`text-2xl sm:text-3xl font-bold print-hidden ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>
                        {getTitle()}
                    </h2>
                    <p className="text-gray-500 mt-2 print-hidden">
                        {specialView === 'focused' 
                            ? 'Your active focus list.' 
                            : 'Showing active tasks from all lists.'}
                    </p>
                 </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center flex-wrap no-print relative z-10">
                {/* Local Search */}
                <div className="relative flex-grow max-w-xs">
                    <input 
                        type="text" 
                        placeholder="Filter current view..." 
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
                    {/* List Filter Button */}
                    <div className="relative" ref={filterMenuRef}>
                        <Tooltip text="Filter List">
                            <button
                                onClick={() => setShowListFilter(!showListFilter)}
                                className={`flex items-center px-3 py-2 rounded-md border transition-colors ${isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-400' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filter
                            </button>
                        </Tooltip>
                        {showListFilter && (
                            <div className={`absolute right-0 mt-2 w-64 rounded-md shadow-lg py-2 z-50 max-h-80 overflow-y-auto ${isOrange ? 'bg-gray-800 border border-gray-700' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}`}>
                                <div className={`flex justify-between items-center px-4 py-2 border-b ${isOrange ? 'border-gray-700' : 'border-gray-200 dark:border-gray-600'}`}>
                                    <div className={`text-xs font-semibold uppercase ${isOrange ? 'text-gray-500' : 'text-gray-400'}`}>Select Lists</div>
                                    <button 
                                        onClick={toggleSelectAll} 
                                        className={`hover:text-blue-500 transition-colors ${isOrange ? 'text-gray-400' : 'text-gray-500'}`}
                                        title={isAllSelected ? "Deselect All" : "Select All"}
                                    >
                                        {isAllSelected ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {lists.map(l => (
                                    <label key={l.id} className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${isOrange ? 'hover:bg-gray-700' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={!excludedListIds.has(l.id)} 
                                            onChange={() => toggleListExclusion(l.id)}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className={`ml-2 text-sm truncate ${isOrange ? 'text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>{l.title}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dependency View Toggle */}
                    <Tooltip text={getDependencyToggleText()} debugLabel="Global Dependency Toggle">
                        <button
                            onClick={cycleDependencyMode}
                            className={`p-2 rounded-md border transition-colors ${dependencyMode > 0
                                ? (isOrange ? 'bg-orange-900/50 border-orange-500' : 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-500') 
                                : (isOrange ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700')}`}
                        >
                            {getDependencyToggleIcon()}
                        </button>
                    </Tooltip>

                    <Tooltip text={showCompleted ? "Hide Completed tasks" : "Show Completed tasks"} debugLabel="Global Completed Toggle">
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

                    <Tooltip text={sortedAndFilteredResults.length === 0 ? "List is empty" : "Print List"}>
                         <button
                            onClick={handlePrint}
                            disabled={sortedAndFilteredResults.length === 0}
                            className={`p-2 rounded-md border transition-colors ${isOrange ? 'border-gray-600 hover:bg-gray-800 text-gray-500 hover:text-orange-400' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500'} disabled:opacity-30 disabled:cursor-not-allowed`}
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                             </svg>
                         </button>
                    </Tooltip>
                </div>
            </div>

            {/* Sort Headers - Fixed Alignment */}
            <div className={`hidden md:flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-2 ${headerTextColor} no-print`}>
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

            <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar pb-4 print:overflow-visible print:h-auto">
                {sortedAndFilteredResults.length > 0 ? (
                    sortedAndFilteredResults.map(({ task, listTitle }) => {
                        const dependencyName = task.dependsOn && allTasksMap.get(task.dependsOn)?.description;
                        
                        return (
                            <div key={task.id} className="relative">
                                <div className="mb-1 flex justify-between items-end print-hidden">
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${highlightColor}`}>
                                        {listTitle}
                                    </span>
                                </div>
                                <TaskItem 
                                    task={task}
                                    allTasksInList={lists.find(l => l.id === task.list_id)?.tasks || []}
                                    onUpdate={updateTask}
                                    onRemove={removeTask}
                                    onCopyRequest={(t) => openModal('COPY_TASK', { task: t })}
                                    theme={theme}
                                />
                                {/* Dependency Visualization for Global View */}
                                {(dependencyMode > 0 || specialView === 'dependencies') && task.dependsOn && dependencyName && (
                                    <div className={`ml-8 mt-1 p-2 text-sm rounded border-l-2 flex items-center gap-2 ${isOrange ? 'border-orange-500 bg-gray-800 text-gray-300' : 'border-blue-400 bg-blue-50 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Waiting on: <strong>{dependencyName || 'Unknown Task'}</strong></span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        {specialView === 'focused' 
                            ? 'No tasks focused.' 
                            : 'No active tasks found matching criteria.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalTaskListView;
