import React from 'react';
import type { Theme } from '../types';
import Tooltip from './Tooltip';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  onAddList: () => void;
  onImport: () => void;
  onExport: () => void;
  onShowAbout: () => void;
  onShowStats: () => void;
}

const ThemeIcon: React.FC<{ theme: Theme }> = ({ theme }) => {
    if (theme === 'light') return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    if (theme === 'dark') return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v1.5M12 16.253v1.5M16.253 12h1.5M6.253 12h1.5m10.18-5.18l-1.06-1.06M7.333 16.667l-1.06-1.06m10.18 1.06l-1.06 1.06M7.333 7.333l-1.06 1.06" /></svg>;
};

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onAddList, onImport, onExport, onShowAbout, onShowStats }) => {
  const isOrange = theme === 'orange';
  const buttonBase = 'flex items-center space-x-2 p-2 rounded-md transition';
  const iconButtonBase = 'p-2 rounded-full transition';
  const orangeHover = 'hover:bg-gray-800';
  const defaultHover = 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';

  return (
    <header className={`${isOrange ? 'bg-black' : 'bg-white dark:bg-gray-800'} shadow-md sticky top-0 z-10`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isOrange ? 'text-orange-400' : 'text-blue-500 dark:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <h1 className={`text-2xl font-bold ${isOrange ? 'text-orange-400' : 'text-gray-900 dark:text-white'}`}>TaskBox</h1>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Tooltip text="Import tasks from file to current list">
              <button onClick={onImport} className={`hidden sm:flex ${buttonBase} ${isOrange ? orangeHover : defaultHover}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 <span className="hidden md:inline">Import</span>
              </button>
            </Tooltip>
            <Tooltip text="Export tasks from current list to CSV">
              <button onClick={onExport} className={`hidden sm:flex ${buttonBase} ${isOrange ? orangeHover : defaultHover}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="hidden md:inline">Export</span>
              </button>
            </Tooltip>
            
            <Tooltip text="View on Docker Hub">
                <a href="https://hub.docker.com/r/l1apps" target="_blank" rel="noopener noreferrer" aria-label="Docker Hub" className={`${iconButtonBase} ${isOrange ? orangeHover : defaultHover}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.156 12.1c-.18-.45-.42-.88-.701-1.28-.28-.4-.62-.75-1.001-.93-.38-.18-.8-.22-1.21-.22h-1.63V4.28c0-.52-.18-.989-.52-1.379-.34-.39-.79-.59-1.32-.59H5.21c-.53 0-1 .2-1.34.59-.34.39-.51.859-.51 1.379v5.39H1.72c-.41 0-.83.04-1.21.22-.381.18-.721.53-1.001.93-.28.4-.521.83-.701 1.28C- Elise/22.75 12.52- Elise/22.84 13- Elise/22.84 13.5v2.58c0 .5.08.97.24 1.42.16.45.39.88.701 1.28.28.4.62.75 1.001.93.38.18.8.22 1.21.22h1.64v1.27c0 .52.17 1 .51 1.38.34.38.79.57 1.32.57h10.04c.53 0 1-.19 1.34-.57.34-.38.52-.86.52-1.38v-1.27h1.63c.41 0 .83-.04 1.21-.22.38-.18.72-.53 1.001-.93.28-.4.52-.83.701-1.28.16-.45.24-.92.24-1.42v-2.58c0-.5-.08-.98-.24-1.4zM8.84 14.86c-.11 0-.21-.04-.28-.12a.37.37 0 01-.12-.28v-1.72c0-.11.04-.21.12-.28.08-.08.18-.12.28-.12h1.72c.11 0 .21.04.28.12.08.08.12.18.12.28v1.72c0 .11-.04.21-.12.28a.37.37 0 01-.28.12H8.84zm3.43 0c-.11 0-.21-.04-.28-.12a.37.37 0 01-.12-.28v-1.72c0-.11.04-.21.12-.28.08-.08.18-.12.28-.12h1.72c.11 0 .21.04.28.12.08.08.12.18.12.28v1.72c0 .11-.04.21-.12.28a.37.37 0 01-.28.12h-1.72zm3.44 0c-.11 0-.21-.04-.28-.12a.37.37 0 01-.12-.28v-1.72c0-.11.04-.21.12-.28.08-.08.18-.12.28-.12h1.72c.11 0 .21.04.28.12.08.08.12.18.12.28v1.72c0 .11-.04.21-.12.28a.37.37 0 01-.28.12h-1.72z" />
                    </svg>
                </a>
            </Tooltip>
            <Tooltip text="View on GitHub">
                <a href="https://github.com/l1apps" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={`${iconButtonBase} ${isOrange ? orangeHover : defaultHover}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
            </Tooltip>
            <Tooltip text="View Statistics">
                <button onClick={onShowStats} aria-label="View Statistics" className={`${iconButtonBase} ${isOrange ? orangeHover : defaultHover}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                </button>
            </Tooltip>
            <Tooltip text="About TaskBox">
                <button onClick={onShowAbout} aria-label="About TaskBox" className={`${iconButtonBase} ${isOrange ? orangeHover : defaultHover}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </Tooltip>
            
            <Tooltip text="Create a new task list">
                <button onClick={onAddList} className={`py-2 px-3 rounded-md text-white transition ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                    <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span className="hidden sm:inline">New List</span>
                    </div>
                </button>
            </Tooltip>
            <Tooltip text="Toggle theme">
                <button onClick={onToggleTheme} className={`p-2 rounded-full transition ${isOrange ? orangeHover : defaultHover}`}>
                  <ThemeIcon theme={theme} />
                </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;