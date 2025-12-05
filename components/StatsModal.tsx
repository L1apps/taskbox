
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import type { TaskList, Theme } from '../types';
import Tooltip from './Tooltip';

interface StatsModalProps {
  onClose: () => void;
  lists: TaskList[];
  theme: Theme;
}

type SortField = 'title' | 'total' | 'overdue' | 'completionPercentage';

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
  const headerTextColor = isOrange ? 'text-gray-100' : 'text-gray-800 dark:text-gray-100';
  const statsLabelColor = isOrange ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400';
  const statsValueColor = isOrange ? 'text-gray-100' : 'text-gray-800 dark:text-white';

  const [sortField, setSortField] = useState<SortField>('completionPercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('desc');
      }
  };

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

    let perListStats = lists
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

    // Sorting Logic
    perListStats.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // String comparison for title
        if (sortField === 'title') {
            valA = (valA as string).toLowerCase();
            valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
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
  }, [lists, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) return <span className="ml-1 opacity-25">↕</span>;
      return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleExportStats = () => {
      const rows = [];
      // Overall Section
      rows.push(['Overall Statistics']);
      rows.push(['Total Lists', stats.totalLists]);
      rows.push(['Total Tasks', stats.totalTasks]);
      rows.push(['Completed Tasks', stats.completedTasks]);
      rows.push(['Incomplete Tasks', stats.incompleteTasks]);
      rows.push(['Overdue Tasks', stats.overdueTasks]);
      rows.push(['Overall Completion', `${stats.overallCompletion}%`]);
      rows.push([]); // Empty line

      // Per List Section
      rows.push(['Per-List Breakdown']);
      rows.push(['List Title', 'Total Tasks', 'Overdue', 'Completion %']);
      stats.perListStats.forEach(l => {
          rows.push([`"${l.title}"`, l.total, l.overdue, `${l.completionPercentage}%`]);
      });

      const csvContent = rows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'taskbox_statistics.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const StatRow = ({ label, value }: { label: string, value: string | number }) => (
      <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span className={`font-bold ${statsLabelColor}`}>{label}</span>
          <span className={`font-mono font-bold ${statsValueColor}`}>{value}</span>
      </div>
  );

  return (
    <Modal title="Task Statistics" onClose={onClose} theme={theme} maxWidth="max-w-3xl">
        <div className="space-y-6 text-sm max-h-[80vh] overflow-y-auto pr-2">
            <div className="relative">
            <div className="flex justify-between items-center mb-3">
                <h3 className={`text-lg font-semibold ${headerTextColor}`}>Overall Statistics</h3>
                <Tooltip text="Download Statistics (CSV)" align="right">
                    <button onClick={handleExportStats} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isOrange ? 'text-green-500' : 'text-green-600'}`}>
                        {/* Excel-like / Table icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
            
            <div className={`p-4 rounded-lg ${isOrange ? 'bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} shadow-sm`}>
                <StatRow label="Total Lists" value={stats.totalLists} />
                <StatRow label="Total Tasks" value={stats.totalTasks} />
                <StatRow label="Completed Tasks" value={stats.completedTasks} />
                <StatRow label="Incomplete Tasks" value={stats.incompleteTasks} />
                <StatRow label="Overdue Tasks" value={stats.overdueTasks} />
                <div className="flex justify-between items-center py-2">
                    <span className={`font-bold ${statsLabelColor}`}>Completion Rate</span>
                    <span className={`font-mono font-bold ${statsValueColor}`}>{stats.overallCompletion}%</span>
                </div>
                <ProgressBar percentage={stats.overallCompletion} theme={theme} />
            </div>
            </div>
            
            {stats.perListStats.length > 0 ? (
            <div className="pt-4 border-t dark:border-gray-700">
                <h3 className={`text-lg font-semibold mb-3 ${headerTextColor}`}>Per-List Breakdown</h3>
                <div className="">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 cursor-pointer select-none">
                    <tr>
                        <th scope="col" className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('title')}>
                            List Title <SortIcon field="title" />
                        </th>
                        <th scope="col" className="px-4 py-3 text-center hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('total')}>
                            Total Tasks <SortIcon field="total" />
                        </th>
                        <th scope="col" className="px-4 py-3 text-center hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('overdue')}>
                            Overdue <SortIcon field="overdue" />
                        </th>
                        <th scope="col" className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => handleSort('completionPercentage')}>
                            Completion <SortIcon field="completionPercentage" />
                        </th>
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
                <p className={`text-xs mt-2 italic font-bold ${isOrange ? 'text-gray-400' : 'text-gray-500'}`}>* Only lists containing tasks are included in the breakdown.</p>
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
