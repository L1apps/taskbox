import React from 'react';
import { Theme } from '../types';

interface FooterProps {
  theme: Theme;
}

const Footer: React.FC<FooterProps> = ({ theme }) => {
  const isOrange = theme === 'orange';
  return (
    <footer className={`${isOrange ? 'bg-black' : 'bg-white dark:bg-gray-800'} mt-auto py-4 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-700`}>
      <div className="max-w-7xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Developed by <a href="https://l1apps.com/taskbox/" target="_blank" rel="noopener noreferrer" className={`${isOrange ? 'text-orange-400' : 'text-blue-500 dark:text-blue-400'} hover:underline`}>Level 1 Apps</a>. For support or inquiries, please visit our website.</p>
        <p>All Rights Reserved Level 1 Apps © 2025</p>
      </div>
    </footer>
  );
};

export default Footer;