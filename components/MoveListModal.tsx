
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, TaskListWithUsers } from '../types';

interface MoveListModalProps {
  onClose: () => void;
  onMove: (listId: number, parentId: number | null) => void;
  list: TaskListWithUsers;
  lists: TaskListWithUsers[];
  theme: Theme;
}

const MoveListModal: React.FC<MoveListModalProps> = ({ onClose, onMove, list, lists, theme }) => {
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const isAtTopLevel = list.parentId === null;

  // Logic:
  // 1. Cannot move into itself or its children.
  // 2. Target must be a Master List (Top Level) to accept a child.
  // 3. Target must be empty of tasks.
  
  const availableDestinations = lists.filter(l => 
      l.id !== list.id && 
      l.parentId === null && 
      l.tasks.length === 0 
  );

  const handleMove = () => {
      if (!selectedParentId) return;
      const parentId = selectedParentId === 'root' ? null : Number(selectedParentId);
      onMove(list.id, parentId);
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <Modal title={`Move "${list.title}"`} onClose={onClose} theme={theme}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Destination (Parent List)
          </label>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
          >
              <option value="">Select destination...</option>
              {!isAtTopLevel && <option value="root">Top Level</option>}
              {availableDestinations.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
              ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            You can move a list to the <b>Top Level</b>, or into a <b>Master List</b> that has no tasks.
          </p>
        </div>
        <div className="flex justify-end pt-2 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
            <button onClick={handleMove} disabled={!selectedParentId} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50`}>Move</button>
        </div>
      </div>
    </Modal>
  );
};

export default MoveListModal;
