import React, { useMemo } from 'react';
import Modal from './Modal';
import type { TaskList, Theme } from '../types';

interface StatsModalProps {
  onClose: () => void;
  lists: TaskList[];
  theme: Theme;
}

const StatCard: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`p-4 rounded-lg ${className}`}>
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
  </div>
);

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

  const stats = useMemo(() => {
    const allTasks = lists.flatMap(list => list.tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;

    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const overdueTasks = allTasks.filter(t => {
      if (!t.completed && t.dueDate) {
        const taskDueDate = new Date(t.dueDate);
        // Date from input is UTC midnight, so get parts in UTC
        const taskDueDateOnly = new Date(taskDueDate.getUTCFullYear(), taskDueDate.getUTCMonth(), taskDueDate.getUTCDate());
        return taskDueDateOnly < todayDateOnly;
      }
      return false;
    }).length;

    const perListStats = lists.map(list => {
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
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Overall Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Total Lists" value={stats.totalLists} className={cardBg} />
            <StatCard label="Total Tasks" value={stats.totalTasks} className={cardBg} />
            <StatCard label="Completed Tasks" value={stats.completedTasks} className={cardBg} />
            <StatCard label="Incomplete Tasks" value={stats.incompleteTasks} className={cardBg} />
            <StatCard label="Overdue Tasks" value={stats.overdueTasks} className={`${cardBg} ${stats.overdueTasks > 0 ? (isOrange ? 'text-orange-400' : 'text-red-500') : ''}`} />
            <div className={`p-4 rounded-lg col-span-2 sm:col-span-1 ${cardBg}`}>
                <div className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{stats.overallCompletion}%</div>
                <ProgressBar percentage={stats.overallCompletion} theme={theme} />
            </div>
          </div>
        </div>
        
        {stats.perListStats.length > 0 && (
          <div className="pt-4 border-t dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Per-List Breakdown</h3>
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
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{listStat.title}</td>
                      <td className="px-4 py-3 text-center">{listStat.total}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${listStat.overdue > 0 ? (isOrange ? 'text-orange-400' : 'text-red-500') : ''}`}>{listStat.overdue}</td>
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
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StatsModal;
