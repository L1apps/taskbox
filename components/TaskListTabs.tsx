
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTaskBox, SpecialViewType } from '../contexts/TaskBoxContext';
import { useModal } from '../contexts/ModalContext';
import type { TaskListWithUsers, Theme } from '../types';
import Tooltip from './Tooltip';

interface ListTreeItemProps {
    list: TaskListWithUsers;
    allLists: TaskListWithUsers[];
    activeListId: number | null;
    depth: number;
    onSelect: (id: number) => void;
    theme: Theme;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
    onPin: (listId: number, pinned: boolean) => void;
    sortDesc: boolean;
}

// Optimization: Memoize the tree item
const ListTreeItem: React.FC<ListTreeItemProps> = React.memo(({ 
    list, allLists, activeListId, depth, onSelect, theme, expandedIds, toggleExpand, onPin, sortDesc
}) => {
    const isOrange = theme === 'orange';
    
    // Sort children based on preference
    const children = useMemo(() => {
        return allLists.filter(l => l.parentId === list.id).sort((a, b) => {
             // Always prioritize pinned items
             if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
             // Sort Alpha Asc/Desc
             return sortDesc ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
        });
    }, [allLists, list.id, sortDesc]);

    const isExpanded = expandedIds.has(list.id);
    
    const isMaster = list.parentId === null;
    
    const isActive = activeListId === list.id;
    const baseClass = `flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors duration-200 select-none mb-1 group relative`;
    const activeClass = isOrange 
        ? 'bg-orange-900/40 text-orange-500' 
        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
    const inactiveClass = isOrange 
        ? 'text-gray-400 hover:bg-white/10' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

    return (
        <div style={{ marginLeft: `${depth * 12}px` }}>
            <div 
                className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
                onClick={() => onSelect(list.id)}
            >
                <div className="flex items-center min-w-0 overflow-hidden w-full">
                    {children.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(list.id); }} className="mr-1 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    ) : <span className="w-4 mr-1 shrink-0"></span>}
                    
                    {isMaster ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 shrink-0 ${isOrange ? 'text-orange-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 shrink-0 ${isOrange ? 'text-orange-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )}
                    
                    <span className="truncate text-sm font-medium" title={list.title}>{list.title}</span>
                </div>
                
                {(list.pinned || isActive) && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onPin(list.id, !list.pinned); }}
                        className={`ml-1 shrink-0 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 ${list.pinned ? (isOrange ? 'text-orange-500' : 'text-blue-500') : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
                        title={list.pinned ? "Unpin List" : "Pin List to Top"}
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                         </svg>
                     </button>
                )}
            </div>
            
            {isExpanded && children.map(child => (
                <ListTreeItem 
                    key={child.id} 
                    list={child} 
                    allLists={allLists}
                    activeListId={activeListId}
                    depth={depth + 1}
                    onSelect={onSelect}
                    theme={theme}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onPin={onPin}
                    sortDesc={sortDesc}
                />
            ))}
        </div>
    );
});

const TaskListTabs: React.FC = () => {
    const { 
        lists, 
        activeListId, 
        setActiveListId, 
        removeList, 
        theme, 
        setSpecialView,
        specialView,
        apiFetch, 
        fetchData
    } = useTaskBox();
    
    const { openModal } = useModal();
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [sortDesc, setSortDesc] = useState(false);

    const toggleExpand = useCallback((id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    
    const handleToggleExpandAll = () => {
        if (expandedIds.size > 0) {
            setExpandedIds(new Set());
        } else {
            const parents = new Set<number>();
            lists.forEach(l => {
                if (lists.some(c => c.parentId === l.id)) {
                    parents.add(l.id);
                }
            });
            setExpandedIds(parents);
        }
    };

    // Auto-expand parents of active list
    useEffect(() => {
        if (activeListId) {
            const active = lists.find(l => l.id === activeListId);
            if (active && active.parentId) {
                setExpandedIds(prev => {
                    const next = new Set(prev);
                    let curr = active;
                    while (curr.parentId) {
                        next.add(curr.parentId);
                        const parent = lists.find(l => l.id === curr.parentId);
                        if (!parent) break;
                        curr = parent;
                    }
                    return next;
                });
            }
        }
    }, [activeListId, lists]);

    const handlePin = useCallback(async (listId: number, pinned: boolean) => {
        try {
            await apiFetch(`/api/lists/${listId}`, {
                method: 'PUT',
                body: JSON.stringify({ pinned })
            });
            fetchData();
        } catch (e) {
            console.error("Failed to pin list", e);
        }
    }, [apiFetch, fetchData]);

    const isOrange = theme === 'orange';
    const specialViewBaseClass = `flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors duration-200 select-none mb-1 text-sm font-medium`;
    const getSpecialViewClass = (view: SpecialViewType) => {
        if (specialView === view) {
             return isOrange ? 'bg-orange-900/40 text-orange-500' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
        }
        return isOrange ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';
    };

    const rootLists = useMemo(() => {
        const roots = lists.filter(l => l.parentId === null);
        return roots.sort((a, b) => {
             // Priority: Pinned > Alpha
             if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
             return sortDesc ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
        });
    }, [lists, sortDesc]);
    
    return (
        <div className="flex flex-col h-full overflow-hidden">
             <div className="p-4 shrink-0 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h2 className={`font-semibold tracking-wider ${isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>LISTS</h2>
                <div className="flex items-center space-x-1">
                    <Tooltip text={expandedIds.size > 0 ? "Collapse All" : "Expand All"} debugLabel="Sidebar Expand/Collapse All">
                        <button onClick={handleToggleExpandAll} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-gray-400' : 'text-gray-500'}`}>
                            {expandedIds.size > 0 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </Tooltip>
                    <Tooltip text={sortDesc ? "Sort Z-A" : "Sort A-Z"} debugLabel="Sidebar Sort Toggle">
                        <button onClick={() => setSortDesc(!sortDesc)} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-gray-400 hover:text-orange-500' : 'text-gray-500 hover:text-blue-500'}`}>
                            {sortDesc ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                </svg>
                            )}
                        </button>
                    </Tooltip>
                    <Tooltip text={lists.length > 0 ? "Add List" : "Create List"} align="right" debugLabel="Sidebar Add List Button">
                        <button onClick={() => openModal('ADD_LIST')} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-orange-500' : 'text-blue-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
            
            {/* List Actions (Moved to Top) */}
            {activeListId && (
                <div className={`p-2 border-b border-gray-200 dark:border-gray-700 ${isOrange ? 'bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <div className="flex justify-around">
                        <Tooltip text="List Settings / Share" align="left" debugLabel="Active List Settings">
                            <button onClick={() => { 
                                const l = lists.find(x => x.id === activeListId); 
                                if (l) openModal('SHARE_LIST', { list: l });
                            }} className="p-2 text-gray-500 hover:text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                        </Tooltip>
                        <Tooltip text="Rename List" debugLabel="Active List Rename">
                             <button onClick={() => {
                                 const l = lists.find(x => x.id === activeListId); 
                                 if (l) openModal('RENAME_LIST', { list: l });
                             }} className="p-2 text-gray-500 hover:text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                        </Tooltip>
                        <Tooltip text="Move List" debugLabel="Active List Move">
                             <button onClick={() => {
                                 const l = lists.find(x => x.id === activeListId); 
                                 if (l) openModal('MOVE_LIST', { list: l });
                             }} className="p-2 text-gray-500 hover:text-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                        </Tooltip>
                        <Tooltip text="Merge List" debugLabel="Active List Merge">
                             <button onClick={() => {
                                 const l = lists.find(x => x.id === activeListId); 
                                 if (l) openModal('MERGE_LIST', { list: l });
                             }} className="p-2 text-gray-500 hover:text-yellow-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            </button>
                        </Tooltip>
                         <Tooltip text="Delete List" align="right" debugLabel="Active List Delete">
                             <button onClick={() => removeList(activeListId)} className="p-2 text-gray-500 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-y-auto p-2 no-scrollbar">
                {/* Global Views Section */}
                <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                     <div className={specialViewBaseClass + ' ' + getSpecialViewClass('all')} onClick={() => setSpecialView('all')}>
                        {/* Globe Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        All Tasks
                     </div>
                     <div className={specialViewBaseClass + ' ' + getSpecialViewClass('focused')} onClick={() => setSpecialView('focused')}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Focused
                     </div>
                     <div className={specialViewBaseClass + ' ' + getSpecialViewClass('importance')} onClick={() => setSpecialView('importance')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 4a1 1 0 011-1h1.5a1 1 0 01.6.2l1.9 1.9 1.9-1.9a1 1 0 01.6-.2H18a1 1 0 011 1v10a1 1 0 01-1 1h-1.5a1 1 0 01-.6-.2l-1.9-1.9-1.9 1.9a1 1 0 01-.6.2H5a1 1 0 01-1-1V4z" />
                            <path d="M4 16v5a1 1 0 11-2 0V4a1 1 0 011-1h1v13H4z" />
                        </svg>
                        Importance
                     </div>
                     <div className={specialViewBaseClass + ' ' + getSpecialViewClass('pinned')} onClick={() => setSpecialView('pinned')}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                         </svg>
                         Pinned Tasks
                     </div>
                     <div className={specialViewBaseClass + ' ' + getSpecialViewClass('dependencies')} onClick={() => setSpecialView('dependencies')}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                         </svg>
                         Dependent Tasks
                     </div>
                </div>

                {/* Lists Tree */}
                {rootLists.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">No lists created.</div>
                ) : (
                    rootLists.map(list => (
                        <ListTreeItem 
                            key={list.id} 
                            list={list} 
                            allLists={lists} 
                            activeListId={activeListId} 
                            depth={0} 
                            onSelect={setActiveListId} 
                            theme={theme}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                            onPin={handlePin}
                            sortDesc={sortDesc}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default TaskListTabs;
