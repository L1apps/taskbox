
import React from 'react';
import { Theme } from '../types';

interface WarningModalProps {
  onClose: () => void;
  message: string;
  theme: Theme;
}

const WarningModal: React.FC<WarningModalProps> = ({ onClose, message, theme }) => {
  const isOrange = theme === 'orange';
  const buttonColor = isOrange ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className={`relative z-60 w-full max-w-sm m-4 rounded-lg shadow-2xl ${theme === 'orange' ? 'bg-gray-900 border border-orange-500' : 'bg-white dark:bg-gray-800'}`}>
            <div className="p-6 text-center space-y-4">
                <div className="flex justify-center text-yellow-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className={`text-xl font-bold ${isOrange ? 'text-orange-500' : 'text-gray-900 dark:text-white'}`}>Notice</h3>
                <p className={`font-medium ${isOrange ? 'text-gray-200' : 'text-gray-700 dark:text-gray-300'}`}>
                    {message}
                </p>
                <div className="flex justify-center pt-2">
                    <button onClick={onClose} className={`px-6 py-2 text-sm font-medium text-white rounded-md shadow-sm ${buttonColor}`}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WarningModal;
