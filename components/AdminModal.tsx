
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Theme, User, LogEntry } from '../types';

interface AdminModalProps {
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUpdate: () => void;
}

// Extended User type for Admin view
interface AdminUser extends User {
    listCount?: number;
    taskCount?: number;
}

const UserManagementTab: React.FC<{ apiFetch: (url: string, options?: RequestInit) => Promise<Response>, theme: Theme }> = ({ apiFetch, theme }) => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [newUser, setNewUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [status, setStatus] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const isOrange = theme === 'orange';
    const inputClass = `w-full px-3 py-2 border rounded-md text-sm ${isOrange ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white'}`;
    const btnClass = `px-3 py-1 rounded text-xs font-medium text-white shadow-sm disabled:opacity-50`;

    const loadUsers = async () => {
        try {
            const res = await apiFetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch(e) { console.error(e); }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('');
        if (newPassword.length < 6) { setStatus("Password must be 6+ chars."); return; }
        
        try {
            const res = await apiFetch('/api/users/register', {
                method: 'POST',
                body: JSON.stringify({ username: newUser, password: newPassword })
            });
            if (res.ok) {
                setStatus("User added.");
                setNewUser(''); setNewPassword(''); setIsAdding(false);
                loadUsers();
            } else {
                const d = await res.json();
                setStatus(d.message || "Failed.");
            }
        } catch(e) { setStatus("Error adding user."); }
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm("Delete this user? They will lose all access.")) return;
        try {
            const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) loadUsers();
            else { const d = await res.json(); alert(d.message); }
        } catch(e) { alert("Error deleting user."); }
    };

    const handleResetPassword = async (id: number) => {
        const p = prompt("Enter new password for this user:");
        if (!p) return;
        try {
            const res = await apiFetch(`/api/users/${id}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword: p })
            });
            if (res.ok) alert("Password reset.");
            else alert("Failed.");
        } catch(e) { alert("Error."); }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold">Registered Users</h4>
                <button onClick={() => setIsAdding(!isAdding)} className={`${btnClass} ${isOrange ? 'bg-orange-600' : 'bg-blue-600'}`}>
                    {isAdding ? 'Cancel' : 'Add User'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddUser} className={`p-3 rounded border ${isOrange ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'}`}>
                    <div className="space-y-2">
                        <input type="text" placeholder="Username" value={newUser} onChange={e => setNewUser(e.target.value)} className={inputClass} required />
                        <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} required />
                        <button type="submit" className={`${btnClass} w-full ${isOrange ? 'bg-orange-500' : 'bg-blue-500'}`}>Create User</button>
                        {status && <p className="text-xs text-red-500 text-center">{status}</p>}
                    </div>
                </form>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {users.map(u => (
                    <div key={u.id} className={`flex justify-between items-center p-2 rounded border ${isOrange ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600'}`}>
                        <div>
                            <div className={`font-medium ${isOrange ? 'text-gray-200' : 'text-gray-800 dark:text-white'}`}>
                                {u.username} <span className="text-xs font-normal opacity-70">(ID: {u.id})</span>
                            </div>
                            <div className="text-xs text-gray-500 flex gap-2">
                                <span>{u.role}</span>
                                <span className="border-l pl-2 border-gray-500">Lists: {u.listCount || 0}</span>
                                <span>Tasks: {u.taskCount || 0}</span>
                            </div>
                        </div>
                        {u.role !== 'ADMIN' && (
                            <div className="flex space-x-1">
                                <button onClick={() => handleResetPassword(u.id)} className={`${btnClass} bg-gray-500 hover:bg-gray-600`}>Reset</button>
                                <button onClick={() => handleDeleteUser(u.id)} className={`${btnClass} bg-red-600 hover:bg-red-700`}>Del</button>
                            </div>
                        )}
                        {/* Self-Edit Prevention */}
                        {u.role === 'ADMIN' && (
                             <span className="text-xs italic text-gray-400">Admin</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ActivityLogTab: React.FC<{ apiFetch: (url: string, options?: RequestInit) => Promise<Response>, theme: Theme }> = ({ apiFetch, theme }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    const loadLogs = async () => {
        try {
            const res = await apiFetch('/api/admin/logs');
            if (res.ok) setLogs(await res.json());
        } catch (e) { console.error(e); }
    };

    const clearLogs = async () => {
        if (!window.confirm("Clear all activity logs?")) return;
        try {
            await apiFetch('/api/admin/logs', { method: 'DELETE' });
            loadLogs();
        } catch (e) { alert("Failed to clear logs"); }
    };

    useEffect(() => { loadLogs(); }, []);

    const isOrange = theme === 'orange';

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">System Activity</h4>
                <button onClick={clearLogs} className="text-xs text-red-500 hover:underline">Clear Logs</button>
            </div>
            <div className={`h-64 overflow-y-auto p-2 rounded border text-xs font-mono ${isOrange ? 'bg-black border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'}`}>
                {logs.length === 0 ? (
                    <div className="text-center py-4 opacity-50">No logs found.</div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="mb-1 border-b border-gray-200 dark:border-gray-800 pb-1 last:border-0">
                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleString()}]</span>
                            <span className={`ml-2 font-bold ${log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-500'}`}>{log.level}</span>: 
                            <span className="ml-1">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

interface HierarchyIssue {
    type: 'DELETED' | 'PERMISSION';
    childId: number;
    childTitle: string;
    childOwnerId: number;
    parentId: number;
    parentTitle: string;
    parentOwnerId: number;
}

const DatabaseMaintenanceTab: React.FC<{ apiFetch: (url: string, options?: RequestInit) => Promise<Response>, theme: Theme, onUpdate: () => void }> = ({ apiFetch, onUpdate }) => {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [healthResult, setHealthResult] = useState<{ message: string; healthy: boolean; details?: string[] } | null>(null);
    const [hierarchyReport, setHierarchyReport] = useState<HierarchyIssue[] | null>(null);

    const performAction = async (action: 'prune' | 'purge_all' | 'vacuum' | 'reset_defaults' | 'fix_hierarchy', extraData?: any) => {
        if (action === 'purge_all') {
            if (!window.confirm("CRITICAL WARNING: This will delete ALL lists and tasks for ALL users. Only users and logs will remain. This cannot be undone. Are you sure?")) return;
        }
        if (action === 'reset_defaults') {
            if (!window.confirm("WARNING: This will delete ALL lists and tasks and replace them with the Default Demo Data (Groceries list). Are you sure?")) return;
        }
        
        setLoading(true);
        setStatus('');
        setHealthResult(null);
        try {
            const res = await apiFetch('/api/admin/maintenance', {
                method: 'POST',
                body: JSON.stringify({ action, ...extraData })
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
    
    const runHealthCheck = async () => {
        setLoading(true);
        setHealthResult(null);
        setStatus('');
        try {
            const res = await apiFetch('/api/admin/maintenance', {
                method: 'POST',
                body: JSON.stringify({ action: 'check_integrity' })
            });
            const data = await res.json();
            setHealthResult(data);
        } catch (e) {
            setStatus('Health check failed to run.');
        } finally {
            setLoading(false);
        }
    };
    
    const runHierarchyAnalysis = async () => {
        setLoading(true);
        setHierarchyReport(null);
        try {
            const res = await apiFetch('/api/admin/hierarchy-report');
            const data = await res.json();
            setHierarchyReport(data);
        } catch (e) {
            setStatus('Analysis failed.');
        } finally {
            setLoading(false);
        }
    };
    
    const fixPermission = async (childOwnerId: number, parentId: number) => {
        try {
            const res = await apiFetch('/api/admin/hierarchy-fix-permission', {
                method: 'POST',
                body: JSON.stringify({ childOwnerId, parentId })
            });
            if (res.ok) {
                alert("Fixed! Parent list shared with child owner.");
                runHierarchyAnalysis(); // Refresh
                onUpdate();
            }
        } catch (e) {
            alert("Fix failed.");
        }
    };
    
    const handleDownloadBackup = async () => {
        try {
            const res = await apiFetch('/api/admin/backup');
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `taskbox-backup-${new Date().toISOString().split('T')[0]}.db`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setStatus("Backup downloaded.");
            } else {
                setStatus("Failed to download backup.");
            }
        } catch (e) {
            setStatus("Backup failed.");
        }
    };

    const validateSQLiteHeader = (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arr = (new Uint8Array(e.target?.result as ArrayBuffer)).subarray(0, 16);
                let header = "";
                for(let i = 0; i < arr.length; i++) {
                    header += String.fromCharCode(arr[i]);
                }
                // Check for "SQLite format 3" magic string
                if (header.startsWith("SQLite format 3")) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            reader.readAsArrayBuffer(file.slice(0, 16));
        });
    };

    const handleRestoreBackup = async () => {
        if (!restoreFile) return;
        
        setLoading(true);
        setStatus("Verifying file integrity...");

        // 1. Frontend Check: Magic Header
        const isValidHeader = await validateSQLiteHeader(restoreFile);
        if (!isValidHeader) {
            setStatus("Error: Invalid file format. Not a SQLite database.");
            setLoading(false);
            return;
        }

        if (!window.confirm("Verification Passed. This will OVERWRITE the entire database with the uploaded file. The server will RESTART immediately after. Are you sure?")) {
            setLoading(false);
            setStatus("");
            return;
        }

        setStatus("Uploading and Validating on Server...");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64String = (e.target?.result as string).split(',')[1]; // Remove "data:*/*;base64," prefix
                
                const res = await apiFetch('/api/admin/restore', {
                    method: 'POST',
                    body: JSON.stringify({ fileData: base64String })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data.message);
                    // Reload page after a delay to allow server restart
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } else {
                    const err = await res.json();
                    setStatus("Restore failed: " + err.message);
                    setLoading(false);
                }
            } catch (err) {
                 setStatus("Restore error.");
                 setLoading(false);
            }
        };
        reader.readAsDataURL(restoreFile);
    };

    const buttonBase = "px-4 py-2 rounded text-sm font-medium text-white shadow-sm disabled:opacity-50";

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold mb-2">Database Import / Export</h4>
                <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Export Database (Backup)</div>
                            <div className="text-xs text-gray-500">Download the full SQLite database file.</div>
                        </div>
                        <button onClick={handleDownloadBackup} disabled={loading} className={`${buttonBase} bg-blue-500 hover:bg-blue-600`}>Download</button>
                    </div>
                    
                    <div className="p-3 border rounded border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <div className="font-medium text-orange-700 dark:text-orange-400">Import Database (Restore)</div>
                                <div className="text-xs text-orange-600 dark:text-orange-300">Overwrites current DB. Server will restart.</div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                             <input 
                                type="file" 
                                accept=".db, .sqlite, .sqlite3"
                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                             />
                             <button 
                                onClick={handleRestoreBackup} 
                                disabled={loading || !restoreFile} 
                                className={`${buttonBase} bg-orange-600 hover:bg-orange-700 whitespace-nowrap`}
                             >
                                Restore
                             </button>
                        </div>
                    </div>
                </div>

                <h4 className="font-semibold mb-2 mt-6">Database Health</h4>
                <div className="p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium">Integrity Check</div>
                            <div className="text-xs text-gray-500">Scans database structure and foreign keys for errors.</div>
                        </div>
                        <button onClick={runHealthCheck} disabled={loading} className={`${buttonBase} bg-indigo-500 hover:bg-indigo-600`}>Check Health</button>
                    </div>
                    {healthResult && (
                        <div className={`mt-3 p-2 rounded text-sm ${healthResult.healthy ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                            <p className="font-bold">{healthResult.message}</p>
                            {healthResult.details && healthResult.details.length > 0 && (
                                <ul className="mt-1 list-disc list-inside">
                                    {healthResult.details.map((d, i) => <li key={i} className="text-xs">{d}</li>)}
                                </ul>
                            )}
                            {!healthResult.healthy && (
                                <p className="text-xs mt-2 font-semibold">Try running "Vacuum" below to attempt repair.</p>
                            )}
                        </div>
                    )}
                </div>
                
                <h4 className="font-semibold mb-2 mt-6">Hierarchy & Orphans</h4>
                <div className="p-3 border rounded bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-medium text-indigo-800 dark:text-indigo-300">Hierarchy Analyzer</div>
                            <div className="text-xs opacity-70">Find lists with missing parents or permission issues.</div>
                        </div>
                        <button onClick={runHierarchyAnalysis} disabled={loading} className="px-3 py-1 text-xs rounded bg-indigo-500 text-white hover:bg-indigo-600">Analyze Structure</button>
                    </div>
                    {hierarchyReport && (
                        <div className="mt-3 space-y-2">
                            {hierarchyReport.length === 0 ? (
                                <div className="text-sm text-green-600 font-semibold">No hierarchy issues found.</div>
                            ) : (
                                hierarchyReport.map((issue, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-indigo-100 flex justify-between items-center">
                                        <div>
                                            <span className="font-bold">{issue.childTitle}</span> (Owner: {issue.childOwnerId}) 
                                            <br/>points to Parent ID {issue.parentId}
                                            <br/><span className={issue.type === 'DELETED' ? 'text-red-500 font-bold' : 'text-yellow-500 font-bold'}>
                                                Status: {issue.type === 'DELETED' ? 'Parent Deleted' : 'Hidden (Permission Issue)'}
                                            </span>
                                        </div>
                                        {issue.type === 'PERMISSION' && (
                                            <button 
                                                onClick={() => fixPermission(issue.childOwnerId, issue.parentId)}
                                                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                            >
                                                Fix
                                            </button>
                                        )}
                                        {issue.type === 'DELETED' && (
                                            <span className="text-gray-400 italic">Manual Move Req.</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <h4 className="font-semibold mb-2 mt-6">Maintenance Tools</h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Vacuum / Repair</div>
                            <div className="text-xs text-gray-500">Optimizes the DB file and can fix minor corruption.</div>
                        </div>
                        <button onClick={() => performAction('vacuum')} disabled={loading} className={`${buttonBase} bg-gray-500 hover:bg-gray-600`}>Vacuum</button>
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
                {status && <p className="mt-4 text-center font-semibold text-blue-600 dark:text-blue-400 animate-pulse">{status}</p>}
            </div>
        </div>
    );
};

const AdminModal: React.FC<AdminModalProps> = ({ onClose, theme, apiFetch, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'db'>('users');
    const isOrange = theme === 'orange';
    const tabClass = (isActive: boolean) => `flex-1 py-2 text-center text-sm font-medium border-b-2 cursor-pointer transition-colors ${isActive 
        ? (isOrange ? 'border-orange-500 text-orange-500' : 'border-blue-500 text-blue-600 dark:text-blue-400') 
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`;

    return (
        <Modal title="Admin Panel" onClose={onClose} theme={theme}>
            <div className="flex mb-4">
                <div onClick={() => setActiveTab('users')} className={tabClass(activeTab === 'users')}>Users</div>
                <div onClick={() => setActiveTab('logs')} className={tabClass(activeTab === 'logs')}>Activity Log</div>
                <div onClick={() => setActiveTab('db')} className={tabClass(activeTab === 'db')}>Database</div>
            </div>
            
            <div className="min-h-[300px]">
                {activeTab === 'users' ? (
                    <UserManagementTab apiFetch={apiFetch} theme={theme} />
                ) : activeTab === 'logs' ? (
                    <ActivityLogTab apiFetch={apiFetch} theme={theme} />
                ) : (
                    <DatabaseMaintenanceTab apiFetch={apiFetch} theme={theme} onUpdate={onUpdate} />
                )}
            </div>
        </Modal>
    );
};

export default AdminModal;
