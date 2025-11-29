import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ModalData, ModalType } from '../types';

interface ModalContextType {
    activeModal: ModalData | null;
    openModal: (type: ModalType, props?: any) => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeModal, setActiveModal] = useState<ModalData | null>(null);

    const openModal = (type: ModalType, props?: any) => {
        setActiveModal({ type, props });
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    return (
        <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
};
