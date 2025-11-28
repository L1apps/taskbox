
import React from 'react';
import Modal from './Modal';
import { Theme } from '../types';
import { APP_VERSION } from '../version';

interface AboutModalProps {
  onClose: () => void;
  theme: Theme;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, theme }) => {
  const isOrange = theme === 'orange';

  return (
    <Modal title="About TaskBox" onClose={onClose} theme={theme}>
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          TaskBox <span className="text-base font-normal text-gray-500 dark:text-gray-400">v{APP_VERSION}</span>
        </h3>
        <p>TaskBox is a standalone, feature-rich task management application designed to organize your to-do lists efficiently.</p>
        
        <div className="pt-4 border-t dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Importing Tasks</h4>
            <p className="mb-2">You can import tasks by uploading a file or pasting text.</p>
             <ul className="list-disc pl-5 mb-2">
                 <li><b>Simple List:</b> Just paste descriptions (one per line).</li>
                 <li><b>Structured Data:</b> Use CSV format with headers. Supported columns: `Description`, `Completed`, `Date Created`, `Due Date`, `Importance`.</li>
             </ul>
        </div>
        
        <div className="pt-4 border-t dark:border-gray-700">
          <p>Developed by <a href="https://l1apps.com/taskbox/" target="_blank" rel="noopener noreferrer" className={`${isOrange ? 'text-orange-400' : 'text-blue-500 dark:text-blue-400'} hover:underline font-semibold`}>Level 1 Apps</a>.</p>
          <p>For support or inquiries, please visit our website.</p>
          <p className="mt-2 text-xs text-gray-400">All Rights Reserved Level 1 Apps © 2025</p>
        </div>
      </div>
    </Modal>
  );
};

export default AboutModal;
