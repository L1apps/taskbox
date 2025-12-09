
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, User } from '../types';
import { useTaskBox } from '../contexts/TaskBoxContext';
import Tooltip from './Tooltip';

interface UserSettingsModalProps {
  onClose: () => void;
  theme: Theme;
  user: User;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onUserUpdated: (user: User) => void;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ onClose, theme, user, apiFetch, onUserUpdated }) => {
    const { globalViewPersistence, setGlobalViewPersistence, resetAllViewSettings } = useTaskBox();
    
    const [username, setUsername] = useState(user.username);
    const [password, setPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [sessionTimeout, setSessionTimeout] = useState(user.sessionTimeout || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Toggle state for passwords
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    const isOrange = theme === 'orange';
    const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
    const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
    const inputTextColor = isOrange ? 'text-gray-900' : '';

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Check if anything sensitive has changed
        const hasUsernameChanged = username !== user.username;
        const hasSessionTimeoutChanged = sessionTimeout !== (user.sessionTimeout || '');
        const hasPasswordChanged = password.length > 0;

        if (!hasUsernameChanged && !hasSessionTimeoutChanged && !hasPasswordChanged) {
            // Nothing critical changed, just close (Global preferences are already saved via their own handlers)
            onClose();
            return;
        }

        if (!currentPassword) {
            setError("Current password is required to make account changes.");
            return;
        }

        try {
            const body: any = { currentPassword };
            if (hasUsernameChanged) body.username = username;
            if (hasPasswordChanged) body.password = password;
            if (hasSessionTimeoutChanged) body.sessionTimeout = sessionTimeout;

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

            // Explicit confirmation dialog for password changes
            if (hasPasswordChanged) {
                window.alert("Password Changed Successfully.\n\nPlease use your new password the next time you log in.");
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            setError(msg);
        }
    };
    
    const handleResetViews = () => {
        if (window.confirm("Are you sure? This will clear ALL remembered sort, filter, and view settings for every list.")) {
            resetAllViewSettings();
            setSuccess('All view settings reset.');
        }
    };

    return (
        <Modal title="User Settings" onClose={onClose} theme={theme}>
            <form onSubmit={handleUpdate} className="space-y-4">
                
                {/* Global View Settings */}
                <div className={`p-3 rounded border ${isOrange ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}>
                    <h4 className={`text-sm font-semibold mb-2 ${isOrange ? 'text-gray-200' : 'text-gray-700 dark:text-gray-200'}`}>Global View Preferences</h4>
                    
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={globalViewPersistence} 
                                onChange={(e) => setGlobalViewPersistence(e.target.checked)}
                                className={`rounded border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${isOrange ? 'text-orange-500 focus:ring-orange-500' : 'text-blue-600'}`} 
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Remember view settings by default</span>
                        </label>
                        <Tooltip text="Clears all saved view data for all lists">
                            <button 
                                type="button" 
                                onClick={handleResetViews} 
                                className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                                Reset All Views
                            </button>
                        </Tooltip>
                    </div>
                    <p className="text-xs text-gray-500">
                        Applies to Sort Order, Completed Filters, and special views like Focused/All Tasks. Can be toggled per-list in the list toolbar.
                    </p>
                </div>

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
                    <div className="relative mt-1">
                        <input 
                            type={showNewPassword ? "text" : "password"} 
                            placeholder="Leave blank to keep current"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className={`block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            {showNewPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
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
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password (Required for account changes)</label>
                     <div className="relative mt-1">
                        <input 
                            type={showCurrentPassword ? "text" : "password"} 
                            value={currentPassword} 
                            onChange={e => setCurrentPassword(e.target.value)} 
                            className={`block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                            required={username !== user.username || password.length > 0 || sessionTimeout !== (user.sessionTimeout || '')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            {showCurrentPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-500 font-bold p-2 bg-green-50 rounded border border-green-200 dark:bg-green-900/20 dark:border-green-800">{success}</p>}

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
