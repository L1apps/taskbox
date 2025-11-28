
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme, Task } from '../types';
import { exportTasks } from '../utils/csvExporter';

interface ExportModalProps {
  onClose: () => void;
  tasks: Task[];
  listName: string;
  theme: Theme;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, tasks, listName, theme }) => {
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');
  const [delimiter, setDelimiter] = useState<',' | '\t'>(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [fields, setFields] = useState({
      description: true,
      completed: true,
      createdAt: true,
      dueDate: true,
      importance: true
  });

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  const handleExport = () => {
      exportTasks(tasks, listName, {
          format,
          delimiter: format === 'csv' ? ',' : delimiter,
          includeHeaders,
          fields
      });
      onClose();
  };

  return (
    <Modal title="Export Tasks" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            {/* Format Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">File Format</label>
                <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                        <input type="radio" checked={format === 'csv'} onChange={() => setFormat('csv')} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>CSV (Excel)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input type="radio" checked={format === 'txt'} onChange={() => setFormat('txt')} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>Text File</span>
                    </label>
                </div>
            </div>

            {/* Delimiter (Only for TXT) */}
            {format === 'txt' && (
                <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delimiter</label>
                     <select 
                        value={delimiter} 
                        onChange={(e) => setDelimiter(e.target.value as any)}
                        className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 ${inputTextColor}`}
                    >
                         <option value=",">Comma (,)</option>
                         <option value={'\t'}>Tab</option>
                     </select>
                </div>
            )}

            {/* Fields Selection */}
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Include Fields</label>
                 <div className="space-y-2">
                     <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={fields.description} disabled className="opacity-50" />
                        <span className="text-gray-500">Description (Required)</span>
                     </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={fields.completed} onChange={e => setFields({...fields, completed: e.target.checked})} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>Completed Status</span>
                     </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={fields.createdAt} onChange={e => setFields({...fields, createdAt: e.target.checked})} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>Date Created</span>
                     </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={fields.dueDate} onChange={e => setFields({...fields, dueDate: e.target.checked})} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>Due Date</span>
                     </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={fields.importance} onChange={e => setFields({...fields, importance: e.target.checked})} className={focusRingColor} />
                        <span className={isOrange ? 'text-gray-300' : ''}>Importance</span>
                     </label>
                 </div>
            </div>
            
            {/* Headers Toggle */}
            <div>
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={includeHeaders} onChange={e => setIncludeHeaders(e.target.checked)} className={focusRingColor} />
                    <span className={`text-sm font-medium ${isOrange ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>Include Header Row</span>
                 </label>
            </div>

            <div className="flex justify-end pt-2">
                <button onClick={handleExport} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`}>
                    Export
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default ExportModal;
