
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { Task, TaskListWithUsers, Theme, User } from '../types';
import { parseTasksFromFile } from '../utils/csvImporter';

export type SpecialViewType = 'all' | 'importance' | 'pinned' | 'dependencies' | 'focused' | 'due_tasks' | null;

interface TaskBoxContextType {
    // State
    theme: Theme;
    user: User | null;
    lists: TaskListWithUsers[];
    activeListId: number | null;
    activeList: TaskListWithUsers | undefined;
    specialView: SpecialViewType; // New state for Global Views
    searchQuery: string;
    loading: boolean;
    error: string | null;
    needsSetup: boolean;
    authLoaded: boolean;
    debugMode: boolean;
    sidebarAccordionMode: boolean;
    globalViewPersistence: boolean; // New Global Setting

    // Setters
    toggleTheme: () => void;
    setSearchQuery: (query: string) => void;
    setActiveListId: (id: number | null) => void;
    setSpecialView: (view: SpecialViewType) => void; // New setter
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setError: (error: string | null) => void;
    setSidebarAccordionMode: (enabled: boolean) => void;
    setGlobalViewPersistence: (enabled: boolean) => void; // New Setter

    // Actions
    fetchData: () => Promise<void>;
    apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
    handleLogout: () => void;
    resetAllViewSettings: () => void; // New Action
    
    // API Wrappers
    addList: (title: string, parentId: number | null) => Promise<void>;
    removeList: (listId: number) => Promise<void>;
    moveList: (listId: number, parentId: number | null) => Promise<void>;
    mergeList: (sourceId: number, targetId: number) => Promise<void>;
    renameList: (listId: number, newTitle: string) => Promise<void>;
    transferListOwnership: (listId: number, newOwnerId: number) => Promise<void>; // Added
    addTask: (listId: number, description: string) => Promise<void>;
    removeTask: (taskId: number) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    reorderListTasks: (listId: number, tasks: {id: number, sortOrder: number}[]) => Promise<void>; // Added
    reorderGlobalTasks: (tasks: {id: number, globalSortOrder: number}[]) => Promise<void>; // Added for global view
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

    // Sidebar Accordion State
    const [sidebarAccordionMode, setSidebarAccordionModeState] = useState<boolean>(() => {
        try {
            const item = window.localStorage.getItem('taskbox-accordion');
            return item === 'true';
        } catch { return false; }
    });

    // Global View Persistence State (Default: True)
    const [globalViewPersistence, setGlobalViewPersistenceState] = useState<boolean>(() => {
        try {
            const item = window.localStorage.getItem('taskbox-global-persistence');
            return item !== 'false'; // Default to true if missing
        } catch { return true; }
    });

    // Debug Mode
    const [debugMode, setDebugMode] = useState(false);

