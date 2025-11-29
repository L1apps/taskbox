import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Task, TaskListWithUsers, Theme, User } from '../types';
import { parseTasksFromFile } from '../utils/csvImporter';

interface TaskBoxContextType {
    // State
    theme: Theme;
    user: User | null;
    lists: TaskListWithUsers[];
    activeListId: number | null;
    activeList: TaskListWithUsers | undefined;
    searchQuery: string;
    loading: boolean;
    error: string | null;
    needsSetup: boolean;
    authLoaded: boolean;

    // Setters
    toggleTheme: () => void;
    setSearchQuery: (query: string) => void;
    setActiveListId: (id: number | null) => void;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setError: (error: string | null) => void;

    // Actions
    fetchData: () => Promise<void>;
    apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
    handleLogout: () => void;
    
    // API Wrappers
    addList: (title: string, parentId: number | null) => Promise<void>;
    removeList: (listId: number) => Promise<void>;
    moveList: (listId: number, parentId: number | null) => Promise<void>;
    mergeList: (sourceId: number, targetId: number) => Promise<void>;
    renameList: (listId: number, newTitle: string) => Promise<void>;
    addTask: (listId: number, description: string) => Promise<void>;
    removeTask: (taskId: number) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    processImport: (fileContent: string) => Promise<void>;
    copyTaskToList: (taskId: number, targetListId: number, move: boolean) => Promise<void>;
}

const TaskBoxContext = createContext<TaskBoxContextType | undefined>(undefined);

export const useTaskBox = () => {
    const context = useContext(TaskBoxContext);
    if (!context) throw new Error('useTaskBox must be used within a TaskBoxProvider');
    return context;
};

export const TaskBoxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Theme State
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const item = window.localStorage.getItem('taskbox-theme');
            return item ? JSON.parse(item) : 'light';
        } catch { return 'light'; }
    });

    useEffect(() => {
        window.localStorage.setItem('taskbox-theme', JSON.stringify(theme));
        document.documentElement.classList.remove('light', 'dark', 'orange');
        document.documentElement.classList.add(theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        
        if (theme === 'orange') document.body.classList.add('theme-orange');
        else document.body.classList.remove('theme-orange');
    }, [theme]);

    const toggleTheme = useCallback(() => setTheme(p => p === 'light' ? 'dark' : p === 'dark' ? 'orange' : 'light'), []);

    // App State
    const [lists, setLists] = useState<TaskListWithUsers[]>([]);
    const [activeListId, setActiveListId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth State
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('taskbox-token'));
    const [user, setUser] = useState<User | null>(null);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [authLoaded, setAuthLoaded] = useState(false);

    const setToken = (t: string | null) => {
        if (t) localStorage.setItem('taskbox-token', t);
        else localStorage.removeItem('taskbox-token');
        setTokenState(t);
    };

    const handleLogout = useCallback(() => {
        setUser(null);
        setToken(null);
    }, []);

    const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string> || {}),
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) { 
            handleLogout(); 
            throw new Error('Session expired.'); 
        }
        return response;
    }, [token, handleLogout]);

    // Initialization
    useEffect(() => {
        const initializeApp = async () => {
            // @ts-ignore
            if (window.aistudio) { setError("AI Studio Preview Mode. Backend unavailable."); setAuthLoaded(true); setLoading(false); return; }
            try {
                const setupRes = await fetch('/api/users/any-exist');
                const setupData = await setupRes.json();
                setNeedsSetup(!setupData.usersExist);
                if (setupData.usersExist && token) {
                    const meRes = await apiFetch('/api/users/me');
                    if (meRes.ok) setUser(await meRes.json());
                    else handleLogout();
                }
            } catch (e) { setError("Could not connect to server."); }
            finally { setAuthLoaded(true); setLoading(false); }
        };
        initializeApp();
    }, [apiFetch, token, handleLogout]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await apiFetch('/api/lists');
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            setLists(data);
            
            // Only auto-select if no list is active OR active list was deleted
            if (data.length > 0) {
                 if (activeListId === null || !data.find((l: any) => l.id === activeListId)) {
                     setActiveListId(data[0].id);
                 }
            } else {
                setActiveListId(null);
            }
        } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
        finally { setLoading(false); }
    }, [user, apiFetch, activeListId]);

    useEffect(() => { fetchData(); }, [user, fetchData]);

    const activeList = lists.find(list => list.id === activeListId);

    // --- API WRAPPERS ---

    const addList = async (title: string, parentId: number | null) => {
        try {
            const response = await apiFetch('/api/lists', {
                method: 'POST',
                body: JSON.stringify({ title, parentId }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed');
            }
            fetchData();
        } catch (err: any) { alert(err.message); }
    };

    const removeList = async (listId: number) => {
        if (window.confirm('WARNING: Deleting this list will ALSO delete all sublists and tasks contained within it. Continue?')) {
            try {
                const response = await apiFetch(`/api/lists/${listId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed');
                fetchData();
            } catch (err: any) { alert(err.message); }
        }
    };

    const moveList = async (listId: number, parentId: number | null) => {
        try {
            const response = await apiFetch(`/api/lists/${listId}`, {
                method: 'PUT',
                body: JSON.stringify({ parentId })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const mergeList = async (sourceId: number, targetId: number) => {
        try {
            const response = await apiFetch(`/api/lists/${sourceId}/merge`, {
                method: 'POST',
                body: JSON.stringify({ targetId })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const renameList = async (listId: number, newTitle: string) => {
        try {
            const response = await apiFetch(`/api/lists/${listId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: newTitle })
            });
            if (!response.ok) throw new Error('Failed to rename list');
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const addTask = async (listId: number, description: string) => {
        try {
            const response = await apiFetch(`/api/lists/${listId}/tasks`, {
                method: 'POST',
                body: JSON.stringify({ description })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (err: any) { alert(err.message); }
    };

    const removeTask = async (taskId: number) => {
        try {
            await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            fetchData();
        } catch (err) { console.error("Failed to remove task."); }
    };

    const updateTask = async (task: Task) => {
        try {
            await apiFetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                body: JSON.stringify(task),
            });
            fetchData();
        } catch (err) { console.error("Failed to update task."); }
    };

    const processImport = async (fileContent: string) => {
        if (!activeList) return alert("Select a list.");
        try {
            setLoading(true);
            const tasks = parseTasksFromFile(fileContent);
            const response = await apiFetch(`/api/lists/${activeList.id}/tasks/bulk`, {
                method: 'POST',
                body: JSON.stringify({ tasks })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }
            fetchData();
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const copyTaskToList = async (taskId: number, targetListId: number, move: boolean) => {
        try {
            const response = await apiFetch(`/api/tasks/${taskId}/copy`, {
                method: 'POST',
                body: JSON.stringify({ targetListId, move })
            });
            if (!response.ok) throw new Error("Operation failed");
            fetchData();
        } catch (err) { alert("Failed to copy/move task."); }
    };

    return (
        <TaskBoxContext.Provider value={{
            theme, toggleTheme,
            user, setUser, setToken,
            lists, activeListId, activeList, setActiveListId,
            searchQuery, setSearchQuery,
            loading, error, setError, needsSetup, authLoaded,
            fetchData, apiFetch, handleLogout,
            addList, removeList, moveList, mergeList, renameList,
            addTask, removeTask, updateTask, processImport, copyTaskToList
        }}>
            {children}
        </TaskBoxContext.Provider>
    );
};
