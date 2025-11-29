
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, Task, TaskListWithUsers } from '../types';
import { useTaskBox } from '../contexts/TaskBoxContext';

interface CopyTaskModalProps {
  onClose: () => void;
  task: Task;
  lists: TaskListWithUsers[]; // Interface compat
  onCopyToList: (targetListId: number, move: boolean) => void;
  theme: Theme;
}

const CopyTaskModal: React.FC<CopyTaskModalProps> = ({ onClose, task, onCopyToList, theme }) => {
  const { lists } = useTaskBox();
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [mode, setMode] = useState<'copy' | 'move'>('copy');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  // Filter lists:
  // 1. Must accept tasks (not containers).
  // 2. Cannot be the current list (for both Copy and Move, per user request).
  const validTargets = lists.filter(l => {
      // Must not be a container (no children)
      const isContainer = lists.some(child => child.parentId === l.id);
      if (isContainer) return false;

      // Exclude current list (Prevent redundancy)
      if (l.id === task.list_id) return false;

      return true;
  });

  const handleClipboardCopy = async () => {
      try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(task.description);
          } else {
              // Fallback
              const textArea = document.createElement("textarea");
              textArea.value = task.description;
              textArea.style.position = "fixed";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
          }
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (err) {
          console.error("Copy failed", err);
      }
  };

  const handleSubmit = () => {
      if (!selectedListId) return;
      onCopyToList(Number(selectedListId), mode === 'move');
      onClose();
  };

  return (
    <Modal title="Task Actions" onClose={onClose} theme={theme}>
        <div className="space-y-6">
            
            {/* Option 1: Clipboard */}
            <div className={`p-3 rounded border ${isOrange ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${isOrange ? 'text-gray-200' : 'text-gray-700 dark:text-gray-200'}`}>Clipboard</h4>
                <div className="flex items-center justify-between">
                    <span className="text-sm truncate mr-2 opacity-70">{task.description}</span>
                    <button 
                        onClick={handleClipboardCopy} 
                        className={`text-xs px-3 py-1.5 rounded text-white ${copiedToClipboard ? 'bg-green-600' : (isOrange ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600')}`}
                    >
                        {copiedToClipboard ? "Copied!" : "Copy Text"}
                    </button>
                </div>
            </div>

            {/* Option 2: Copy/Move to List */}
            <div>
                <h4 className={`text-sm font-semibold mb-2 ${isOrange ? 'text-gray-200' : 'text-gray-700 dark:text-gray-300'}`}>Organize</h4>
                
                <div className="flex space-x-4 mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={mode === 'copy'} onChange={() => { setMode('copy'); setSelectedListId(''); }} className={themeRingColor} />
                        <span className={isOrange ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}>Copy to List</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={mode === 'move'} onChange={() => { setMode('move'); setSelectedListId(''); }} className={themeRingColor} />
                        <span className={isOrange ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}>Move to List</span>
                    </label>
                </div>

                <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                >
                    <option value="">Select target list...</option>
                    {validTargets.map(l => (
                        <option key={l.id} value={l.id}>
                            {l.title}
                        </option>
                    ))}
                </select>
                {validTargets.length === 0 && <p className="text-xs text-gray-500 mt-2">No available lists to copy/move to.</p>}
            </div>

            <div className="flex justify-end pt-2 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
                <button onClick={handleSubmit} disabled={!selectedListId} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor} disabled:opacity-50`}>
                    {mode === 'move' ? 'Move Task' : 'Copy Task'}
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default CopyTaskModal;
