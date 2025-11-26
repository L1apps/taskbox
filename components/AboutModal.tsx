
import React from 'react';
import Modal from './Modal';
import { Theme } from '../types';

interface AboutModalProps {
  onClose: () => void;
  theme: Theme;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, theme }) => {
  const isOrange = theme === 'orange';
  const version = "2.5.5"; 

  return (
    <Modal title="About TaskBox" onClose={onClose} theme={theme}>
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          TaskBox <span className="text-base font-normal text-gray-500 dark:text-gray-400">v{version}</span>
        </h3>
        <p>TaskBox is a standalone, feature-rich task management application designed to organize your to-do lists efficiently.</p>
        
        <div className="pt-4 border-t dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Importing Tasks</h4>
            <p className="mb-2">You can import tasks from a `.csv` or `.txt` file. The file must contain a header row. The only required column is `description`.</p>
             <p className="mb-2">Supported columns: `description`, `completed`, `Date Created` (or `Created`), `Due Date`, `importance`.</p>
            <p>Example file content:</p>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-xs whitespace-pre-wrap">
{`Description,Completed,Date Created,Due Date,Importance
"Pay monthly bills",false,2025-05-20,2025-09-01,5
"Book flight for vacation",false,2025-05-25,,4
"Renew gym membership",true,2025-01-10,2025-08-25,3`}
            </pre>
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
