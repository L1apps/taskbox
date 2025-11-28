
import React, { useState } from 'react';
import Modal from './Modal';
import { Theme } from '../types';

interface PasteModalProps {
  onClose: () => void;
  onImport: (content: string) => void;
  theme: Theme;
}

const PasteModal: React.FC<PasteModalProps> = ({ onClose, onImport, theme }) => {
  const [pastedText, setPastedText] = useState('');

  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const inputTextColor = isOrange ? 'text-gray-900' : '';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';

  const handleImport = () => {
      if (!pastedText.trim()) {
          return;
      }
      onImport(pastedText);
      onClose(); // Close after trigger
  };

  return (
    <Modal title="Paste Tasks" onClose={onClose} theme={theme}>
        <div className="space-y-4">
            <div className="py-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste Content</label>
                <textarea 
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    placeholder={`Examples:\nBuy Milk\nCall John\n\nOR CSV Data:\nDescription,Due Date\nPay Rent,2025-05-01`}
                    className={`w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 ${focusRingColor} ${inputTextColor}`}
                    autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">Supported: Simple list (one per line) or CSV format.</p>
            </div>
            
            <div className="flex justify-end pt-2 space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Cancel</button>
                <button onClick={handleImport} disabled={!pastedText.trim()} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor} disabled:opacity-50`}>
                    Import Text
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default PasteModal;
