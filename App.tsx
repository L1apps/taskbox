
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import PasteModal from './components/PasteModal';
import ExportModal from './components/ExportModal';
import MoveListModal from './components/MoveListModal';
import MergeListModal from './components/MergeListModal';
import RenameListModal from './components/RenameListModal';
import type { Task, TaskListWithUsers, Theme, User } from './types';
import { parseTasksFromFile } from './utils/csvImporter';

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
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme, key]);

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : p === 'dark' ? 'orange' : 'light');
  return [theme, toggleTheme];
}

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme('taskbox-theme', 'light');
  const [lists, setLists] = useState<TaskListWithUsers[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  
  // Modal states
  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);
  const [targetParentId, setTargetParentId] = useState<number | null>(null);
  const [isMoveListModalOpen, setIsMoveListModalOpen] = useState(false);
  const [isMergeListModalOpen, setIsMergeListModalOpen] = useState(false);
  const [isRenameListModalOpen, setIsRenameListModalOpen] = useState(false);
  const [listToMove, setListToMove] = useState<TaskListWithUsers | null>(null);
  const [listToMerge, setListToMerge] = useState<TaskListWithUsers | null>(null);
  const [listToRename, setListToRename] = useState<TaskListWithUsers | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [listToShare, setListToShare] = useState<TaskListWithUsers | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState<string | null>(localStorage.getItem('taskbox-token'));
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) { handleLogout(); throw new Error('Session expired.'); }
    return response;
  }, [token]);
  
  const handleLogout = () => { setUser(null); setToken(null); localStorage.removeItem('taskbox-token'); };

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
  }, [apiFetch, token]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const res = await apiFetch('/api/lists');
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setLists(data);
        if (data.length > 0 && (activeListId === null || !data.find((l: any) => l.id === activeListId))) {
            setActiveListId(data[0].id);
        } else if (data.length === 0) {
            setActiveListId(null);
        }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  }, [user, apiFetch, activeListId]);

  useEffect(() => { fetchData(); }, [user, fetchData]);
  
  const activeList = useMemo(() => lists.find(list => list.id === activeListId), [lists, activeListId]);

  const addList = async (title: string) => {
    try {
      const response = await apiFetch('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ title, parentId: targetParentId }),
      });
      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed');
      }
      fetchData();
      setIsAddListModalOpen(false);
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
          setIsMoveListModalOpen(false);
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
          setIsMergeListModalOpen(false);
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
          setIsRenameListModalOpen(false);
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
      } catch(err: any) { alert(err.message); }
  };

  const removeTask = async (taskId: number) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchData();
    } catch(err) { console.error("Failed to remove task."); }
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
          setIsImportModalOpen(false);
          setIsPasteModalOpen(false);
      } catch (err: any) { alert(err.message); }
      finally { setLoading(false); }
  };
  
  if (!authLoaded) return <div>Loading...</div>;
  // @ts-ignore
  if (window.aistudio) return <div>Backend Required</div>;
  if (needsSetup) return <SetupPage onSetupComplete={(t, u) => { localStorage.setItem('taskbox-token', t); setToken(t); setUser(u); setNeedsSetup(false); }} theme={theme} />;
  if (!user) return <LoginPage onLogin={(t, u) => { localStorage.setItem('taskbox-token', t); setToken(t); setUser(u); }} theme={theme} />;

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${theme === 'orange' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'}`}>
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme} 
        onImport={() => setIsImportModalOpen(true)}
        onPaste={() => setIsPasteModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)} 
        onShowAbout={() => setIsAboutModalOpen(true)} 
        onShowStats={() => setIsStatsModalOpen(true)} 
        onShowAdminPanel={() => setIsAdminModalOpen(true)} 
        onShowUserSettings={() => setIsUserSettingsModalOpen(true)} 
        user={user} 
        onLogout={handleLogout} 
        activeList={activeList} 
      />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${theme === 'orange' ? 'bg-black' : 'bg-white dark:bg-gray-800'} rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row h-[calc(100vh-160px)]`}>
          {loading ? <div className="p-16 w-full text-center">Loading...</div> : error ? (
            <div className="p-8 w-full text-center"><p className="text-red-500">{error}</p><button onClick={() => setError(null)} className="mt-4 px-4 py-2 bg-gray-200 rounded">Dismiss</button></div>
          ) : (
            <>
               <div className="border-r border-gray-200 dark:border-gray-700 w-64 shrink-0 flex flex-col relative z-20 bg-inherit">
                  <TaskListTabs
                    lists={lists}
                    activeListId={activeListId}
                    onSelectList={setActiveListId}
                    onAddList={(parentId) => { setTargetParentId(parentId); setIsAddListModalOpen(true); }}
                    onDeleteList={removeList}
                    onMoveList={(list) => { setListToMove(list); setIsMoveListModalOpen(true); }}
                    onShareList={(list) => setListToShare(list)}
                    onMergeList={(list) => { setListToMerge(list); setIsMergeListModalOpen(true); }}
                    onRenameList={(list) => { setListToRename(list); setIsRenameListModalOpen(true); }}
                    theme={theme}
                    user={user}
                  />
              </div>
              <div className="flex-grow overflow-hidden h-full z-0">
                  {activeList ? (
                    <TaskListView
                      key={activeList.id}
                      list={activeList}
                      currentUser={user}
                      theme={theme}
                      onUpdateTask={updateTask}
                      onPurgeCompleted={() => { if(window.confirm('Purge completed?')) { apiFetch(`/api/lists/${activeList.id}/tasks/completed`, {method:'DELETE'}).then(fetchData); }}}
                      onToggleAllTasks={async (c) => { 
                          for(const t of activeList.tasks.filter(x => x.completed !== c)) await apiFetch(`/api/tasks/${t.id}`, { method: 'PUT', body: JSON.stringify({...t, completed: c})}); 
                          fetchData(); 
                      }}
                      onAddTask={(d) => addTask(activeList.id, d)}
                      onRemoveTask={(tid) => removeTask(tid)}
                    />
                  ) : (
                    <div className="p-16 text-center text-gray-500 flex flex-col justify-center h-full">Select a list or create one.</div>
                  )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer theme={theme} />
      {isAddListModalOpen && <AddListModal onClose={() => setIsAddListModalOpen(false)} onAddList={addList} theme={theme} />}
      {isMoveListModalOpen && listToMove && <MoveListModal onClose={() => setIsMoveListModalOpen(false)} lists={lists} list={listToMove} onMove={moveList} theme={theme} />}
      {isMergeListModalOpen && listToMerge && <MergeListModal onClose={() => setIsMergeListModalOpen(false)} lists={lists} sourceList={listToMerge} onMerge={mergeList} theme={theme} />}
      {isRenameListModalOpen && listToRename && <RenameListModal onClose={() => setIsRenameListModalOpen(false)} list={listToRename} onRename={renameList} theme={theme} />}
      {isAboutModalOpen && <AboutModal onClose={() => setIsAboutModalOpen(false)} theme={theme} />}
      {isStatsModalOpen && <StatsModal onClose={() => setIsStatsModalOpen(false)} lists={lists} theme={theme} />}
      {isAdminModalOpen && user?.role === 'ADMIN' && <AdminModal onClose={() => setIsAdminModalOpen(false)} theme={theme} apiFetch={apiFetch} onUpdate={fetchData} />}
      {isUserSettingsModalOpen && user && <UserSettingsModal onClose={() => setIsUserSettingsModalOpen(false)} user={user} theme={theme} apiFetch={apiFetch} onUserUpdated={setUser} />}
      {listToShare && <ShareListModal list={listToShare} onClose={() => setListToShare(null)} theme={theme} apiFetch={apiFetch} onListUpdated={fetchData} />}
      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={processImport} theme={theme} />}
      {isPasteModalOpen && <PasteModal onClose={() => setIsPasteModalOpen(false)} onImport={processImport} theme={theme} />}
      {isExportModalOpen && activeList && <ExportModal onClose={() => setIsExportModalOpen(false)} tasks={activeList.tasks} listName={activeList.title} theme={theme} />}
    </div>
  );
};
export default App;
