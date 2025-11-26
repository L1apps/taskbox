
import type { Task } from '../types';

// A simple CSV/TXT parser that looks for specific headers.
// It tries to be flexible with delimiters (comma, tab).
export const parseTasksFromFile = (fileContent: string): Partial<Task>[] => {
  const lines = fileContent.trim().split(/\r\n|\n|\r/);

  if (lines.length < 2) {
    throw new Error("File must contain a header row and at least one task row.");
  }

  const headerLine = lines.shift()!.toLowerCase();
  
  // Detect delimiter by checking for common characters in the header
  const delimiter = headerLine.includes(',') ? ',' : '\t';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  const descriptionIndex = headers.indexOf('description');
  const completedIndex = headers.indexOf('completed');
  const dueDateIndex = headers.indexOf('due date');
  const importanceIndex = headers.indexOf('importance');
  // Support variations of Created Date header
  const createdAtIndex = headers.findIndex(h => h === 'date created' || h === 'createdat' || h === 'created');

  if (descriptionIndex === -1) {
    throw new Error("File must contain a 'description' column header.");
  }

  return lines.map(line => {
    if (!line.trim()) return null; // Skip empty lines

    const values = line.split(delimiter);
    
    const task: Partial<Task> = {};

    const description = values[descriptionIndex]?.trim().replace(/"/g, '');
    if (!description) return null; // Skip rows without a description
    task.description = description;

    if (completedIndex > -1) {
      const completedValue = values[completedIndex]?.trim().toLowerCase();
      task.completed = ['true', '1', 'yes'].includes(completedValue);
    } else {
      task.completed = false; // Default
    }

    if (importanceIndex > -1) {
      const importanceValue = parseInt(values[importanceIndex]?.trim(), 10);
      task.importance = !isNaN(importanceValue) && importanceValue >= 0 && importanceValue <= 5 ? importanceValue : 1;
    } else {
      task.importance = 1; // Default
    }

    if (dueDateIndex > -1) {
      const dateValue = values[dueDateIndex]?.trim();
      // Basic validation for YYYY-MM-DD format
      if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        task.dueDate = dateValue;
      } else {
        task.dueDate = null;
      }
    } else {
        task.dueDate = null; // Default
    }

    if (createdAtIndex > -1) {
        const createdValue = values[createdAtIndex]?.trim();
        // Allow date parsing if valid, otherwise let backend default to now
        if (createdValue && !isNaN(Date.parse(createdValue))) {
            task.createdAt = new Date(createdValue).toISOString();
        }
    }

    return task;
  }).filter((task): task is Partial<Task> => task !== null);
};
