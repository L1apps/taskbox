import React, { useState } from 'react';
import Modal from './Modal';
import { Theme } from '../types';

interface AddListModalProps {
  onClose: () => void;
  onAddList: (title: string, description: string) => void;
  theme: Theme;
}

const AddListModal: React.FC<AddListModalProps> = ({ onClose, onAddList, theme }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddList(title.trim(), description.trim());
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
        <div>
          <label htmlFor="list-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="list-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
          />
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
            Create List
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddListModal;