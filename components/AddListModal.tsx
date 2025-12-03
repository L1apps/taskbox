
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { Theme, TaskListWithUsers } from '../types';

interface AddListModalProps {
  onClose: () => void;
  onAddList: (title: string, parentId: number | null) => void;
  theme: Theme;
  activeList?: TaskListWithUsers;
  allLists: TaskListWithUsers[];
}

const AddListModal: React.FC<AddListModalProps> = ({ onClose, onAddList, theme, activeList, allLists }) => {
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState<string>(''); // "" = Top Level

  // Generate hierarchical tree options
  const listOptions = useMemo(() => {
      const options: { id: number; title: string; depth: number; disabled: boolean }[] = [];
      
      const buildTree = (pid: number | null, depth: number) => {
          const children = allLists.filter(l => l.parentId === pid)
                                   .sort((a, b) => a.title.localeCompare(b.title));
          
          for (const list of children) {
              const hasTasks = list.tasks && list.tasks.length > 0;
              // Depth Rules:
              // Depth 1 (Master) -> can have child (L2).
              // Depth 2 (Sub) -> can have child (L3).
              // Depth 3 (Nested) -> CANNOT have child.
              const isMaxDepth = depth >= 3; 
              
              options.push({ 
                  id: list.id, 
                  title: list.title, 
                  depth, 
                  disabled: hasTasks || isMaxDepth
              });
              
              buildTree(list.id, depth + 1);
          }
      };
      
      buildTree(null, 1);
      return options;
  }, [allLists]);

  // Set default selection based on active list context
  useEffect(() => {
      if (activeList) {
          // Find the option corresponding to active list to check if it's a valid parent
          const option = listOptions.find(o => o.id === activeList.id);
          if (option && !option.disabled) {
              setParentId(String(activeList.id));
          } else {
              setParentId(''); // Default to Top Level if active list is invalid parent (e.g. has tasks or max depth)
          }
      } else {
          setParentId('');
      }
  }, [activeList, listOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const pid = parentId ? Number(parentId) : null;
      onAddList(title.trim(), pid);
    }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <Modal title="Create New List" onClose={onClose} theme={theme}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="list-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            List Title
          </label>
          <input
            type="text"
            id="list-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
            required
            autoFocus
          />
        </div>

        {/* Location Selector */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
            </label>
            <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
            >
                <option value="">Top Level</option>
                {listOptions.map(opt => (
                    <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                        {/* Indentation for hierarchy visualization */}
                        {Array.from({ length: (opt.depth - 1) * 3 }).map(() => '\u00A0').join('')}
                        {opt.depth > 1 ? '↳ ' : ''}{opt.title}
                    </option>
                ))}
            </select>
        </div>

        <div className="flex justify-end pt-2 space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
            type="submit"
            className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isOrange ? 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500' : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'}`}
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddListModal;
