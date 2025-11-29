
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, TaskListWithUsers } from '../types';
import { useTaskBox } from '../contexts/TaskBoxContext';

interface MergeListModalProps {
  onClose: () => void;
  onMerge: (sourceId: number, targetId: number) => void;
  sourceList: TaskListWithUsers;
  lists: TaskListWithUsers[]; // Kept for interface compatibility but we use context
  theme: Theme;
}

const MergeListModal: React.FC<MergeListModalProps> = ({ onClose, onMerge, sourceList, theme }) => {
  const { lists, user } = useTaskBox();
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  const isContainer = sourceList.children && sourceList.children.length > 0;

  // Valid Targets Logic:
  // 1. Not self.
  // 2. Not a parent list that has sublists (Container lists cannot hold tasks).
  // 3. Must be owned by the current user (Permissions). Shared lists you don't own are hidden.
  // 4. Source list cannot be a container.
  
  const availableTargets = isContainer ? [] : lists.filter(l => 
      l.id !== sourceList.id && 
      l.ownerId === user?.id && // Only show lists I own
      !lists.some(child => child.parentId === l.id) // Target must not be a container
  );

  const handleMerge = () => {
      if (!selectedTargetId) return;
      if (window.confirm(`Are you sure? This will move all tasks from "${sourceList.title}" to the target list and DELETE "${sourceList.title}".`)) {
          onMerge(sourceList.id, Number(selectedTargetId));
      }
  };
  
  const isOrange = theme === 'orange';
  const themeRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  return (
    <Modal title={`Merge "${sourceList.title}"`} onClose={onClose} theme={theme}>
      <div className="space-y-4">
        {isContainer ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 dark:bg-red-900/20 dark:border-red-600">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-200">
                            This list contains sublists. You cannot merge a container list into another list.
                        </p>
                    </div>
                </div>
            </div>
        ) : (
            <>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 dark:bg-yellow-900/20 dark:border-yellow-600">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                Merging will move all tasks to the selected list and <span className="font-bold">permanently delete</span> the current list "{sourceList.title}".
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Merge into (Target List)
                </label>
                <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 ${themeRingColor} sm:text-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                >
                    <option value="">Select a list...</option>
                    {availableTargets.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                </select>
                {availableTargets.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">No valid target lists available (Must be a task list you own).</p>
                )}
                </div>
            </>
        )}
        
        <div className="flex justify-end pt-2 space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
            <button onClick={handleMerge} disabled={!selectedTargetId} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50`}>Merge & Delete</button>
        </div>
      </div>
    </Modal>
  );
};

export default MergeListModal;
