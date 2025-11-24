import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import TaskListTabs from './components/TaskListTabs';
import TaskListView from './components/TaskListView';
import AddListModal from './components/AddListModal';
import AboutModal from './components/AboutModal';
import type { Task, TaskList, Theme } from './types';
import { exportTasksToCSV } from './utils/csvExporter';
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
  const [lists, setLists] = useState<TaskList[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [isAddListModalOpen, setIsAddListModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This effect runs once on mount to detect the environment and fetch initial data.
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      setError(null);

      // @ts-ignore - aistudio is a global injected by the environment to detect if we're in the studio
      if (window.aistudio) {
        setError(
          "Welcome to the TaskBox frontend preview! " +
          "This is a client-server application that requires a Docker container with a database to run properly. " +
          "To use all features, please follow the deployment instructions."
        );
        setLoading(false);
        return; // Stop further execution in the studio environment
      }

      // If not in the studio, proceed with the health check for a real deployment
      try {
        // Health check to see if the backend is running and connected to the DB
        const healthResponse = await fetch('/api/health');
        if (!healthResponse.ok) {
          // This will be caught by the catch block below
          throw new Error('Backend not available or unhealthy.');
        }

        // If health is ok, fetch the actual lists
        const listsResponse = await fetch('/api/lists');
        if (!listsResponse.ok) {
          throw new Error(`HTTP error fetching lists! status: ${listsResponse.status}`);
        }
        
        const data = await listsResponse.json();
        setLists(data);
        // Set the active list to the first one if none is selected
        if (data.length > 0) {
          setActiveListId(data[0].id);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        setError(
          "Could not connect to the TaskBox server. This is a standalone application that requires its backend service to be running. " +
          "Please ensure you have started the application using Docker as per the setup instructions."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array ensures this runs only once when the component mounts.


  const activeList = useMemo(() => lists.find(list => list.id === activeListId), [lists, activeListId]);

  const addList = async (title: string, description: string) => {
    try {
      setError(null);
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
       if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const newList = await response.json();
      setLists(prev => [...prev, newList]);
      setActiveListId(newList.id);
      setIsAddListModalOpen(false);
    } catch (err) {
      console.error("Failed to add list:", err);
      setError("Failed to add the new list. Please check your connection and try again.");
    }
  };

  const removeList = async (listId: number) => {
    if (window.confirm('Are you sure you want to permanently delete this list and all its tasks?')) {
      try {
        setError(null);
        const response = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const updatedLists = lists.filter(list => list.id !== listId);
        setLists(updatedLists);
        if (activeListId === listId) {
          setActiveListId(updatedLists.length > 0 ? updatedLists[0].id : null);
        }
      } catch (err) {
        console.error("Failed to remove list:", err);
        setError("Failed to delete the list. Please try again.");
      }
    }
  };
  
  const addTask = async (listId: number, description: string) => {
    try {
        setError(null);
        const response = await fetch(`/api/lists/${listId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description }),
        });
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const newTask = await response.json();
        const updatedLists = lists.map(list => 
            list.id === listId ? { ...list, tasks: [...(list.tasks || []), newTask] } : list
        );
        setLists(updatedLists);
    } catch (err) {
        console.error("Failed to add task:", err);
        setError("Failed to add the new task. Please try again.");
    }
  };

  const addTasksBulk = async (listId: number, tasks: Partial<Task>[]) => {
    try {
      setError(null);
      const response = await fetch(`/api/lists/${listId}/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      }
      const newTasks = await response.json();
      const updatedLists = lists.map(list => 
        list.id === listId ? { ...list, tasks: [...(list.tasks || []), ...newTasks] } : list
      );
      setLists(updatedLists);
      alert(`${newTasks.length} tasks imported successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error("Failed to import tasks:", errorMessage);
      setError(`Failed to import tasks. ${errorMessage}`);
    }
  };

  const updateTask = async (listId: number, updatedTask: Task) => {
    try {
        setError(null);
        const response = await fetch(`/api/tasks/${updatedTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTask),
        });
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const returnedTask = await response.json();
        const updatedLists = lists.map(list => {
            if (list.id === listId) {
                return {
                    ...list,
                    tasks: list.tasks.map(task => task.id === returnedTask.id ? returnedTask : task),
                };
            }
            return list;
        });
        setLists(updatedLists);
    } catch (err) {
        console.error("Failed to update task:", err);
        setError("Failed to update the task. Please try again.");
    }
  };

  const removeTask = async (listId: number, taskId: number) => {
    try {
        setError(null);
        const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        const updatedLists = lists.map(list => {
            if (list.id === listId) {
                return { ...list, tasks: list.tasks.filter(task => task.id !== taskId) };
            }
            return list;
        });
        setLists(updatedLists);
    } catch (err) {
        console.error("Failed to remove task:", err);
        setError("Failed to delete the task. Please try again.");
    }
  };

  const handleExport = () => {
    if (activeList) {
      exportTasksToCSV(activeList.tasks, `${activeList.title}-tasks.csv`);
    }
  };
  
  const handleImport = () => {
    if (!activeListId) {
      alert("Please select a list to import tasks into.");
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) {
            throw new Error("File is empty or could not be read.");
          }
          const tasksToCreate = parseTasksFromFile(content);
          
          if (tasksToCreate.length > 0) {
            await addTasksBulk(activeListId, tasksToCreate);
          } else {
            alert("No valid tasks found in the file. Please ensure the file has a header row with at least a 'description' column and some data.");
          }
        } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : 'An unknown error occurred.';
            console.error("Failed to parse file:", errorMessage);
            setError(`Could not parse the file. Please ensure it is a valid CSV or TXT file. Error: ${errorMessage}`);
        }
      };
      reader.onerror = () => {
        setError("Failed to read the selected file.");
      }
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

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
        onImport={handleImport}
        onExport={handleExport}
        onShowAbout={() => setIsAboutModalOpen(true)}
      />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${
            theme === 'orange' ? 'bg-black' : 'bg-white dark:bg-gray-800'
        } rounded-lg shadow-lg overflow-hidden`}>
          {loading ? (
            <div className="p-16 text-center">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-t-lg">
                <h2 className="text-xl font-semibold mb-2">Application Notice</h2>
                <p>{error}</p>
            </div>
          ) : null}
          
          { !loading && !error && (
            <>
              <TaskListTabs
                lists={lists}
                activeListId={activeListId}
                onSelectList={setActiveListId}
                onRemoveList={removeList}
                theme={theme}
              />
              {activeList ? (
                <TaskListView
                  key={activeList.id}
                  list={activeList}
                  theme={theme}
                  onUpdateTask={(task) => updateTask(activeList.id, task)}
                  onAddTask={(description) => addTask(activeList.id, description)}
                  onRemoveTask={(taskId) => removeTask(activeList.id, taskId)}
                />
              ) : (
                <div className="p-16 text-center text-gray-500">
                  <h2 className="text-2xl font-semibold mb-2">No lists available.</h2>
                  <p>Create a new list to get started!</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer theme={theme} />
      {isAddListModalOpen && (
        <AddListModal
          onClose={() => setIsAddListModalOpen(false)}
          onAddList={addList}
          theme={theme}
        />
      )}
      {isAboutModalOpen && (
        <AboutModal
            onClose={() => setIsAboutModalOpen(false)}
            theme={theme}
        />
      )}
    </div>
  );
};

export default App;