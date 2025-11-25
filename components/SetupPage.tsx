import React, { useState } from 'react';
import { Theme, User } from '../types';

interface SetupPageProps {
    onSetupComplete: (token: string, user: User) => void;
    theme: Theme;
}

const SetupPage: React.FC<SetupPageProps> = ({ onSetupComplete, theme }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isOrange = theme === 'orange';
    const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
    const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
    const inputTextColor = isOrange ? 'text-gray-900' : '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            setLoading(false);
            return;
        }
        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Setup failed');
            }
            onSetupComplete(data.token, data.user);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col min-h-screen items-center justify-center font-sans transition-colors duration-300 ${
            isOrange ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 dark:bg-gray-900'
        }`}>
            <div className={`${isOrange ? 'bg-black' : 'bg-white dark:bg-gray-800'} w-full max-w-md p-8 rounded-lg shadow-lg`}>
                <div className="text-center mb-6">
                    <h1 className={`text-3xl font-bold ${isOrange ? 'text-orange-400' : 'text-gray-900 dark:text-white'}`}>Welcome to TaskBox</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Let's set up the first administrator account.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${focusRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${focusRingColor} disabled:opacity-50`}
                    >
                        {loading ? 'Creating Account...' : 'Create Admin Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetupPage;