
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, User } from '../types';

interface UserSettingsModalProps {
  onClose: () => void;
  theme: Theme;
  user: User;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUserUpdated: (user: User) => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ onClose, theme, user, apiFetch, onUserUpdated }) => {
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [sessionTimeout, setSessionTimeout] = useState(user.sessionTimeout || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isOrange = theme === 'orange';
    const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
    const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
    const inputTextColor = isOrange ? 'text-gray-900' : '';

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPassword) {
            setError("Current password is required to make changes.");
            return;
        }

        try {
            const body: any = { currentPassword };
            if (username !== user.username) body.username = username;
            if (password) body.password = password;
            if (sessionTimeout !== user.sessionTimeout) body.sessionTimeout = sessionTimeout;

            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to update settings');
            }

            const updatedUser = await res.json();
            onUserUpdated(updatedUser);
            setSuccess('Settings updated successfully.');
            setPassword('');
            setCurrentPassword('');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            setError(msg);
        }
    };

    return (
        <Modal title="User Settings" onClose={onClose} theme={theme}>
            <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password (Optional)</label>
                    <input 
                        type="password" 
                        placeholder="Leave blank to keep current"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session Timeout</label>
                    <select
                        value={sessionTimeout}
                        onChange={e => setSessionTimeout(e.target.value)}
                         className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                    >
                        <option value="">Default (Server Setting)</option>
                        <option value="30m">30 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="12h">12 Hours</option>
                        <option value="1d">1 Day</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                    </select>
                     <p className="text-xs text-gray-500 mt-1">Changes take effect on next login.</p>
                </div>

                <div className="pt-4 border-t dark:border-gray-700">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password (Required)</label>
                    <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)} 
                        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-500">{success}</p>}

                <div className="flex justify-end pt-2">
                    <button type="submit" className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`}>
                        Save Changes
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UserSettingsModal;
