
import type { Task } from '../types';

export const exportTasksToCSV = (tasks: Task[], filename: string) => {
  if (!tasks || tasks.length === 0) {
    alert("No tasks to export.");
    return;
  }

  const headers = ['ID', 'Description', 'Completed', 'Date Created', 'Due Date', 'Importance'];
  const csvRows = [headers.join(',')];

  // Helper to format ISO date to YYYY-MM-DD for better Excel compatibility
  const formatDate = (dateString: string | undefined | null) => {
      if (!dateString) return '';
      try {
          const date = new Date(dateString);
          // Check if date is valid
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
      } catch (e) {
          return '';
      }
  };

  tasks.forEach(task => {
    const row = [
      task.id,
      `"${task.description.replace(/"/g, '""')}"`, // Escape double quotes
      task.completed,
      formatDate(task.createdAt),
      task.dueDate || '',
      task.importance
    ];
    csvRows.push(row.join(','));
  });

  // Use '\r\n' for universal line endings (CRLF)
  const csvString = csvRows.join('\r\n');
  
  // Prepend a UTF-8 Byte Order Mark (BOM) for better Excel compatibility
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
