
import type { Task } from '../types';

interface ExportOptions {
    format: 'csv' | 'txt';
    delimiter: string;
    includeHeaders: boolean;
    fields: {
        description: boolean;
        completed: boolean;
        createdAt: boolean;
        dueDate: boolean;
        importance: boolean;
    };
}

export const exportTasks = (tasks: Task[], listName: string, options: ExportOptions) => {
  if (!tasks || tasks.length === 0) {
    alert("No tasks to export.");
    return;
  }

  const { delimiter, includeHeaders, fields, format } = options;
  const rows = [];

  // Build Header Row
  if (includeHeaders) {
      const headerRow = [];
      if (fields.description) headerRow.push('Description');
      if (fields.completed) headerRow.push('Completed');
      if (fields.createdAt) headerRow.push('Date Created');
      if (fields.dueDate) headerRow.push('Due Date');
      if (fields.importance) headerRow.push('Importance');
      rows.push(headerRow.join(delimiter));
  }

  // Helper to format ISO date to YYYY-MM-DD
  const formatDate = (dateString: string | undefined | null) => {
      if (!dateString) return '';
      try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
      } catch (e) {
          return '';
      }
  };

  // Helper to escape values only if necessary
  const escapeValue = (val: string | number | boolean | null | undefined): string => {
    const str = String(val ?? '');
    // If format is CSV, use double quotes for escaping. If delimiter is present or newlines or double quotes.
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Build Data Rows
  tasks.forEach(task => {
    const row = [];
    if (fields.description) row.push(escapeValue(task.description));
    if (fields.completed) row.push(escapeValue(task.completed));
    if (fields.createdAt) row.push(escapeValue(formatDate(task.createdAt)));
    if (fields.dueDate) row.push(escapeValue(task.dueDate));
    if (fields.importance) row.push(escapeValue(task.importance));
    rows.push(row.join(delimiter));
  });

  const fileContent = rows.join('\r\n');
  const blob = new Blob(['\uFEFF' + fileContent], { type: 'text/plain;charset=utf-8;' });
  
  const extension = format === 'csv' ? 'csv' : 'txt';
  const filename = `${listName}-tasks.${extension}`;

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

// Backwards compatibility for original calls if needed, though we updated App.tsx
export const exportTasksToCSV = (tasks: Task[], filename: string) => {
    exportTasks(tasks, filename.replace('.csv', ''), {
        format: 'csv',
        delimiter: ',',
        includeHeaders: true,
        fields: { description: true, completed: true, createdAt: true, dueDate: true, importance: true }
    });
};
