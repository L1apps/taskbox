
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
  const [error, setError] = useState<string>('');

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('');
      if (e.target.files && e.target.files.length > 0) {
          const selectedFile = e.target.files[0];
          
          // 1. File Size Check (Max 5MB for text imports)
          if (selectedFile.size > 5 * 1024 * 1024) {
              setError("File is too large (Max 5MB).");
              setFile(null);
              return;
          }
          setFile(selectedFile);
      }
  };

  const checkBinaryContent = (file: File): Promise<boolean> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const content = new Uint8Array(e.target?.result as ArrayBuffer);
              // Check first 1024 bytes for null bytes (0x00), usually indicating binary
              for (let i = 0; i < Math.min(content.length, 1024); i++) {
                  if (content[i] === 0) {
                      resolve(true); // Is Binary
                      return;
                  }
              }
              resolve(false); // Is Text
          };
          reader.readAsArrayBuffer(file.slice(0, 1024));
      });
  };

  const handleImport = async () => {
      if (!file) {
          alert("Please select a file.");
          return;
      }
      
      setError('');

      // 2. Binary Check
      const isBinary = await checkBinaryContent(file);
      if (isBinary) {
          setError("Invalid file format. File appears to be binary, not text/CSV.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
             onImport(content);
          } catch(err) {
              setError("Failed to process file contents.");
          }
      };
      reader.onerror = () => setError("Error reading file.");
      reader.readAsText(file);
  };

  return (
    <Modal title="Import File" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            <div className="py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select .csv or .txt file</label>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-700 dark:file:text-gray-300 ${inputTextColor}`} />
                <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">Supports CSV headers: Description, Completed, Date Created, Due Date, Importance.</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Note: Task descriptions will be truncated to 102 characters.</p>
                </div>
                {error && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}
            </div>
            
            <div className="flex justify-end pt-2 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
                <button onClick={handleImport} disabled={!file || !!error} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor} disabled:opacity-50`}>
                    Upload & Import
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default ImportModal;