    useEffect(() => {
        window.localStorage.setItem('taskbox-theme', JSON.stringify(theme));
        document.documentElement.classList.remove('light', 'dark', 'orange');
        document.documentElement.classList.add(theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        
        if (theme === 'orange') document.body.classList.add('theme-orange');
        else document.body.classList.remove('theme-orange');
    }, [theme]);

    const setSidebarAccordionMode = useCallback((enabled: boolean) => {
        setSidebarAccordionModeState(enabled);
        window.localStorage.setItem('taskbox-accordion', String(enabled));
    }, []);

    const setGlobalViewPersistence = useCallback((enabled: boolean) => {
        setGlobalViewPersistenceState(enabled);
        window.localStorage.setItem('taskbox-global-persistence', String(enabled));
    }, []);

    const resetAllViewSettings = useCallback(() => {
        // Iterate over localStorage and remove keys starting with 'taskbox-view-state-' or 'taskbox-persistence-override-'
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('taskbox-view-state-') || key.startsWith('taskbox-global-view-state') || key.startsWith('taskbox-persistence-override-'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        // Force reload to apply defaults
        window.location.reload();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const debugParam = params.get('debug');
        const tooltipsParam = params.get('tooltips');
        const path = window.location.pathname;

        // Check for explicit Disable signals first
        if (debugParam === 'off' || debugParam === 'false' || tooltipsParam === 'off' || tooltipsParam === 'false') {
            setDebugMode(false);
            return;
        }

        // Check for Enable signals
        const isDebug = 
            debugParam === 'true' || 
            debugParam === 'on' || 
            tooltipsParam === 'on' ||
            path === '/debug';
        
        setDebugMode(isDebug);
        if (isDebug) {
            console.log("TaskBox Debug Mode Enabled via URL");
        }
    }, []);

    const toggleTheme = useCallback(() => setTheme(p => p === 'light' ? 'dark' : p === 'dark' ? 'orange' : 'light'), []);

    // App State
    const [lists, setLists] = useState<TaskListWithUsers[]>([]);
    const [activeListId, setActiveListIdState] = useState<number | null>(null);
    const [specialView, setSpecialViewState] = useState<SpecialViewType>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth State
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('taskbox-token'));
    const [user, setUser] = useState<User | null>(null);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [authLoaded, setAuthLoaded] = useState(false);

    // Custom setters to ensure mutual exclusivity between List View and Special View
    const setActiveListId = (id: number | null) => {
        setActiveListIdState(id);
        if (id !== null) {
            setSpecialViewState(null); // Clear special view if a list is selected
            if (user) localStorage.setItem(`taskbox-last-list-${user.id}`, String(id));
        }
    };

    const setSpecialView = (view: SpecialViewType) => {
        setSpecialViewState(view);
        if (view !== null) {
            setActiveListIdState(null); // Clear active list if special view is selected
            if (user) localStorage.removeItem(`taskbox-last-list-${user.id}`); // Clear last list logic when in special view
        }
    };

    // Refs to break dependency cycles
    const activeListIdRef = useRef(activeListId);
    useEffect(() => { activeListIdRef.current = activeListId; }, [activeListId]);

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
            
            const currentActiveId = activeListIdRef.current;
            
            // Logic: Remember Last List
            if (currentActiveId === null) {
                 const storedLastList = localStorage.getItem(`taskbox-last-list-${user.id}`);
                 if (storedLastList) {
                     const id = parseInt(storedLastList);
                     if (data.find((l: any) => l.id === id)) {
                         setActiveListIdState(id);
                     }
                 }
            }
            
            // If active list was deleted, reset
            if (currentActiveId !== null && !data.find((l: any) => l.id === currentActiveId)) {
                setActiveListId(data.length > 0 ? data[0].id : null);
            }

        } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
        finally { setLoading(false); }
    }, [user, apiFetch]); 

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
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const transferListOwnership = async (listId: number, newOwnerId: number) => {
        try {
            const response = await apiFetch(`/api/lists/${listId}/transfer`, {
                method: 'POST',
                body: JSON.stringify({ newOwnerId })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }
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
            const response = await apiFetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                body: JSON.stringify(task),
            });
            if (!response.ok) {
                const data = await response.json();
                // Alert for focus limit
                if (data.message) alert(data.message);
            }
            fetchData();
        } catch (err) { console.error("Failed to update task."); }
    };

    const reorderListTasks = async (listId: number, tasks: {id: number, sortOrder: number}[]) => {
        try {
            const response = await apiFetch(`/api/lists/${listId}/tasks/reorder`, {
                method: 'PUT',
                body: JSON.stringify({ tasks })
            });
             if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }
            fetchData();
        } catch (err: any) { console.error("Failed to reorder tasks.", err); }
    };
    
    const reorderGlobalTasks = async (tasks: {id: number, globalSortOrder: number}[]) => {
        try {
            const response = await apiFetch(`/api/tasks/reorder-global`, {
                method: 'PUT',
                body: JSON.stringify({ tasks })
            });
             if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }
            fetchData();
        } catch (err: any) { console.error("Failed to reorder global tasks.", err); }
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
            specialView, setSpecialView,
            searchQuery, setSearchQuery,
            loading, error, setError, needsSetup, authLoaded, debugMode, sidebarAccordionMode, 
            globalViewPersistence, setGlobalViewPersistence, resetAllViewSettings,
            setSidebarAccordionMode,
            fetchData, apiFetch, handleLogout,
            addList, removeList, moveList, mergeList, renameList, transferListOwnership,
            addTask, removeTask, updateTask, reorderListTasks, reorderGlobalTasks, processImport, copyTaskToList
        }}>
            {children}
        </TaskBoxContext.Provider>
    );
};
