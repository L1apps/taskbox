import React from 'react';
import { TaskBoxProvider, useTaskBox } from './contexts/TaskBoxContext';
import { ModalProvider } from './contexts/ModalContext';
import Header from './components/Header';
import Footer from './components/Footer';
import TaskListTabs from './components/TaskListTabs';
import TaskListView from './components/TaskListView';
import SearchResultsView from './components/SearchResultsView';
import ModalManager from './components/ModalManager';
import LoginPage from './components/LoginPage';
import SetupPage from './components/SetupPage';

const MainLayout: React.FC = () => {
    const { 
        theme, 
        user, 
        loading, 
        error, 
        setError, 
        needsSetup, 
        authLoaded,
        activeList, 
        searchQuery,
        setToken,
        setUser
    } = useTaskBox();

    if (!authLoaded) return <div>Loading...</div>;
    // @ts-ignore
    if (window.aistudio) return <div>Backend Required</div>;

    if (needsSetup) {
        return <SetupPage onSetupComplete={(t, u) => { setToken(t); setUser(u); }} theme={theme} />;
    }
    
    if (!user) {
        return <LoginPage onLogin={(t, u) => { setToken(t); setUser(u); }} theme={theme} />;
    }

    return (
        <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${theme === 'orange' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'}`}>
            <Header />
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className={`${theme === 'orange' ? 'bg-black' : 'bg-white dark:bg-gray-800'} rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row h-[calc(100vh-160px)]`}>
                    {loading ? (
                        <div className="p-16 w-full text-center">Loading...</div>
                    ) : error ? (
                        <div className="p-8 w-full text-center">
                            <p className="text-red-500">{error}</p>
                            <button onClick={() => setError(null)} className="mt-4 px-4 py-2 bg-gray-200 rounded">Dismiss</button>
                        </div>
                    ) : (
                        <>
                           <div className="border-r border-gray-200 dark:border-gray-700 w-64 shrink-0 flex flex-col relative z-20 bg-inherit">
                              <TaskListTabs />
                          </div>
                          <div className="flex-grow overflow-hidden h-full z-0">
                                {searchQuery ? (
                                    <SearchResultsView />
                                ) : (
                                    activeList ? (
                                        <TaskListView key={activeList.id} />
                                    ) : (
                                        <div className="p-16 text-center text-gray-500 flex flex-col justify-center h-full">Select a list or create one.</div>
                                    )
                                )}
                          </div>
                        </>
                    )}
                </div>
            </main>
            <Footer theme={theme} />
            <ModalManager />
        </div>
    );
};

const App: React.FC = () => {
  return (
      <TaskBoxProvider>
          <ModalProvider>
              <MainLayout />
          </ModalProvider>
      </TaskBoxProvider>
  );
};

export default App;