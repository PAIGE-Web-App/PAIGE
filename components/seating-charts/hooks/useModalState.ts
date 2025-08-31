import { useState, useCallback } from 'react';

interface ModalState {
  csvUpload: boolean;
  addColumn: boolean;
  mealOptions: boolean;
  relationshipOptions: boolean;
  columnOptions: boolean;
  exitConfirm: boolean;
}

interface ModalData {
  mealOptions: string[];
  relationshipOptions: string[];
  columnOptions: string[];
  columnId: string;
}

export const useModalState = () => {
  const [modalState, setModalState] = useState<ModalState>({
    csvUpload: false,
    addColumn: false,
    mealOptions: false,
    relationshipOptions: false,
    columnOptions: false,
    exitConfirm: false
  });

  const [modalData, setModalData] = useState<ModalData>({
    mealOptions: [],
    relationshipOptions: [],
    columnOptions: [],
    columnId: ''
  });

  const openModal = useCallback((modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: keyof ModalState) => {
    setModalState(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const openMealOptionsModal = useCallback((options: string[]) => {
    setModalData(prev => ({ ...prev, mealOptions: options }));
    openModal('mealOptions');
  }, [openModal]);

  const openRelationshipOptionsModal = useCallback((options: string[]) => {
    setModalData(prev => ({ ...prev, relationshipOptions: options }));
    openModal('relationshipOptions');
  }, [openModal]);

  const openColumnOptionsModal = useCallback((options: string[], columnId: string) => {
    setModalData(prev => ({ ...prev, columnOptions: options, columnId }));
    openModal('columnOptions');
  }, [openModal]);

  const closeAllModals = useCallback(() => {
    setModalState({
      csvUpload: false,
      addColumn: false,
      mealOptions: false,
      relationshipOptions: false,
      columnOptions: false,
      exitConfirm: false
    });
  }, []);

  return {
    modalState,
    modalData,
    openModal,
    closeModal,
    openMealOptionsModal,
    openRelationshipOptionsModal,
    openColumnOptionsModal,
    closeAllModals
  };
};
