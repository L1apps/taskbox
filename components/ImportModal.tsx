
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (content: string) => void;
  theme: Theme;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, theme }) => {
  const [file, setFile] = useState<File | null>(null);

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setFile(e.target.files[0]);
      }
  };

  const handleImport = () => {
      if (!file) {
          alert("Please select a file.");
          return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          onImport(content);
      };
      reader.readAsText(file);
  };

  return (
    <Modal title="Import File" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            <div className="py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select .csv or .txt file</label>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-700 dark:file:text-gray-300 ${inputTextColor}`} />
                <p className="mt-2 text-xs text-gray-500">Supports CSV headers: Description, Completed, Date Created, Due Date, Importance.</p>
            </div>
            
            <div className="flex justify-end pt-2 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
                <button onClick={handleImport} disabled={!file} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor} disabled:opacity-50`}>
                    Upload & Import
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default ImportModal;
