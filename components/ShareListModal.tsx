
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from './Modal';
import { Theme, User } from '../types';
import { useTaskBox } from '../contexts/TaskBoxContext';

interface ShareListModalProps {
  list: { id: number }; // We only strictly need the ID, but might receive the whole object
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onListUpdated: () => void;
}

const ShareListModal: React.FC<ShareListModalProps> = ({ list: initialListProp, onClose, theme, apiFetch, onListUpdated }) => {
  const { lists, user, transferListOwnership } = useTaskBox();
  
  // Resolve the fresh list from context to ensure UI updates immediately after actions
  const list = useMemo(() => lists.find(l => l.id === initialListProp.id), [lists, initialListProp.id]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permission, setPermission] = useState<string>('FULL');
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

  if (!list) return null; // Should not happen

  const isOwner = user?.id === list.ownerId;
  const isAdmin = user?.role === 'ADMIN';

  const handleShare = async () => {
      if (!selectedUserId) return;
      setError('');
      try {
          const response = await apiFetch(`/api/lists/${list.id}/shares`, {
              method: 'POST',
              body: JSON.stringify({ userId: Number(selectedUserId), permission }),
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
          if (userId === user?.id) {
              onClose(); // Close modal if I removed myself
          }
      } catch (e) {
          setError('Could not remove user.');
      }
  };

  const handleTransferOwnership = async (newOwnerId: number, username: string) => {
      if (window.confirm(`Are you sure you want to make "${username}" the owner of this list? You will lose ownership but retain FULL access.`)) {
          try {
              await transferListOwnership(list.id, newOwnerId);
          } catch (e) {
              setError("Failed to transfer ownership");
          }
      }
  };
  
  const handleTakeOwnership = async () => {
      if (!user) return;
      if (window.confirm("Admin Override: Take full ownership of this list? The previous owner will be downgraded to a 'Full Access' shared user.")) {
          try {
              await transferListOwnership(list.id, user.id);
          } catch (e) {
              setError("Failed to take ownership");
          }
      }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputClass = isOrange 
    ? 'bg-gray-800 border-gray-600 text-white' 
    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white';

  const usersToShareWith = allUsers.filter(u => u.id !== list.ownerId && !list.sharedWith.some(su => su.id === u.id));

  const getPermissionLabel = (perm?: string) => {
      if (perm === 'VIEW') return 'View Only';
      if (perm === 'MODIFY') return 'Modify';
      if (perm === 'FULL') return 'Full Access';
      return 'Unknown';
  };

  return (
    <Modal title={`Settings for "${list.title}"`} onClose={onClose} theme={theme}>
      <div className="space-y-4">
        {isOwner ? (
            <div className="space-y-2">
                <h3 className="font-semibold mb-1">Share with new user:</h3>
                <div className="grid grid-cols-2 gap-2">
                    <select 
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className={`col-span-2 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm ${inputClass}`}
                    >
                        <option value="">Select a user...</option>
                        {usersToShareWith.map(user => (
                            <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                    </select>
                    
                    <select
                        value={permission}
                        onChange={(e) => setPermission(e.target.value)}
                         className={`col-span-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm ${inputClass}`}
                    >
                        <option value="VIEW">View Only</option>
                        <option value="MODIFY">Modify</option>
                        <option value="FULL">Full Access</option>
                    </select>

                    <button onClick={handleShare} className={`col-span-1 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`} disabled={!selectedUserId}>
                        Share
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    <b>View Only:</b> Read-only access.<br/>
                    <b>Modify:</b> Add/Edit/Complete tasks. Cannot delete tasks.<br/>
                    <b>Full Access:</b> All task actions including delete.
                </p>
                 {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
        ) : (
            <div className="p-3 bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20 dark:border-blue-600">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                    You are a shared member of this list with <b>{getPermissionLabel(list.currentUserPermission)}</b> permissions.
                </p>
                {isAdmin && (
                    <button 
                        onClick={handleTakeOwnership}
                        className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-bold"
                    >
                        ADMIN: Take Ownership
                    </button>
                )}
            </div>
        )}

        <div className="pt-4 border-t dark:border-gray-700">
            <h3 className="font-semibold mb-2">Currently shared with:</h3>
            {list.sharedWith.length > 0 ? (
                <ul className="space-y-2">
                    {list.sharedWith.map(sharedUser => (
                        <li key={sharedUser.id} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                            <div className="flex flex-col">
                                <span className={`${isOrange ? 'text-gray-900' : 'dark:text-gray-200'} font-medium`}>
                                    {sharedUser.username} {sharedUser.id === user?.id ? '(You)' : ''}
                                </span>
                                <span className="text-xs text-gray-500 uppercase">{getPermissionLabel(sharedUser.permission)}</span>
                            </div>
                            
                            <div className="flex space-x-2">
                                {isOwner && (
                                    <button onClick={() => handleTransferOwnership(sharedUser.id, sharedUser.username)} className="text-xs text-blue-500 hover:underline">
                                        Make Owner
                                    </button>
                                )}
                                {/* Owner can remove anyone. Shared user can only remove themselves. */}
                                {(isOwner || sharedUser.id === user?.id) && (
                                    <button onClick={() => handleRemoveShare(sharedUser.id)} className="text-xs text-red-500 hover:underline">
                                        {sharedUser.id === user?.id ? 'Leave List' : 'Remove'}
                                    </button>
                                )}
                            </div>
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
