import React, { useMemo } from 'react';
import { useTaskBox } from '../contexts/TaskBoxContext';
import { useModal } from '../contexts/ModalContext';
import TaskItem from './TaskItem';
import { Task } from '../types';

const SearchResultsView: React.FC = () => {
    const { lists, searchQuery, theme, updateTask, removeTask } = useTaskBox();
    const { openModal } = useModal();
    
    const results = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const allTasks: { task: Task; listTitle: string }[] = [];

        lists.forEach(list => {
            if (list.tasks) {
                list.tasks.forEach(task => {
                    if (task.description.toLowerCase().includes(query)) {
                        allTasks.push({ task, listTitle: list.title });
                    }
                });
            }
        });

        return allTasks;
    }, [lists, searchQuery]);

    const isOrange = theme === 'orange';
    const highlightColor = isOrange ? 'text-orange-400' : 'text-blue-600 dark:text-blue-400';

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full relative overflow-y-auto no-scrollbar">
            <div className="mb-6">
                 <h2 className={`text-2xl sm:text-3xl font-bold ${isOrange ? '' : 'text-gray-900 dark:text-white'}`}>
                    Search Results
                </h2>
                <p className="text-gray-500 mt-2">
                    Found {results.length} tasks matching "<span className="font-semibold">{searchQuery}</span>"
                </p>
            </div>

            <div className="space-y-4">
                {results.length > 0 ? (
                    results.map(({ task, listTitle }) => (
                        <div key={task.id} className="relative">
                            <div className="mb-1">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${highlightColor}`}>
                                    {listTitle}
                                </span>
                            </div>
                            <TaskItem 
                                task={task}
                                allTasksInList={lists.find(l => l.id === task.list_id)?.tasks || []}
                                onUpdate={updateTask}
                                onRemove={removeTask}
                                onCopyRequest={(t) => openModal('COPY_TASK', { task: t })}
                                theme={theme}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        No tasks found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsView;
