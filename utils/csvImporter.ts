
import type { Task } from '../types';

// Helper to parse loose date formats
const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim().toLowerCase().replace(/"/g, '');
    
    const now = new Date();
    
    if (cleanStr === 'today' || cleanStr === 'now') {
        return now.toISOString().split('T')[0];
    }
    
    if (cleanStr === 'tomorrow') {
        const tmrw = new Date(now);
        tmrw.setDate(now.getDate() + 1);
        return tmrw.toISOString().split('T')[0];
    }
    
    // Check for MM/DD/YYYY
    const slashMatch = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        // Month is 0-indexed in JS Date
        const d = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }

    // Check for standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
    }
    
    // Last resort: Date.parse
    const ts = Date.parse(cleanStr);
    if (!isNaN(ts)) {
        return new Date(ts).toISOString().split('T')[0];
    }

    return null;
};

export const parseTasksFromFile = (fileContent: string): Partial<Task>[] => {
  const lines = fileContent.trim().split(/\r\n|\n|\r/);

  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  
  // HEURISTIC: Check if first line explicitly contains 'description'. 
  // If not, we treat it as a raw list, regardless of commas.
  // This prevents sentences with commas from breaking the importer.
  const isStructured = firstLine.includes('description');
  const hasComma = firstLine.includes(',');

  if (!isStructured) {
      // Treat as simple line-separated list
      return lines.map((line): Partial<Task> | null => {
          if (!line.trim()) return null;
          return {
              description: line.trim(),
              completed: false,
              importance: 0, // Default importance Low (0)
              dueDate: null,
              createdAt: new Date().toISOString()
          };
      }).filter((task): task is Partial<Task> => task !== null);
  }

  // --- CSV / Delimited Parsing Logic ---
  const delimiter = hasComma ? ',' : '\t';
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  const descriptionIndex = headers.indexOf('description');
  
  // This should theoretically not be hit due to isStructured check, but good for safety
  if (descriptionIndex === -1) {
    throw new Error("Structured file must contain a 'description' column header.");
  }
  
  const completedIndex = headers.indexOf('completed');
  const dueDateIndex = headers.indexOf('due date');
  const importanceIndex = headers.indexOf('importance');
  const createdAtIndex = headers.findIndex(h => h === 'date created' || h === 'createdat' || h === 'created');

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    if (!line.trim()) return null;

    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;
    for(let i=0; i<line.length; i++) {
        const char = line[i];
        if(char === '"') {
            inQuotes = !inQuotes;
        } else if(char === delimiter && !inQuotes) {
            values.push(currentVal);
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal); 

    const task: Partial<Task> = {};

    const description = values[descriptionIndex]?.trim().replace(/"/g, '');
    if (!description) return null;
    task.description = description;

    if (completedIndex > -1) {
      const completedValue = values[completedIndex]?.trim().toLowerCase();
      task.completed = ['true', '1', 'yes'].includes(completedValue);
    } else {
      task.completed = false;
    }

    if (importanceIndex > -1) {
      const importanceValue = parseInt(values[importanceIndex]?.trim(), 10);
      task.importance = !isNaN(importanceValue) && importanceValue >= 0 && importanceValue <= 5 ? importanceValue : 0; // Default to 0 if parsed explicitly, otherwise 0
    } else {
      task.importance = 0; // Default Low
    }

    if (dueDateIndex > -1) {
      const dateValue = values[dueDateIndex];
      task.dueDate = parseDate(dateValue);
    } else {
        task.dueDate = null;
    }

    if (createdAtIndex > -1) {
        const createdValue = values[createdAtIndex]?.trim().replace(/"/g, '');
        if (createdValue && !isNaN(Date.parse(createdValue))) {
            task.createdAt = new Date(createdValue).toISOString();
        } else {
            task.createdAt = new Date().toISOString(); 
        }
    } else {
        task.createdAt = new Date().toISOString(); 
    }

    return task;
  }).filter((task): task is Partial<Task> => task !== null);
};
