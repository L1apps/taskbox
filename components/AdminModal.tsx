
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Theme, LogEntry } from '../types';

interface AdminModalProps {
  onClose: () => void;
  theme: Theme;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUpdate: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ onClose, theme, apiFetch, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'db'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  
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

  const handleDeleteUser = async (id: number) => {
      if (!window.confirm("Are you sure? This deletes ALL their lists and tasks.")) return;
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
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
      // Direct download via blob to handle auth headers if needed, or simple link if cookie/token allows.
      // Since apiFetch handles the token header, we use that.
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
                                    <td className="px-4 py-2">{u.id}</td>
                                    <td className="px-4 py-2 font-medium">{u.username}</td>
                                    <td className="px-4 py-2">{u.role}</td>
                                    <td className="px-4 py-2">{u.listCount} / {u.taskCount}</td>
                                    <td className="px-4 py-2 flex space-x-2">
                                        <button onClick={() => handleResetPassword(u.id)} className="text-blue-500 hover:underline">Reset PW</button>
                                        {u.role !== 'ADMIN' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:underline">Delete</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="font-bold mb-2">Create User</h4>
                    <form onSubmit={handleCreateUser} className="flex gap-2">
                        <input type="text" placeholder="Username" value={newUser} onChange={e => setNewUser(e.target.value)} className="border p-2 rounded text-sm w-1/3 dark:bg-gray-800 dark:border-gray-600" required />
                        <input type="password" placeholder="Password" value={newPass} onChange={e => setNewPass(e.target.value)} className="border p-2 rounded text-sm w-1/3 dark:bg-gray-800 dark:border-gray-600" required />
                        <button type="submit" disabled={loading} className={`${buttonBase} ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>Create</button>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'logs' && (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold">Security & Activity Log</h3>
                    <button onClick={handleClearLogs} className="text-xs text-red-500 hover:underline">Clear Logs</button>
                </div>
                <div className="h-64 overflow-y-auto border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700 p-2 font-mono text-xs">
                    {logs.map(log => (
                        <div key={log.id} className="mb-1 border-b border-gray-200 dark:border-gray-800 last:border-0 pb-1">
                            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleString()}]</span>
                            <span className={`ml-2 font-bold ${log.level === 'WARN' ? 'text-orange-500' : log.level === 'ERROR' ? 'text-red-500' : 'text-green-600'}`}>{log.level}</span>
                            <span className="ml-2 dark:text-gray-300">{log.message}</span>
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
