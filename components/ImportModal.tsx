
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (content: string) => void;
  theme: Theme;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, theme }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setFile(e.target.files[0]);
      }
  };

  const handleImport = () => {
      if (activeTab === 'upload') {
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
      } else {
          if (!pastedText.trim()) {
              alert("Please paste some text.");
              return;
          }
          onImport(pastedText);
      }
  };

  return (
    <Modal title="Import Tasks" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                    className={`py-2 px-4 font-medium text-sm ${activeTab === 'upload' ? (isOrange ? 'text-orange-500 border-b-2 border-orange-500' : 'text-blue-600 border-b-2 border-blue-500') : 'text-gray-500'}`}
                    onClick={() => setActiveTab('upload')}
                >
                    Upload File
                </button>
                <button 
                    className={`py-2 px-4 font-medium text-sm ${activeTab === 'paste' ? (isOrange ? 'text-orange-500 border-b-2 border-orange-500' : 'text-blue-600 border-b-2 border-blue-500') : 'text-gray-500'}`}
                    onClick={() => setActiveTab('paste')}
                >
                    Paste Text
                </button>
            </div>

            {activeTab === 'upload' ? (
                <div className="py-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select .csv or .txt file</label>
                    <input type="file" accept=".csv,.txt" onChange={handleFileChange} className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-700 dark:file:text-gray-300 ${inputTextColor}`} />
                    <p className="mt-2 text-xs text-gray-500">Supports CSV headers: Description, Completed, Date Created, Due Date, Importance.</p>
                </div>
            ) : (
                <div className="py-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste Content</label>
                    <textarea 
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        rows={6}
                        placeholder={`Examples:\nBuy Milk\nCall John\n\nOR\n\nDescription,Due Date\nPay Rent,2025-05-01`}
                        className={`w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 ${focusRingColor} ${inputTextColor}`}
                    />
                    <p className="mt-2 text-xs text-gray-500">You can paste a list of descriptions (one per line) or structured CSV data.</p>
                </div>
            )}
            
            <div className="flex justify-end pt-2">
                <button onClick={handleImport} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`}>
                    Import
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default ImportModal;
