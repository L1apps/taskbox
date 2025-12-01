
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';
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
}

// Optimization: Memoize the tree item to avoid re-rendering entire tree when one item updates or parent state changes irrelevant to the tree
const ListTreeItem: React.FC<ListTreeItemProps> = React.memo(({ 
    list, allLists, activeListId, depth, onSelect, theme, expandedIds, toggleExpand, onPin
}) => {
    const isOrange = theme === 'orange';
    const children = allLists.filter(l => l.parentId === list.id);
    const isExpanded = expandedIds.has(list.id);
    
    // Determine Icon based on List Type (Master/Container vs Sublist)
    const isMaster = list.parentId === null;
    
    // Style logic
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
                    {/* Expand/Collapse for parents */}
                    {children.length > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(list.id); }} className="mr-1 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    ) : <span className="w-4 mr-1 shrink-0"></span>}
                    
                    {/* Distinct Icons */}
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
                
                {/* Pin Button - Show if pinned or on hover (only for Master Lists usually, but logic allows all) */}
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
                />
            ))}
        </div>
    );
});

const TaskListTabs: React.FC = () => {
  const { lists, activeListId, activeList, setActiveListId, theme, user, removeList, apiFetch, fetchData } = useTaskBox();
  const { openModal } = useModal();
  
  // State for List UI
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Initialize expanded state once when lists load
  useEffect(() => {
      if (!initialized && lists.length > 0) {
          setExpandedIds(new Set());
          setInitialized(true);
      }
  }, [lists, initialized]);

  // AUTO-EXPAND LOGIC: Ensure parent of active list is always open
  useEffect(() => {
      if (activeListId && lists.length > 0) {
          const active = lists.find(l => l.id === activeListId);
          if (active && active.parentId) {
              setExpandedIds(prev => {
                  if (prev.has(active.parentId!)) return prev;
                  const newSet = new Set(prev);
                  newSet.add(active.parentId!);
                  return newSet;
              });
          }
      }
  }, [activeListId, lists]);

  const toggleExpand = useCallback((id: number) => {
      setExpandedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  }, []);

  const toggleAllFolders = () => {
      const parentLists = lists.filter(l => lists.some(child => child.parentId === l.id));
      const allExpanded = parentLists.every(l => expandedIds.has(l.id));
      
      if (allExpanded) {
          // Collapse All
          setExpandedIds(new Set());
      } else {
          // Expand All
          const newSet = new Set(expandedIds);
          parentLists.forEach(l => newSet.add(l.id));
          setExpandedIds(newSet);
      }
  };
  
  const handlePinList = useCallback(async (listId: number, pinned: boolean) => {
      try {
          await apiFetch(`/api/lists/${listId}`, {
              method: 'PUT',
              body: JSON.stringify({ pinned })
          });
          fetchData();
      } catch (e) {
          console.error("Failed to toggle pin");
      }
  }, [apiFetch, fetchData]);

  if (!user) return null;

  const isOrange = theme === 'orange';
  const toolbarBtnClass = `p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isOrange ? 'text-gray-400 hover:text-orange-500 hover:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`;

  // --- SORTING LOGIC ---
  
  const rootLists = lists.filter(l => !l.parentId);

  const sortedRootLists = useMemo(() => {
      const sorted = [...rootLists].sort((a, b) => {
          // Priority 1: Pinned
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;

          // Priority 2: Alphabetical (Toggle)
          const compareTitle = sortOrder === 'asc' 
              ? a.title.localeCompare(b.title) 
              : b.title.localeCompare(a.title);
          return compareTitle;
      });
      return sorted;
  }, [rootLists, sortOrder]);

  const isOwner = activeList?.ownerId === user.id;
  const canAddSublist = !!activeList && isOwner && activeList.tasks.length === 0 && !activeList.parentId;

  return (
    <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 relative z-50">
            <div className="flex items-center space-x-2">
                <span className={`text-xs font-semibold uppercase ${isOrange ? 'text-gray-500' : 'text-gray-400'}`}>Lists</span>
                
                {/* Sort Toggle */}
                <Tooltip text={`Sort: ${sortOrder === 'asc' ? 'A-Z' : 'Z-A'}`}>
                    <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {sortOrder === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h5m0 0v8m0-8h4m-4 8l-4-4m4 4l4-4" /></svg>
                        )}
                    </button>
                </Tooltip>

                {/* Expand/Collapse All */}
                <Tooltip text="Toggle Folders">
                    <button onClick={toggleAllFolders} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </Tooltip>
            </div>

            <Tooltip text="Add Top Level List" align="right">
                <button onClick={() => openModal('ADD_LIST', { parentId: null })} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
            </Tooltip>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-start gap-1 p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 overflow-visible">
             <Tooltip text="Add Sublist" align="left" position="top">
                <button onClick={() => activeList && openModal('ADD_LIST', { parentId: activeList.id })} disabled={!canAddSublist} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </Tooltip>
            <Tooltip text="Rename" align="center" position="top">
                <button onClick={() => activeList && openModal('RENAME_LIST', { list: activeList })} disabled={!activeList || !isOwner} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
            </Tooltip>
            <Tooltip text="Share" align="center" position="top">
                <button onClick={() => activeList && openModal('SHARE_LIST', { list: activeList })} disabled={!activeList || !isOwner} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
            </Tooltip>
            <Tooltip text="Move" align="center" position="top">
                <button onClick={() => activeList && openModal('MOVE_LIST', { list: activeList })} disabled={!activeList || !isOwner} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
            </Tooltip>
            <Tooltip text="Merge" align="center" position="top">
                <button onClick={() => activeList && openModal('MERGE_LIST', { list: activeList })} disabled={!activeList || !isOwner} className={toolbarBtnClass}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </button>
            </Tooltip>
            <div className="flex-grow"></div>
            <Tooltip text="Delete" align="right" position="top">
                <button onClick={() => activeList && removeList(activeList.id)} disabled={!activeList || !isOwner} className={`${toolbarBtnClass} hover:text-red-500`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </Tooltip>
        </div>

        {/* List Tree */}
        <div className="flex-grow overflow-y-auto no-scrollbar px-2 pb-4 pt-2 relative z-0">
            {sortedRootLists.map(list => (
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
                    onPin={handlePinList}
                />
            ))}
            {sortedRootLists.length === 0 && (
                <div className="text-center text-xs text-gray-400 mt-4 italic">No lists yet.</div>
            )}
        </div>
    </div>
  );
};

export default TaskListTabs;
