
import React, { useMemo } from 'react';
import Modal from './Modal';
import type { TaskList, Theme } from '../types';

interface StatsModalProps {
  onClose: () => void;
  lists: TaskList[];
  theme: Theme;
}

const StatCard: React.FC<{ label: string; value: string | number; className?: string; theme: Theme }> = ({ label, value, className = '', theme }) => {
    // Explicitly force text color for Orange theme to ensure visibility against dark bg
    const labelColor = theme === 'orange' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
    const valueColor = theme === 'orange' ? 'text-gray-100' : 'text-gray-800 dark:text-white';
    
    return (
      <div className={`p-4 rounded-lg ${className}`}>
        <div className={`text-sm ${labelColor}`}>{label}</div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      </div>
    );
};

const ProgressBar: React.FC<{ percentage: number; theme: Theme }> = ({ percentage, theme }) => {
    const isOrange = theme === 'orange';
    const progressColor = isOrange ? 'bg-orange-500' : 'bg-blue-500';
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


const StatsModal: React.FC<StatsModalProps> = ({ onClose, lists, theme }) => {
  const isOrange = theme === 'orange';
  const cardBg = isOrange ? 'bg-gray-800' : 'bg-gray-100 dark:bg-gray-700';
  
  // Header text colors
  const headerTextColor = isOrange ? 'text-gray-100' : 'text-gray-800 dark:text-gray-100';

  const stats = useMemo(() => {
    const allTasks = lists.flatMap(list => list.tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;

    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const overdueTasks = allTasks.filter(t => {
      if (!t.completed && t.dueDate) {
        const taskDueDate = new Date(t.dueDate);
        const taskDueDateOnly = new Date(taskDueDate.getUTCFullYear(), taskDueDate.getUTCMonth(), taskDueDate.getUTCDate());
        return taskDueDateOnly < todayDateOnly;
      }
      return false;
    }).length;

    const perListStats = lists
      .filter(list => list.tasks && list.tasks.length > 0) // Filter out empty lists or containers
      .map(list => {
      const listTasks = list.tasks || [];
      const listTotal = listTasks.length;
      const listCompleted = listTasks.filter(t => t.completed).length;
      const listOverdue = listTasks.filter(t => {
        if (!t.completed && t.dueDate) {
            const taskDueDate = new Date(t.dueDate);
            const taskDueDateOnly = new Date(taskDueDate.getUTCFullYear(), taskDueDate.getUTCMonth(), taskDueDate.getUTCDate());
            return taskDueDateOnly < todayDateOnly;
        }
        return false;
      }).length;
      const completionPercentage = listTotal > 0 ? Math.round((listCompleted / listTotal) * 100) : 0;
      return {
        id: list.id,
        title: list.title,
        total: listTotal,
        overdue: listOverdue,
        completionPercentage,
      };
    });

    return {
      totalLists: lists.length,
      totalTasks,
      completedTasks,
      incompleteTasks: totalTasks - completedTasks,
      overdueTasks,
      overallCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      perListStats,
    };
  }, [lists]);

  return (
    <Modal title="Task Statistics" onClose={onClose} theme={theme}>
      <div className="space-y-6 text-sm">
        <div>
          <h3 className={`text-lg font-semibold mb-3 ${headerTextColor}`}>Overall Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Total Lists" value={stats.totalLists} className={cardBg} theme={theme} />
            <StatCard label="Total Tasks" value={stats.totalTasks} className={cardBg} theme={theme} />
            <StatCard label="Completed Tasks" value={stats.completedTasks} className={cardBg} theme={theme} />
            <StatCard label="Incomplete Tasks" value={stats.incompleteTasks} className={cardBg} theme={theme} />
            <StatCard label="Overdue Tasks" value={stats.overdueTasks} className={`${cardBg} ${stats.overdueTasks > 0 ? (isOrange ? 'text-orange-400' : 'text-red-500') : ''}`} theme={theme} />
            <div className={`p-4 rounded-lg col-span-2 sm:col-span-1 ${cardBg}`}>
                <div className={`text-sm ${isOrange ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>Completion Rate</div>
                <div className={`text-2xl font-bold mb-2 ${isOrange ? 'text-gray-100' : 'text-gray-800 dark:text-white'}`}>{stats.overallCompletion}%</div>
                <ProgressBar percentage={stats.overallCompletion} theme={theme} />
            </div>
          </div>
        </div>
        
        {stats.perListStats.length > 0 ? (
          <div className="pt-4 border-t dark:border-gray-700">
            <h3 className={`text-lg font-semibold mb-3 ${headerTextColor}`}>Per-List Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">List Title</th>
                    <th scope="col" className="px-4 py-3 text-center">Total Tasks</th>
                    <th scope="col" className="px-4 py-3 text-center">Overdue</th>
                    <th scope="col" className="px-4 py-3">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perListStats.map(listStat => (
                    <tr key={listStat.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${isOrange ? 'text-gray-100' : 'text-gray-900 dark:text-white'}`}>{listStat.title}</td>
                      <td className={`px-4 py-3 text-center ${isOrange ? 'text-gray-300' : ''}`}>{listStat.total}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${listStat.overdue > 0 ? (isOrange ? 'text-orange-400' : 'text-red-500') : (isOrange ? 'text-gray-300' : '')}`}>{listStat.overdue}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                           <div className="w-full">
                             <ProgressBar percentage={listStat.completionPercentage} theme={theme} />
                           </div>
                           <span className="w-10 text-right text-gray-500 dark:text-gray-400">{listStat.completionPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`text-xs mt-2 italic ${isOrange ? 'text-gray-500' : 'text-gray-400'}`}>* Only lists containing tasks are included in the breakdown.</p>
          </div>
        ) : (
            <div className="pt-4 border-t dark:border-gray-700 text-center text-gray-500">
                <p>No active tasks found in any list.</p>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
