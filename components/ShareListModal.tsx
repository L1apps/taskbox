import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { Theme, User, TaskListWithUsers } from '../types';

interface ShareListModalProps {
  list: TaskListWithUsers;
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onListUpdated: () => void;
}

const ShareListModal: React.FC<ShareListModalProps> = ({ list, onClose, theme, apiFetch, onListUpdated }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState('');

  const fetchAllUsers = useCallback(async () => {
    try {
      const response = await apiFetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      setAllUsers(users);
    } catch (e) {
      setError('Could not load users.');
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleShare = async () => {
      if (!selectedUserId) return;
      setError('');
      try {
          const response = await apiFetch(`/api/lists/${list.id}/shares`, {
              method: 'POST',
              body: JSON.stringify({ userId: Number(selectedUserId) }),
          });
          if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to share list.');
          }
          onListUpdated();
          setSelectedUserId('');
      } catch (e) {
          const msg = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(msg);
      }
  };
  
  const handleRemoveShare = async (userId: number) => {
      setError('');
      try {
          const response = await apiFetch(`/api/lists/${list.id}/shares/${userId}`, {
              method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to remove user');
          onListUpdated();
      } catch (e) {
          setError('Could not remove user.');
      }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  const usersToShareWith = allUsers.filter(u => u.id !== list.ownerId && !list.sharedWith.some(su => su.id === u.id));

  return (
    <Modal title={`Settings for "${list.title}"`} onClose={onClose} theme={theme}>
      <div className="space-y-4">
        <div>
            <h3 className="font-semibold mb-2">Share with new user:</h3>
            <div className="flex gap-2">
                <select 
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className={`flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                >
                    <option value="">Select a user...</option>
                    {usersToShareWith.map(user => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                </select>
                <button onClick={handleShare} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`} disabled={!selectedUserId}>
                    Share
                </button>
            </div>
             {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <div className="pt-4 border-t dark:border-gray-700">
            <h3 className="font-semibold mb-2">Currently shared with:</h3>
            {list.sharedWith.length > 0 ? (
                <ul className="space-y-2">
                    {list.sharedWith.map(user => (
                        <li key={user.id} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                            <span>{user.username}</span>
                            <button onClick={() => handleRemoveShare(user.id)} className="text-xs text-red-500 hover:underline">
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500">This list has not been shared with anyone.</p>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareListModal;