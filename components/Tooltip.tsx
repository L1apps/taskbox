
import React from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  position?: 'top' | 'bottom';
  debugLabel?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, align = 'center', position = 'bottom', debugLabel }) => {
  const { debugMode } = useTaskBox();
  
  let alignClass = 'left-1/2 -translate-x-1/2'; // Default Center
  let arrowAlignClass = 'left-1/2 -translate-x-1/2';

  if (align === 'left') {
      alignClass = 'left-0 translate-x-0';
      arrowAlignClass = 'left-2';
  } else if (align === 'right') {
      alignClass = 'right-0 translate-x-0';
      arrowAlignClass = 'right-2';
  }

  // Vertical positioning logic
  const isTop = position === 'top';
  const verticalClass = isTop ? 'bottom-full mb-2' : 'top-full mt-2';
  
  // Format text to show ID if in debug mode
  const displayText = debugMode 
      ? `${text} [${debugLabel || 'UNKNOWN_ID'}]` 
      : text;
      
  const bgColor = debugMode ? 'bg-fuchsia-700 font-mono font-bold border border-white' : 'bg-gray-800';
  
  const debugArrowClass = isTop
    ? `top-full border-t-4 ${debugMode ? 'border-t-fuchsia-700' : 'border-t-gray-800'} border-x-4 border-x-transparent border-b-0`
    : `bottom-full border-b-4 ${debugMode ? 'border-b-fuchsia-700' : 'border-b-gray-800'} border-x-4 border-x-transparent border-t-0`;

  return (
    <div className="relative flex items-center group">
      {children}
      <div className={`absolute ${verticalClass} w-max max-w-xs px-3 py-1.5 ${bgColor} text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-normal text-center ${alignClass}`}>
        {displayText}
        <div className={`absolute h-0 w-0 ${debugArrowClass} ${arrowAlignClass}`}></div>
      </div>
    </div>
  );
};

export default Tooltip;
