
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, Task } from '../types';
import { parseTasksFromFile } from '../utils/csvImporter';

interface PasteModalProps {
  onClose: () => void;
  onImport: (content: string) => void;
  tasks?: Task[]; // Optional tasks from active list
  theme: Theme;
  isReadOnlyView?: boolean; // New prop to disable paste/import functionality if no specific list is active
}

const PasteModal: React.FC<PasteModalProps> = ({ onClose, onImport, tasks = [], theme, isReadOnlyView = false }) => {
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  const handleImport = () => {
      if (!pastedText.trim()) {
          return;
      }
      if (pastedText.length > 50000) {
          setError("Text is too large. Please limit to 50,000 characters.");
          return;
      }
      
      // Strict Duplicate Checking
      try {
          const importedTasks = parseTasksFromFile(pastedText);
          const existingDescriptions = new Set(tasks.map(t => t.description.toLowerCase().trim()));
          
          const uniqueTasks = importedTasks.filter(t => {
              if (!t.description) return false;
              return !existingDescriptions.has(t.description.toLowerCase().trim());
          });
          
          const duplicatesCount = importedTasks.length - uniqueTasks.length;
          
          if (duplicatesCount > 0) {
              if (uniqueTasks.length === 0) {
                  setError(`All ${duplicatesCount} tasks are duplicates of existing tasks. Nothing to import.`);
                  return;
              }
              if (!window.confirm(`${duplicatesCount} duplicate task(s) found and will be skipped. Import remaining ${uniqueTasks.length} tasks?`)) {
                  return;
              }
          }
          
          if (duplicatesCount > 0) {
               const header = "Description,Completed,Due Date,Importance";
               const rows = uniqueTasks.map(t => {
                  const status = t.completed ? 'true' : 'false';
                  const due = t.dueDate || '';
                  const imp = t.importance || 0;
                  return `"${t.description}",${status},${due},${imp}`;
              });
              const filteredContent = [header, ...rows].join('\n');
              onImport(filteredContent);
          } else {
              onImport(pastedText);
          }
          
          onClose();

      } catch (e) {
          setError("Failed to parse text for duplicate checking.");
      }
  };

  const handleLoadTasks = (descriptionsOnly: boolean) => {
      if (tasks.length === 0) {
          setError("No tasks to load from current list.");
          return;
      }
      if (tasks.length > 2000) {
          setError("Too many tasks to load into text area (Max 2000). Please use Export feature instead.");
          return;
      }
      
      if (descriptionsOnly) {
          const rows = tasks.map(t => t.description);
          setPastedText(rows.join('\n'));
      } else {
          const header = "Description,Completed,Due Date,Importance";
          const rows = tasks.map(t => {
              const status = t.completed ? 'true' : 'false';
              const due = t.dueDate || '';
              return `"${t.description}",${status},${due},${t.importance}`;
          });
          setPastedText([header, ...rows].join('\n'));
      }
      
      setError('');
  };

  const handleCopyToClipboard = () => {
      if(!pastedText) return;
      navigator.clipboard.writeText(pastedText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <Modal title="Copy / Paste Tasks" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            <div className="py-2">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content Buffer</label>
                    <div className="flex space-x-2">
                        <button onClick={() => handleLoadTasks(true)} className="text-xs text-blue-500 hover:underline">Descriptions Only</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => handleLoadTasks(false)} className="text-xs text-blue-500 hover:underline">All Data</button>
                    </div>
                </div>
                
                <textarea 
                    value={pastedText}
                    onChange={(e) => { setPastedText(e.target.value); setError(''); }}
                    rows={10}
                    placeholder={isReadOnlyView ? "Use 'Load Active List' above to copy tasks from this view." : `Examples:\nBuy Milk\nCall John\n\nOR CSV Data:\nDescription,Due Date\nPay Rent,2025-05-01`}
                    className={`w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 ${focusRingColor} ${inputTextColor}`}
                    autoFocus
                />
                <div className="flex justify-between mt-2">
                    <div>
                        <button onClick={handleCopyToClipboard} disabled={!pastedText} className={`text-xs px-2 py-1 rounded text-white ${copied ? 'bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} disabled:opacity-50`}>
                            {copied ? "Copied!" : "Copy to Clipboard"}
                        </button>
                    </div>
                    <span className={`text-xs ${pastedText.length > 50000 ? 'text-red-500' : 'text-gray-400'}`}>
                        {pastedText.length} / 50000 chars
                    </span>
                </div>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                {isReadOnlyView && !error && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        Note: Import is disabled in Global Views. Please select a specific list to paste tasks.
                    </p>
                )}
            </div>
            
            <div className="flex justify-end pt-2 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
                <button onClick={handleImport} disabled={!pastedText.trim() || !!error || isReadOnlyView} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor} disabled:opacity-50`}>
                    Import Text
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default PasteModal;
