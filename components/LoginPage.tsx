import React, { useState } from 'react';
import { Theme, User } from '../types';

interface LoginPageProps {
    onLogin: (token: string, user: User) => void;
    theme: Theme;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme }) => {
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
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            onLogin(data.token, data.user);
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
                <div className="flex items-center justify-center space-x-4 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isOrange ? 'text-orange-400' : 'text-blue-500 dark:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <h1 className={`text-3xl font-bold ${isOrange ? 'text-orange-400' : 'text-gray-900 dark:text-white'}`}>TaskBox Login</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
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

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${focusRingColor} disabled:opacity-50`}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;