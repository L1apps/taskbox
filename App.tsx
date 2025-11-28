
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import TaskListTabs from './components/TaskListTabs';
import TaskListView from './components/TaskListView';
import AddListModal from './components/AddListModal';
import AboutModal from './components/AboutModal';
import StatsModal from './components/StatsModal';
import ShareListModal from './components/ShareListModal';
import LoginPage from './components/LoginPage';
import SetupPage from './components/SetupPage';
import AdminModal from './components/AdminModal';
import UserSettingsModal from './components/UserSettingsModal';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import type { Task, TaskList, Theme, User, TaskListWithUsers } from './types';
import { parseTasksFromFile } from './utils/csvImporter';

// Custom hook for theme to still use localStorage for user preference
function useTheme(key: string, initialValue: Theme): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(theme));
    document.documentElement.classList.remove('light', 'dark', 'orange');
    document.documentElement.classList.add(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, key]);

  const toggleTheme = () => {
    setTheme(prevTheme => 
      prevTheme === 'light' ? 'dark' : prevTheme === 'dark' ? 'orange' : 'light'
    );
  };

  return [theme, toggleTheme];
}

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme('taskbox-theme', 'light');
  const [lists, setLists] = useState<TaskListWithUsers[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  
  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const isResizing = useRef(false);

  // Modal states
  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [listToShare, setListToShare] = useState<TaskListWithUsers | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth states
  const [token, setToken] = useState<string | null>(localStorage.getItem('taskbox-token'));
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = { ...options.headers, 'Content-Type': 'application/json' };
    if (token) {
        // @ts-ignore
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
    }
    
    return response;
  }, [token]);
  
  const handleLogout = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('taskbox-token');
  };

  useEffect(() => {
    const initializeApp = async () => {
      // @ts-ignore
      if (window.aistudio) {
        setError("Welcome to the TaskBox frontend preview! This is a multi-user application that requires a Docker container with a database to run properly.");
        setAuthLoaded(true);
        setLoading(false);
        return;
      }

      try {
        const setupResponse = await fetch('/api/users/any-exist');
        const setupData = await setupResponse.json();
        setNeedsSetup(!setupData.usersExist);

        if (setupData.usersExist && token) {
            const meResponse = await apiFetch('/api/users/me');
            if (meResponse.ok) {
                const userData = await meResponse.json();
                setUser(userData);
            } else {
                handleLogout();
            }
        }
      } catch (e) {
        setError("Could not connect to the TaskBox server. Please ensure the Docker container is running correctly.");
      } finally {
        setAuthLoaded(true);
        setLoading(false);
      }
    };
    initializeApp();
  }, [apiFetch, token]);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const response = await apiFetch('/api/lists');
        if (!response.ok) throw new Error('Failed to fetch lists');
        const data = await response.json();
        setLists(data);
        if (data.length > 0 && (activeListId === null || !data.find((l: TaskList) => l.id === activeListId))) {
            setActiveListId(data[0].id);
        } else if (data.length === 0) {
            setActiveListId(null);
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(msg);
    } finally {
        setLoading(false);
    }
  }, [user, apiFetch, activeListId]);

  useEffect(() => {
    fetchLists();
  }, [user, fetchLists]);
  
  // Sidebar Resize Logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing.current) return;
      e.preventDefault(); 
      let newWidth = e.clientX;
      if (newWidth < 150) newWidth = 150; 
      if (newWidth > 500) newWidth = 500; 
      setSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleLogin = (newToken: string, newUser: User) => {
    localStorage.setItem('taskbox-token', newToken);
    setToken(newToken);
    setUser(newUser);
    setNeedsSetup(false);
  };
  
  const handleUserUpdated = (updatedUser: User) => {
      setUser(updatedUser);
  };

  const activeList = useMemo(() => lists.find(list => list.id === activeListId), [lists, activeListId]);

  // --- Data Mutation Functions (Optimized for performance) ---

  const addList = async (title: string, description: string) => {
    try {
      setError(null);
      const response = await apiFetch('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
      const newList = await response.json();
      setLists(prev => [...prev, newList]);
      setActiveListId(newList.id);
      setIsAddListModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to add list. ${msg}`);
    }
  };

  const removeList = async (listId: number) => {
    if (window.confirm('Are you sure you want to permanently delete this list and all its tasks?')) {
      try {
        setError(null);
        const response = await apiFetch(`/api/lists/${listId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const updatedLists = lists.filter(list => list.id !== listId);
        setLists(updatedLists);
        if (activeListId === listId) {
          setActiveListId(updatedLists.length > 0 ? updatedLists[0].id : null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to delete list. ${msg}`);
      }
    }
  };
  
  const addTask = async (listId: number, description: string) => {
      try {
        setError(null);
        const response = await apiFetch(`/api/lists/${listId}/tasks`, {
          method: 'POST',
          body: JSON.stringify({ description })
        });
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const newTask = await response.json();
        setLists(prevLists => prevLists.map(l => 
            l.id === listId ? { ...l, tasks: [...l.tasks, newTask] } : l
        ));
      } catch(err) {
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to add task. ${msg}`);
      }
  };

  const removeTask = async (listId: number, taskId: number) => {
    try {
      setError(null);
      const response = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
      
      setLists(prevLists => prevLists.map(l => {
          if (l.id === listId) {
              const updatedTasks = l.tasks
                .filter(t => t.id !== taskId)
                .map(t => t.dependsOn === taskId ? { ...t, dependsOn: null } : t);
              
              return { ...l, tasks: updatedTasks };
          }
          return l;
      }));
    } catch(err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to remove task. ${msg}`);
    }
  };

  const updateTask = async (listId: number, updatedTask: Task) => {
    try {
        setError(null);
        const response = await apiFetch(`/api/tasks/${updatedTask.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedTask),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server responded with status: ${response.status}`);
        }
        const returnedTask = await response.json();
        setLists(prevLists => prevLists.map(l => {
          if (l.id === listId) {
            return { ...l, tasks: l.tasks.map(t => t.id === returnedTask.id ? returnedTask : t) };
          }
          return l;
        }));
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to update task. ${msg}`);
        fetchLists();
    }
  };
  
  const purgeCompletedTasks = async (listId: number) => {
      if (window.confirm('Are you sure you want to permanently delete all completed tasks from this list?')) {
          try {
            setError(null);
            const response = await apiFetch(`/api/lists/${listId}/tasks/completed`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            fetchLists();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(`Failed to purge tasks. ${msg}`);
          }
      }
  };
  
  const toggleAllTasks = async (completed: boolean) => {
      if (!activeList) return;
      const tasksToUpdate = activeList.tasks.filter(t => t.completed !== completed);
      if (tasksToUpdate.length === 0) return;

      try {
          setError(null);
          // Ideally use a bulk update endpoint
          for (const task of tasksToUpdate) {
              await apiFetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...task, completed }),
            });
          }
          fetchLists(); 
      } catch (err) {
          setError("Failed to update all tasks.");
      }
  };

  const processImport = async (fileContent: string) => {
      if (!activeList) {
          alert("Please select a list to import tasks into.");
          return;
      }
      
      try {
          setError(null);
          setLoading(true);
          const tasks = parseTasksFromFile(fileContent);
          
          if (tasks.length === 0) {
              throw new Error("No valid tasks found. Please check the format.");
          }
          
          const response = await apiFetch(`/api/lists/${activeList.id}/tasks/bulk`, {
              method: 'POST',
              body: JSON.stringify({ tasks })
          });
          
          if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to import tasks.');
          }
          
          await fetchLists();
          alert(`Successfully imported ${tasks.length} tasks.`);
          setIsImportModalOpen(false);
      } catch (err) {
          const msg = err instanceof Error ? err.message : 'An unknown error occurred during import';
          setError(msg);
      } finally {
          setLoading(false);
      }
  };
  
  if (!authLoaded) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">Loading...</div>;
  }

  // @ts-ignore
  if (window.aistudio) {
    return <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg m-8">
        <h2 className="text-xl font-semibold mb-2">Application Notice</h2>
        <p>{error}</p>
      </div>
  }
  
  if (needsSetup) {
      return <SetupPage onSetupComplete={handleLogin} theme={theme} />;
  }
  
  if (!user) {
      return <LoginPage onLogin={handleLogin} theme={theme} />;
  }

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${
        theme === 'orange' 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
    }`}>
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme} 
        onAddList={() => setIsAddListModalOpen(true)}
        onImport={() => setIsImportModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
        onShowAbout={() => setIsAboutModalOpen(true)}
        onShowStats={() => setIsStatsModalOpen(true)}
        onShowAdminPanel={() => setIsAdminModalOpen(true)}
        onShowUserSettings={() => setIsUserSettingsModalOpen(true)}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${
            theme === 'orange' ? 'bg-black' : 'bg-white dark:bg-gray-800'
        } rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row h-[calc(100vh-160px)]`}>
          
          {loading ? (
            <div className="p-16 text-center w-full">Loading lists...</div>
          ) : error ? (
            <div className="p-8 text-center w-full">
                <div className="text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-4 mb-4">
                    <h2 className="text-xl font-semibold mb-2">An Error Occurred</h2>
                    <p>{error}</p>
                </div>
                <button onClick={() => setError(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded">Dismiss</button>
            </div>
          ) : null}
          
          { !loading && !error && (
            <>
               {/* Resizable Sidebar */}
               <div 
                className="relative border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 shrink-0 bg-transparent flex flex-col"
                style={{ width: `${sidebarWidth}px` }}
               >
                  <TaskListTabs
                    lists={lists}
                    activeListId={activeListId}
                    onSelectList={setActiveListId}
                    theme={theme}
                  />
                  {/* Resizer Handle */}
                  <div 
                    onMouseDown={handleMouseDown}
                    className="hidden md:block absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors z-20"
                    title="Drag to resize"
                  ></div>
              </div>

              {/* Main Task View */}
              <div className="flex-grow overflow-hidden h-full">
                  {activeList ? (
                    <TaskListView
                      key={activeList.id}
                      list={activeList}
                      currentUser={user}
                      theme={theme}
                      onUpdateTask={(task) => updateTask(activeList.id, task)}
                      onPurgeCompleted={() => purgeCompletedTasks(activeList.id)}
                      onToggleAllTasks={(completed) => toggleAllTasks(completed)}
                      onAddTask={(desc) => addTask(activeList.id, desc)}
                      onRemoveTask={(taskId) => removeTask(activeList.id, taskId)}
                      onRemoveList={() => removeList(activeList.id)}
                      onShareList={() => setListToShare(activeList)}
                    />
                  ) : (
                    <div className="p-16 text-center text-gray-500 h-full flex flex-col justify-center">
                      <h2 className="text-2xl font-semibold mb-2">No lists available.</h2>
                      <p>Create a new list to get started!</p>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer theme={theme} />
      {isAddListModalOpen && <AddListModal onClose={() => setIsAddListModalOpen(false)} onAddList={addList} theme={theme} />}
      {isAboutModalOpen && <AboutModal onClose={() => setIsAboutModalOpen(false)} theme={theme} />}
      {isStatsModalOpen && <StatsModal onClose={() => setIsStatsModalOpen(false)} lists={lists} theme={theme} />}
      {isAdminModalOpen && user?.role === 'ADMIN' && <AdminModal onClose={() => setIsAdminModalOpen(false)} theme={theme} apiFetch={apiFetch} />}
      {isUserSettingsModalOpen && user && <UserSettingsModal onClose={() => setIsUserSettingsModalOpen(false)} user={user} theme={theme} apiFetch={apiFetch} onUserUpdated={handleUserUpdated} />}
      {listToShare && <ShareListModal list={listToShare} onClose={() => setListToShare(null)} theme={theme} apiFetch={apiFetch} onListUpdated={fetchLists} />}
      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={processImport} theme={theme} />}
      {isExportModalOpen && activeList && <ExportModal onClose={() => setIsExportModalOpen(false)} tasks={activeList.tasks} listName={activeList.title} theme={theme} />}
    </div>
  );
};

export default App;
