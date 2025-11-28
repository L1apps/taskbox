
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, TaskListWithUsers } from '../types';

interface RenameListModalProps {
  onClose: () => void;
  onRename: (listId: number, newTitle: string) => void;
  list: TaskListWithUsers;
  theme: Theme;
}

const RenameListModal: React.FC<RenameListModalProps> = ({ onClose, onRename, list, theme }) => {
  const [title, setTitle] = useState(list.title);
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(list.id, title.trim());
    }
  };

  return (
    <Modal title={`Rename "${list.title}"`} onClose={onClose} theme={theme}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
            autoFocus
            required
          />
        </div>
        <div className="flex justify-end pt-2 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
            <button type="submit" className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>Save</button>
        </div>
      </form>
    </Modal>
  );
};

export default RenameListModal;
