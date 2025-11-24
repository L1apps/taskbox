import React, { useState, useMemo } from 'react';
import type { Task, TaskList, Theme } from '../types';
import { SortOption } from '../types';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';

interface TaskListViewProps {
  list: TaskList;
  theme: Theme;
  onUpdateTask: (task: Task) => void;
  onAddTask: (description: string) => void;
  onRemoveTask: (taskId: number) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ list, theme, onUpdateTask, onAddTask, onRemoveTask }) => {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortOption>(SortOption.DEFAULT);
  const [showCompleted, setShowCompleted] = useState(true);

  const tasks = list.tasks || [];

  const sortedAndFilteredTasks = useMemo(() => {
    let filteredTasks = tasks
      .filter(task => task.description.toLowerCase().includes(filter.toLowerCase()))
      .filter(task => showCompleted || !task.completed);

    switch (sort) {
      case SortOption.DESCRIPTION_ASC:
        filteredTasks.sort((a, b) => a.description.localeCompare(b.description));
        break;
      case SortOption.DESCRIPTION_DESC:
        filteredTasks.sort((a, b) => b.description.localeCompare(a.description));
        break;
      case SortOption.DUE_DATE_ASC:
        filteredTasks.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
        break;
      case SortOption.DUE_DATE_DESC:
        filteredTasks.sort((a, b) => (b.dueDate || 'a').localeCompare(a.dueDate || 'a'));
        break;
      case SortOption.COMPLETED:
        filteredTasks.sort((a, b) => Number(a.completed) - Number(b.completed));
          break;
      case SortOption.IMPORTANCE:
        filteredTasks.sort((a, b) => b.importance - a.importance);
        break;
      default:
        // Keep original order which is likely insertion order (by id)
        filteredTasks.sort((a,b) => a.id - b.id);
        break;
    }
    return filteredTasks;
  }, [tasks, filter, sort, showCompleted]);

  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedCount = tasks.filter(t => t.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
  }, [tasks]);
  
  const isOrange = theme === 'orange';
  const progressColor = isOrange ? 'bg-orange-500' : 'bg-blue-500';
  const focusRingColor = isOrange ? 'focus:ring-orange-500' : 'focus:ring-blue-500';
  const checkboxColor = isOrange ? 'text-orange-600' : 'text-blue-600';

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h2 className={`text-2xl sm:text-3xl font-bold ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>{list.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.description}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search tasks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`flex-grow w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${focusRingColor} ${isOrange ? 'text-gray-900' : ''}`}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={`px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 ${focusRingColor} ${isOrange ? 'text-gray-900' : ''}`}
        >
          <option value={SortOption.DEFAULT}>Sort by (Default)</option>
          <option value={SortOption.IMPORTANCE}>Importance</option>
          <option value={SortOption.DESCRIPTION_ASC}>Description (A-Z)</option>
          <option value={SortOption.DESCRIPTION_DESC}>Description (Z-A)</option>
          <option value={SortOption.DUE_DATE_ASC}>Due Date (Oldest)</option>
          <option value={SortOption.DUE_DATE_DESC}>Due Date (Newest)</option>
          <option value={SortOption.COMPLETED}>Completed</option>
        </select>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)}
            className={`h-4 w-4 rounded border-gray-300 ${checkboxColor} ${focusRingColor}`}
          />
          <span>Show Completed</span>
        </label>
      </div>

      <div className="space-y-3">
        {sortedAndFilteredTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            allTasksInList={tasks} 
            onUpdate={onUpdateTask} 
            onRemove={onRemoveTask} 
            theme={theme} 
          />
        ))}
      </div>
      
      {sortedAndFilteredTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">No tasks match your criteria.</div>
      )}

      <div className="mt-6">
        <AddTaskForm onAddTask={onAddTask} theme={theme} />
      </div>

      <div className="mt-8">
        <div className="flex justify-between mb-1">
          <span className={`text-base font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>Completion</span>
          <span className={`text-sm font-medium ${isOrange ? '' : 'text-gray-700 dark:text-white'}`}>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${completionPercentage}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default TaskListView;