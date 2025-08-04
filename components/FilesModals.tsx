import React from 'react';
import { FileFolder } from '@/types/files';
import { Trash2 } from 'lucide-react';
import UpgradePlanModal from './UpgradePlanModal';

interface FilesModalsProps {
  showUploadModal: boolean;
  showSubfolderModal: boolean;
  showNewFolderInput: boolean;
  showDeleteConfirmation: boolean;
  showDeleteFolderModal: boolean;
  showUpgradeModal: boolean;
  folderToDelete: FileFolder | null;
  selectedFolder: FileFolder | null;
  STARTER_TIER_MAX_SUBFOLDER_LEVELS: number;
  onCloseUploadModal: () => void;
  onCloseSubfolderModal: () => void;
  onCloseNewFolderModal: () => void;
  onCloseDeleteConfirmation: () => void;
  onCloseDeleteFolderModal: () => void;
  onCloseUpgradeModal: () => void;
  onAddFolder: (name: string, description?: string, color?: string) => Promise<void>;
  onAddSubfolder: (name: string, description?: string, color?: string) => Promise<void>;
  onConfirmDeleteFile: () => Promise<void>;
  onConfirmDeleteFolder: (folderId: string) => Promise<void>;
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
}

const FilesModals: React.FC<FilesModalsProps> = ({
  showUploadModal,
  showSubfolderModal,
  showNewFolderInput,
  showDeleteConfirmation,
  showDeleteFolderModal,
  showUpgradeModal,
  folderToDelete,
  selectedFolder,
  STARTER_TIER_MAX_SUBFOLDER_LEVELS,
  onCloseUploadModal,
  onCloseSubfolderModal,
  onCloseNewFolderModal,
  onCloseDeleteConfirmation,
  onCloseDeleteFolderModal,
  onCloseUpgradeModal,
  onAddFolder,
  onAddSubfolder,
  onConfirmDeleteFile,
  onConfirmDeleteFolder,
  showSuccessToast,
  showErrorToast,
}) => {
  return (
    <>
      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={onCloseUploadModal} 
          showSuccessToast={showSuccessToast}
          showErrorToast={showErrorToast}
        />
      )}

      {/* New Subfolder Modal */}
      {showSubfolderModal && (
        <NewSubfolderModal 
          onClose={onCloseSubfolderModal}
          onAddSubfolder={onAddSubfolder}
          parentFolder={selectedFolder}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolderInput && (
        <NewFolderModal 
          onClose={onCloseNewFolderModal}
          onAddFolder={onAddFolder}
        />
      )}

      {/* Delete File Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h5 className="h5 mb-2">Delete File</h5>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this file? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCloseDeleteConfirmation}
                className="btn-primaryinverse px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDeleteFile}
                className="btn-primary px-4 py-2 text-sm bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && folderToDelete && (
        <DeleteFolderConfirmationModal
          folder={folderToDelete}
          onConfirm={() => onConfirmDeleteFolder(folderToDelete.id)}
          onClose={onCloseDeleteFolderModal}
        />
      )}

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <UpgradePlanModal
          maxLists={STARTER_TIER_MAX_SUBFOLDER_LEVELS}
          reason="lists"
          onClose={onCloseUpgradeModal}
        />
      )}
    </>
  );
};

// Import the modal components that are defined inline in the original files page
// These would need to be extracted to separate files for a complete refactor
const UploadModal = ({ onClose, showSuccessToast, showErrorToast }: any) => {
  // Placeholder - this would be the extracted UploadModal component
  return null;
};

const NewSubfolderModal = ({ onClose, onAddSubfolder, parentFolder }: any) => {
  // Placeholder - this would be the extracted NewSubfolderModal component
  return null;
};

const NewFolderModal = ({ onClose, onAddFolder }: any) => {
  // Placeholder - this would be the extracted NewFolderModal component
  return null;
};

const DeleteFolderConfirmationModal = ({ folder, onConfirm, onClose }: any) => {
  // Placeholder - this would be the extracted DeleteFolderConfirmationModal component
  return null;
};

export default FilesModals; 