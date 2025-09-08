import { useState, useCallback } from 'react';
import { Guest } from '../types';

interface ModalState {
  csvUpload: boolean;
  addColumn: boolean;
  mealOptions: boolean;
  relationshipOptions: boolean;
  columnOptions: boolean;
  exitConfirm: boolean;
  familyGrouping: boolean;
}

interface ModalData {
  mealOptions: string[];
  relationshipOptions: string[];
  columnOptions: string[];
  columnId: string;
  selectedGuests: Guest[];
}

export const useModalState = () => {
  const [modalState, setModalState] = useState<ModalState>({
    csvUpload: false,
    addColumn: false,
    mealOptions: false,
    relationshipOptions: false,
    columnOptions: false,
    exitConfirm: false,
    familyGrouping: false
  });

  const [modalData, setModalData] = useState<ModalData>({
    mealOptions: [],
    relationshipOptions: [],
    columnOptions: [],
    columnId: '',
    selectedGuests: []
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

  const openFamilyGroupingModal = useCallback((selectedGuests: Guest[]) => {
    setModalData(prev => ({ ...prev, selectedGuests }));
    openModal('familyGrouping');
  }, [openModal]);

  const closeAllModals = useCallback(() => {
    setModalState({
      csvUpload: false,
      addColumn: false,
      mealOptions: false,
      relationshipOptions: false,
      columnOptions: false,
      exitConfirm: false,
      familyGrouping: false
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
    openFamilyGroupingModal,
    closeAllModals
  };
};
