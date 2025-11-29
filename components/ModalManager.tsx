
import React from 'react';
import { useModal } from '../contexts/ModalContext';
import { useTaskBox } from '../contexts/TaskBoxContext';
import AddListModal from './AddListModal';
import AboutModal from './AboutModal';
import StatsModal from './StatsModal';
import ShareListModal from './ShareListModal';
import AdminModal from './AdminModal';
import UserSettingsModal from './UserSettingsModal';
import ImportModal from './ImportModal';
import PasteModal from './PasteModal';
import ExportModal from './ExportModal';
import MoveListModal from './MoveListModal';
import MergeListModal from './MergeListModal';
import RenameListModal from './RenameListModal';
import CopyTaskModal from './CopyTaskModal';

const ModalManager: React.FC = () => {
    const { activeModal, closeModal } = useModal();
    const { 
        theme, 
        lists, 
        user, 
        apiFetch, 
        fetchData, 
        addList, 
        moveList, 
        mergeList, 
        renameList, 
        processImport, 
        activeList,
        copyTaskToList,
        setUser
    } = useTaskBox();

    if (!activeModal) return null;

    const { type, props } = activeModal;

    switch (type) {
        case 'ADD_LIST':
            return <AddListModal onClose={closeModal} onAddList={(title) => { addList(title, props?.parentId); closeModal(); }} theme={theme} />;
        case 'MOVE_LIST':
            return <MoveListModal onClose={closeModal} lists={lists} list={props.list} onMove={async (id, parent) => { await moveList(id, parent); closeModal(); }} theme={theme} />;
        case 'MERGE_LIST':
            return <MergeListModal onClose={closeModal} lists={lists} sourceList={props.list} onMerge={async (src, tgt) => { await mergeList(src, tgt); closeModal(); }} theme={theme} />;
        case 'RENAME_LIST':
            return <RenameListModal onClose={closeModal} list={props.list} onRename={async (id, title) => { await renameList(id, title); closeModal(); }} theme={theme} />;
        case 'ABOUT':
            return <AboutModal onClose={closeModal} theme={theme} />;
        case 'STATS':
            return <StatsModal onClose={closeModal} lists={lists} theme={theme} />;
        case 'ADMIN':
            return user?.role === 'ADMIN' ? <AdminModal onClose={closeModal} theme={theme} apiFetch={apiFetch} onUpdate={fetchData} /> : null;
        case 'USER_SETTINGS':
            return user ? <UserSettingsModal onClose={closeModal} user={user} theme={theme} apiFetch={apiFetch} onUserUpdated={(u) => { setUser(u); closeModal(); }} /> : null;
        case 'SHARE_LIST':
            return <ShareListModal list={props.list} onClose={closeModal} theme={theme} apiFetch={apiFetch} onListUpdated={fetchData} />;
        case 'IMPORT':
            return <ImportModal onClose={closeModal} onImport={async (content) => { await processImport(content); closeModal(); }} theme={theme} />;
        case 'PASTE':
            return <PasteModal onClose={closeModal} onImport={async (content) => { await processImport(content); closeModal(); }} tasks={activeList?.tasks} theme={theme} />;
        case 'EXPORT':
            return <ExportModal onClose={closeModal} tasks={activeList?.tasks || []} listName={activeList?.title || 'Export'} theme={theme} />;
        case 'COPY_TASK':
            return <CopyTaskModal onClose={closeModal} task={props.task} lists={lists} onCopyToList={(targetId, move) => copyTaskToList(props.task.id, targetId, move)} theme={theme} />;
        default:
            return null;
    }
};

export default ModalManager;
