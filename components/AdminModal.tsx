
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { Theme, User, LogEntry } from '../types';

interface AdminModalProps {
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUpdate: () => void;
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
    const [success, setSuccess] = useState('');

    const fetchLogs = async () => {
        try {
            const res = await apiFetch('/api/admin/logs');
            const data = await res.json();
            setLogs(data);
        } catch (e) {
            setError("Failed to fetch activity logs.");
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [apiFetch]);
    
    const handleClearLogs = async () => {
        if (!window.confirm("Are you sure you want to clear all activity logs?")) return;
        try {
            const res = await apiFetch('/api/admin/logs', { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to clear logs");
            setSuccess("Logs cleared successfully.");
            fetchLogs();
        } catch (e) {
            setError("Failed to clear logs.");
        }
    };

    const isOrange = theme === 'orange';
    const listBgColor = isOrange ? 'bg-gray-200' : 'bg-gray-100 dark:bg-gray-700';
    const listTextColor = isOrange ? 'text-gray-900' : '';

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                 <h4 className="font-semibold">Security Events</h4>
                 <button onClick={handleClearLogs} className="text-xs text-red-500 hover:underline border border-red-200 rounded px-2 py-1 hover:bg-red-50">Clear Logs</button>
            </div>
            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
            {success && <p className="text-sm text-green-500 mb-2">{success}</p>}
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

const DatabaseMaintenanceTab: React.FC<{ apiFetch: AdminModalProps['apiFetch'], theme: Theme, onUpdate: () => void }> = ({ apiFetch, onUpdate }) => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const performAction = async (action: 'prune' | 'purge_all' | 'vacuum' | 'reset_defaults') => {
        if (action === 'purge_all') {
            if (!window.confirm("CRITICAL WARNING: This will delete ALL lists and tasks for ALL users. Only users and logs will remain. This cannot be undone. Are you sure?")) return;
        }
        if (action === 'reset_defaults') {
            if (!window.confirm("WARNING: This will delete ALL lists and tasks and replace them with the Default Demo Data (Groceries list). Are you sure?")) return;
        }
        setLoading(true);
        setStatus('');
        try {
            const res = await apiFetch('/api/admin/maintenance', {
                method: 'POST',
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            setStatus(data.message || 'Operation successful.');
            // Refresh main data after maintenance
            onUpdate();
        } catch (e) {
            setStatus('Operation failed.');
        } finally {
            setLoading(false);
        }
    };

    const buttonBase = "px-4 py-2 rounded text-sm font-medium text-white shadow-sm disabled:opacity-50";

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold mb-2">Maintenance Tools</h4>
                <p className="text-sm text-gray-500 mb-4">Perform database optimization and cleanup tasks.</p>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Vacuum Database</div>
                            <div className="text-xs text-gray-500">Optimizes the SQLite database file to reduce size.</div>
                        </div>
                        <button onClick={() => performAction('vacuum')} disabled={loading} className={`${buttonBase} bg-blue-500 hover:bg-blue-600`}>Vacuum</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Prune Orphaned Data</div>
                            <div className="text-xs text-gray-500">Removes tasks that are not linked to any valid list.</div>
                        </div>
                        <button onClick={() => performAction('prune')} disabled={loading} className={`${buttonBase} bg-yellow-500 hover:bg-yellow-600`}>Prune</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                        <div>
                            <div className="font-medium text-green-600 dark:text-green-400">Reset to Demo Data</div>
                            <div className="text-xs text-green-600 dark:text-green-300">Wipes all data and restores the example Groceries list.</div>
                        </div>
                        <button onClick={() => performAction('reset_defaults')} disabled={loading} className={`${buttonBase} bg-green-600 hover:bg-green-700`}>Reset</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                        <div>
                            <div className="font-medium text-red-600 dark:text-red-400">Delete All Data but users</div>
                            <div className="text-xs text-red-500 dark:text-red-300">This Action is irreversible.</div>
                        </div>
                        <button onClick={() => performAction('purge_all')} disabled={loading} className={`${buttonBase} bg-red-600 hover:bg-red-700`}>Purge All</button>
                    </div>
                </div>
                {status && <p className="mt-4 text-center font-semibold">{status}</p>}
            </div>
        </div>
    );
};


const AdminModal: React.FC<AdminModalProps> = ({ onClose, theme, apiFetch, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'db'>('users');
  const isOrange = theme === 'orange';

  return (
    <Modal title="Admin Panel" onClose={onClose} theme={theme}>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'users' ? (isOrange ? 'text-orange-500 border-b-2 border-orange-500' : 'text-blue-600 border-b-2 border-blue-500') : 'text-gray-500'}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'logs' ? (isOrange ? 'text-orange-500 border-b-2 border-orange-500' : 'text-blue-600 border-b-2 border-blue-500') : 'text-gray-500'}`}
          onClick={() => setActiveTab('logs')}
        >
          Activity Log
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'db' ? (isOrange ? 'text-orange-500 border-b-2 border-orange-500' : 'text-blue-600 border-b-2 border-blue-500') : 'text-gray-500'}`}
          onClick={() => setActiveTab('db')}
        >
          Database
        </button>
      </div>

      {activeTab === 'users' && <UserManagementTab apiFetch={apiFetch} theme={theme} />}
      {activeTab === 'logs' && <ActivityLogTab apiFetch={apiFetch} theme={theme} />}
      {activeTab === 'db' && <DatabaseMaintenanceTab apiFetch={apiFetch} theme={theme} onUpdate={onUpdate} />}
    </Modal>
  );
};

export default AdminModal;
