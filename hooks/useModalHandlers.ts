import { useCallback } from 'react';

interface UseModalHandlersProps {
  setShowUploadModal: (show: boolean) => void;
  setShowSubfolderModal: (show: boolean) => void;
  setShowNewFolderInput: (show: boolean) => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  setShowDeleteFolderModal: (show: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setShowSubfolderLimitBanner: (show: boolean) => void;
}

export const useModalHandlers = ({
  setShowUploadModal,
  setShowSubfolderModal,
  setShowNewFolderInput,
  setShowDeleteConfirmation,
  setShowDeleteFolderModal,
  setShowUpgradeModal,
  setShowSubfolderLimitBanner
}: UseModalHandlersProps) => {
  const handleCloseUploadModal = useCallback(() => {
    setShowUploadModal(false);
  }, [setShowUploadModal]);

  const handleCloseSubfolderModal = useCallback(() => {
    setShowSubfolderModal(false);
  }, [setShowSubfolderModal]);

  const handleCloseNewFolderModal = useCallback(() => {
    setShowNewFolderInput(false);
  }, [setShowNewFolderInput]);

  const handleCloseDeleteConfirmation = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, [setShowDeleteConfirmation]);

  const handleCloseDeleteFolderModal = useCallback(() => {
    setShowDeleteFolderModal(false);
  }, [setShowDeleteFolderModal]);

  const handleCloseUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
  }, [setShowUpgradeModal]);

  const handleShowUpgradeModal = useCallback(() => {
    setShowUpgradeModal(true);
  }, [setShowUpgradeModal]);

  const handleDismissSubfolderLimitBanner = useCallback(() => {
    setShowSubfolderLimitBanner(false);
  }, [setShowSubfolderLimitBanner]);

  return {
    handleCloseUploadModal,
    handleCloseSubfolderModal,
    handleCloseNewFolderModal,
    handleCloseDeleteConfirmation,
    handleCloseDeleteFolderModal,
    handleCloseUpgradeModal,
    handleShowUpgradeModal,
    handleDismissSubfolderLimitBanner
  };
}; 