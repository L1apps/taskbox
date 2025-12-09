
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Theme, LogEntry } from '../types';
import { useTaskBox } from '../contexts/TaskBoxContext';
import Tooltip from './Tooltip';

interface AdminModalProps {
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUpdate: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ onClose, theme, apiFetch, onUpdate }) => {
  const { user: currentUser } = useTaskBox(); // Get current admin info
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'db'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Track transfer checkbox state per user ID
  const [transferMap, setTransferMap] = useState<Record<number, boolean>>({});
  
  // DB Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const fetchUsers = async () => {
      const res = await apiFetch('/api/users');
      if (res.ok) setUsers(await res.json());
  };

  const fetchLogs = async () => {
      const res = await apiFetch('/api/admin/logs');
      if (res.ok) setLogs(await res.json());
  };

  useEffect(() => {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPass.length < 6) return setMessage("Password too short.");
      setLoading(true);
      try {
          const res = await apiFetch('/api/users/register', {
              method: 'POST',
              body: JSON.stringify({ username: newUser, password: newPass })
          });
          if (res.ok) {
              setMessage(`User ${newUser} created.`);
              setNewUser(''); setNewPass('');
              fetchUsers();
          } else {
              const data = await res.json();
              setMessage(data.message || "Failed.");
          }
      } catch (e) { setMessage("Error creating user."); }
      finally { setLoading(false); }
  };

  const toggleTransfer = (userId: number) => {
      setTransferMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleDeleteUser = async (targetUser: any, shouldTransfer: boolean) => {
      const { id, username, listCount } = targetUser;
      
      // Explicit Confirmation Logic
      if (listCount > 0) {
          if (shouldTransfer) {
              if (!window.confirm(`Are you sure you want to delete user "${username}"?\n\nTheir ${listCount} lists (and all contained tasks) will be TRANSFERRED to your admin account.`)) {
                  return;
              }
          } else {
              if (!window.confirm(`WARNING: User "${username}" owns ${listCount} lists.\n\nYou have NOT selected to transfer them.\n\nDeleting this user will PERMANENTLY DESTROY all their lists and tasks.\n\nAre you sure you want to proceed?`)) {
                  return;
              }
          }
      } else {
          // Standard delete for empty users
          if (!window.confirm(`Delete user "${username}"?`)) return;
      }

      setLoading(true);
      try {
          const url = shouldTransfer && currentUser 
            ? `/api/users/${id}?transfer_to=${currentUser.id}` 
            : `/api/users/${id}`;

          const res = await apiFetch(url, { method: 'DELETE' });
          if (res.ok) {
              setMessage(shouldTransfer ? `User deleted. Lists transferred to you.` : `User deleted.`);
              fetchUsers();
          } else {
              setMessage("Delete failed.");
          }
      } catch (e) {
          setMessage("Error during deletion.");
      } finally {
          setLoading(false);
      }
  };

  const handleResetPassword = async (id: number) => {
      const p = prompt("Enter new password (min 6 chars):");
      if (!p || p.length < 6) return;
      const res = await apiFetch(`/api/users/${id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword: p })
      });
      if (res.ok) alert("Password reset.");
      else alert("Failed.");
  };

  const handleClearLogs = async () => {
      if (!window.confirm("Clear all logs?")) return;
      await apiFetch('/api/admin/logs', { method: 'DELETE' });
      fetchLogs();
  };

  const handleExportLogs = () => {
      if (logs.length === 0) {
          setMessage("No logs to export.");
          return;
      }
      
      const headers = ['ID', 'Timestamp', 'Level', 'Message'];
      const csvContent = [
          headers.join(','),
          ...logs.map(log => {
              // Simple CSV escaping: wrap in quotes, escape existing quotes
              const msg = log.message ? log.message.replace(/"/g, '""') : '';
              return `${log.id},"${new Date(log.timestamp).toISOString()}",${log.level},"${msg}"`;
          })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taskbox_logs_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const performAction = async (action: string) => {
      if (!window.confirm(`Perform ${action}? This might be destructive.`)) return;
      setLoading(true);
      try {
          const res = await apiFetch('/api/admin/maintenance', {
              method: 'POST',
              body: JSON.stringify({ action })
          });
          const data = await res.json();
          setMessage(data.message);
          onUpdate();
      } catch (e) { setMessage("Action failed."); }
      finally { setLoading(false); }
  };

  const handleBackup = () => {
      apiFetch('/api/admin/backup')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `taskbox-backup-${new Date().toISOString().slice(0,10)}.db`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(() => setMessage("Backup download failed"));
  };

  const handleRestore = async () => {
      if (!restoreFile) return;
      if (!window.confirm("WARNING: This will OVERWRITE the current database. All data will be replaced. The server will restart. Continue?")) return;
      
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          try {
              const res = await apiFetch('/api/admin/restore', {
                  method: 'POST',
                  body: JSON.stringify({ fileData: base64 })
              });
              const data = await res.json();
              if (res.ok) {
                  alert("Restore Successful. The page will reload.");
                  window.location.reload();
              } else {
                  setMessage(data.message || "Restore failed.");
              }
          } catch (err) { setMessage("Upload failed."); }
          finally { setLoading(false); }
      };
      reader.readAsDataURL(restoreFile);
  };

  const isOrange = theme === 'orange';
  const tabBase = "px-4 py-2 text-sm font-medium border-b-2 transition-colors";
  const activeTabClass = isOrange ? "border-orange-500 text-orange-500" : "border-blue-500 text-blue-600";
  const inactiveTabClass = "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";
  const buttonBase = "px-3 py-1.5 rounded text-xs font-bold text-white transition";

  return (
    <Modal title="Admin Panel" onClose={onClose} theme={theme} maxWidth="max-w-4xl">
        <div className="flex mb-4 border-b dark:border-gray-700">
            <button onClick={() => setActiveTab('users')} className={`${tabBase} ${activeTab === 'users' ? activeTabClass : inactiveTabClass}`}>User Management</button>
            <button onClick={() => setActiveTab('logs')} className={`${tabBase} ${activeTab === 'logs' ? activeTabClass : inactiveTabClass}`}>Activity Log</button>
            <button onClick={() => setActiveTab('db')} className={`${tabBase} ${activeTab === 'db' ? activeTabClass : inactiveTabClass}`}>Database & Maintenance</button>
        </div>

        {message && <div className="mb-4 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{message}</div>}

        {activeTab === 'users' && (
            <div className="space-y-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                            <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Username</th>
                                <th className="px-4 py-2">Role</th>
                                <th className="px-4 py-2">Lists / Tasks</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="px-4 py-2 align-middle">{u.id}</td>
                                    <td className="px-4 py-2 align-middle font-medium">{u.username}</td>
                                    <td className="px-4 py-2 align-middle">{u.role}</td>
                                    <td className="px-4 py-2 align-middle">{u.listCount} / {u.taskCount}</td>
                                    <td className="px-4 py-2 align-middle">
                                        <div className="flex items-center space-x-3">
                                            <Tooltip text="Reset Password">
                                                <button onClick={() => handleResetPassword(u.id)} className="text-blue-500 hover:text-blue-700 p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                </button>
                                            </Tooltip>
                                            
                                            {u.role !== 'ADMIN' && (
                                                <div className="flex items-center space-x-2">
                                                    <Tooltip text="Delete User">
                                                        <button 
                                                            onClick={() => handleDeleteUser(u, !!transferMap[u.id])} 
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </Tooltip>
                                                    {u.listCount > 0 && (
                                                        <label className="flex items-center cursor-pointer select-none" title="Transfer lists to Admin upon deletion">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!transferMap[u.id]} 
                                                                onChange={() => toggleTransfer(u.id)}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                            />
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 font-medium">Transfer Lists</span>
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="font-bold mb-2">Create User</h4>
                    <form onSubmit={handleCreateUser} className="flex gap-2 items-center">
                        <input type="text" placeholder="Username" value={newUser} onChange={e => setNewUser(e.target.value)} className="border p-2 rounded text-sm w-1/3 dark:bg-gray-800 dark:border-gray-600" required />
                        <div className="relative w-1/3">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Password" 
                                value={newPass} 
                                onChange={e => setNewPass(e.target.value)} 
                                className="border p-2 rounded text-sm w-full dark:bg-gray-800 dark:border-gray-600 pr-8" 
                                required 
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className={`${buttonBase} ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>Create</button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold">Security & Activity Log</h3>
                    <div className="flex items-center space-x-3">
                        <Tooltip text="export log(s) to csv file" debugLabel="Export Logs">
                            <button onClick={handleExportLogs} className="text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </Tooltip>
                        <Tooltip text="clear logs" debugLabel="Clear Logs">
                            <button onClick={handleClearLogs} className="text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </Tooltip>
                    </div>
                </div>
                {/* 
                    Log Container: 
                    If Orange theme, we enforce a dark background (bg-black) explicitly because 'dark' class 
                    is often not applied to the root in orange mode, but we need high contrast for readability.
                */}
                <div className={`h-64 overflow-y-auto border rounded p-2 font-mono text-xs ${isOrange ? 'bg-black border-gray-700 text-gray-300' : 'bg-gray-50 dark:bg-gray-900 dark:border-gray-700'}`}>
                    {logs.map(log => (
                        <div key={log.id} className={`mb-1 border-b last:border-0 pb-1 ${isOrange ? 'border-gray-800' : 'border-gray-200 dark:border-gray-800'}`}>
                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleString()}]</span>
                            <span className={`ml-2 font-bold ${log.level === 'WARN' ? 'text-orange-500' : log.level === 'ERROR' ? 'text-red-500' : 'text-green-600'}`}>{log.level}</span>
                            <span className={`ml-2 ${isOrange ? 'text-gray-300' : 'dark:text-gray-300'}`}>{log.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-gray-400 italic">No logs found.</div>}
                </div>
            </div>
        )}

        {activeTab === 'db' && (
            <div className="space-y-6">
                {/* Backup / Restore Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded dark:border-gray-700">
                        <h4 className="font-bold mb-2">Backup Database</h4>
                        <p className="text-xs text-gray-500 mb-3">Download a copy of the SQLite database file.</p>
                        <button onClick={handleBackup} className={`${buttonBase} bg-blue-600 hover:bg-blue-700`}>Download .db</button>
                    </div>
                    <div className="p-4 border rounded dark:border-gray-700">
                        <h4 className="font-bold mb-2">Restore Database</h4>
                        <p className="text-xs text-gray-500 mb-3">Upload a .db file to replace the current one.</p>
                        <div className="flex gap-2">
                            <input type="file" accept=".db" onChange={e => setRestoreFile(e.target.files?.[0] || null)} className="text-xs w-full" />
                            <button onClick={handleRestore} disabled={!restoreFile || loading} className={`${buttonBase} bg-red-600 hover:bg-red-700 disabled:opacity-50`}>Restore</button>
                        </div>
                    </div>
                </div>

                {/* Maintenance Section */}
                <div className="space-y-2">
                    <h4 className="font-bold">Maintenance Tools</h4>
                    
                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Optimize Database (Vacuum)</div>
                            <div className="text-xs text-gray-500">Reclaims unused space and defragments the DB file.</div>
                        </div>
                        <button onClick={() => performAction('vacuum')} disabled={loading} className={`${buttonBase} bg-gray-500 hover:bg-gray-600`}>Vacuum</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Integrity Check</div>
                            <div className="text-xs text-gray-500">Verifies database file structure is not corrupt.</div>
                        </div>
                        <button onClick={() => performAction('check_integrity')} disabled={loading} className={`${buttonBase} bg-blue-500 hover:bg-blue-600`}>Verify</button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Fix Hierarchy</div>
                            <div className="text-xs text-gray-500">Moves invisible lists (whose parents don't exist) to Top Level.</div>
                        </div>
                        <button onClick={() => performAction('fix_hierarchy')} disabled={loading} className={`${buttonBase} bg-yellow-500 hover:bg-yellow-600`}>Repair</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Prune Orphaned Data</div>
                            <div className="text-xs text-gray-500">Removes tasks that are not linked to any valid list.</div>
                        </div>
                        <button onClick={() => performAction('prune')} disabled={loading} className={`${buttonBase} bg-yellow-500 hover:bg-yellow-600`}>Prune</button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                        <div>
                            <div className="font-medium">Reset Task Relationships</div>
                            <div className="text-xs text-gray-500">Clears ALL Parent/Child links globally. Fixes nesting/grandchildren errors.</div>
                        </div>
                        <button onClick={() => performAction('repair_relationships')} disabled={loading} className={`${buttonBase} bg-yellow-600 hover:bg-yellow-700`}>Reset Links</button>
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
                            <div className="font-medium text-red-600 dark:text-red-400">Purge All Data</div>
                            <div className="text-xs text-red-600 dark:text-red-300">Deletes EVERYTHING (Lists, Tasks, Logs) except Users.</div>
                        </div>
                        <button onClick={() => performAction('purge_all')} disabled={loading} className={`${buttonBase} bg-red-600 hover:bg-red-700`}>Purge</button>
                    </div>
                </div>
            </div>
        )}
    </Modal>
  );
};

export default AdminModal;
