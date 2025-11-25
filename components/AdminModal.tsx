
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { Theme, User, LogEntry } from '../types';

interface AdminModalProps {
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const UserManagementTab: React.FC<{ apiFetch: AdminModalProps['apiFetch'], theme: Theme }> = ({ apiFetch, theme }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Password reset state
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const res = await apiFetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (e) {
            setError("Failed to fetch users.");
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const res = await apiFetch('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create user');
            setUsername('');
            setPassword('');
            setSuccess(`User ${username} created.`);
            fetchUsers();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(msg);
        }
    };
    
    const handleDeleteUser = async (userId: number) => {
        if(window.confirm("Are you sure you want to delete this user? This will also delete all of their lists and tasks permanently.")) {
            try {
                const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.message || 'Failed to delete user');
                }
                fetchUsers();
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(msg);
            }
        }
    };

    const handleResetPassword = async (userId: number) => {
        if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
        }
        try {
            const res = await apiFetch(`/api/admin/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ newPassword })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to reset password');
            }
            setSuccess('Password updated successfully.');
            setResettingUserId(null);
            setNewPassword('');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error resetting password';
            setError(msg);
        }
    };

    const isOrange = theme === 'orange';
    const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
    const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
    const inputTextColor = isOrange ? 'text-gray-900' : '';
    const listBgColor = isOrange ? 'bg-gray-200' : 'bg-gray-100 dark:bg-gray-700';
    const listTextColor = isOrange ? 'text-gray-900' : '';

    return (
        <div className="space-y-4">
            <form onSubmit={handleCreateUser} className="p-4 border rounded-md dark:border-gray-700 space-y-3">
                <h4 className="font-semibold">Create New User</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`} required />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`} required />
                </div>
                <button type="submit" className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`}>Create User</button>
                 {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                 {success && <p className="text-sm text-green-500 mt-2">{success}</p>}
            </form>
            <div>
                <h4 className="font-semibold mb-2">Existing Users</h4>
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {users.map(user => (
                        <li key={user.id} className={`flex flex-col sm:flex-row justify-between items-center p-2 rounded-md ${listBgColor} ${listTextColor}`}>
                            <span className="font-medium mb-2 sm:mb-0">{user.username} {user.role === 'ADMIN' && <span className="text-xs font-bold text-green-500 ml-2">ADMIN</span>}</span>
                            
                            <div className="flex space-x-2">
                                {resettingUserId === user.id ? (
                                    <div className="flex items-center space-x-2">
                                        <input 
                                            type="password" 
                                            placeholder="New Pass" 
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className={`w-32 px-2 py-1 text-sm border rounded ${inputTextColor}`}
                                        />
                                        <button onClick={() => handleResetPassword(user.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Save</button>
                                        <button onClick={() => { setResettingUserId(null); setNewPassword(''); }} className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500">Cancel</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setResettingUserId(user.id)} className="text-xs text-blue-500 hover:underline">
                                        Reset Pass
                                    </button>
                                )}
                                
                                {user.role !== 'ADMIN' && (
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-xs text-red-500 hover:underline ml-2">
                                        Delete
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ActivityLogTab: React.FC<{ apiFetch: AdminModalProps['apiFetch'], theme: Theme }> = ({ apiFetch, theme }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await apiFetch('/api/admin/logs');
                const data = await res.json();
                setLogs(data);
            } catch (e) {
                setError("Failed to fetch activity logs.");
            }
        };
        fetchLogs();
    }, [apiFetch]);
    
    const isOrange = theme === 'orange';
    const listBgColor = isOrange ? 'bg-gray-200' : 'bg-gray-100 dark:bg-gray-700';
    const listTextColor = isOrange ? 'text-gray-900' : '';

    return (
        <div>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            <ul className="space-y-2 max-h-96 overflow-y-auto text-sm">
                {logs.map(log => (
                    <li key={log.id} className={`p-2 rounded-md ${listBgColor} ${listTextColor}`}>
                        <div className={`flex justify-between items-center text-xs ${isOrange ? 'text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                           <span>{new Date(log.timestamp).toLocaleString()}</span>
                           <span className={`font-bold ${log.level === 'WARN' ? 'text-yellow-600' : (isOrange ? 'text-gray-600' : 'text-gray-400')}`}>{log.level}</span>
                        </div>
                        <p className="mt-1">{log.message}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const AdminModal: React.FC<AdminModalProps> = ({ onClose, theme, apiFetch }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

  return (
    <Modal title="Admin Panel" onClose={onClose} theme={theme}>
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
              User Management
            </button>
            <button onClick={() => setActiveTab('logs')} className={`${activeTab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
              Activity Log
            </button>
          </nav>
        </div>
        
        <div>
            {activeTab === 'users' && <UserManagementTab apiFetch={apiFetch} theme={theme} />}
            {activeTab === 'logs' && <ActivityLogTab apiFetch={apiFetch} theme={theme} />}
        </div>

      </div>
    </Modal>
  );
};

export default AdminModal;
