import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, align = 'center' }) => {
  let positionClass = 'left-1/2 -translate-x-1/2'; // Default Center

  if (align === 'left') {
      positionClass = 'left-0 translate-x-0';
  } else if (align === 'right') {
      positionClass = 'right-0 translate-x-0';
  }

  return (
    <div className="relative flex items-center group">
      {children}
      <div className={`absolute top-full mt-2 w-max px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-nowrap ${positionClass}`}>
        {text}
        {/* Simple CSS arrow */}
        <div className={`absolute bottom-full h-0 w-0 border-x-4 border-x-transparent border-b-4 border-b-gray-800 ${align === 'left' ? 'left-2' : (align === 'right' ? 'right-2' : 'left-1/2 -translate-x-1/2')}`}></div>
      </div>
    </div>
  );
};

export default Tooltip;
