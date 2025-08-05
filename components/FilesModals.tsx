import React, { useState } from 'react';
import { FileFolder } from '@/types/files';
import { Trash2, Upload, X, Folder, Plus } from 'lucide-react';
import UpgradePlanModal from './UpgradePlanModal';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useFiles } from '@/hooks/useFiles';
import LoadingBar from './LoadingBar';

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
  onUploadComplete: (fileId: string) => void;
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
  onUploadComplete,
}) => {
  return (
    <>
      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={onCloseUploadModal} 
          showSuccessToast={showSuccessToast}
          showErrorToast={showErrorToast}
          currentFolder={selectedFolder}
          onUploadComplete={onUploadComplete}
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

// Upload Modal Component
const UploadModal = ({ 
  onClose, 
  showSuccessToast, 
  showErrorToast, 
  currentFolder,
  onUploadComplete 
}: { 
  onClose: () => void; 
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  currentFolder: FileFolder | null;
  onUploadComplete: (fileId: string) => void;
}) => {
  // Get storage stats for validation
  const storageStats = useStorageUsage();
  const { uploadFile } = useFiles();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      // Initialize descriptions for new files
      const newDescriptions = { ...fileDescriptions };
      files.forEach(file => {
        if (!newDescriptions[file.name]) {
          newDescriptions[file.name] = '';
        }
      });
      setFileDescriptions(newDescriptions);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      // Initialize descriptions for new files
      const newDescriptions = { ...fileDescriptions };
      files.forEach(file => {
        if (!newDescriptions[file.name]) {
          newDescriptions[file.name] = '';
        }
      });
      setFileDescriptions(newDescriptions);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    // Validate storage limits before uploading
    const totalNewFileSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const fileSizeMB = totalNewFileSize / (1024 * 1024);
    
    // Check file size limit
    if (fileSizeMB > storageStats.limits.maxFileSizeMB) {
      showErrorToast(`File too large. Max size: ${storageStats.limits.maxFileSizeMB}MB`);
      return;
    }
    
    // Check storage limit
    if (storageStats.usedStorage + totalNewFileSize > storageStats.totalStorage) {
      showErrorToast('Storage limit reached. Please upgrade your plan.');
      return;
    }
    
    // Check file count limit
    if (storageStats.usedFiles + selectedFiles.length > storageStats.maxFiles) {
      showErrorToast('File limit reached. Please upgrade your plan.');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setCurrentFileIndex(0);
    
    try {
      // Upload each file with progress
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const description = fileDescriptions[file.name] || '';
        
        setCurrentFileIndex(i + 1);
        setUploadProgress((i / selectedFiles.length) * 100);
        
        const fileId = await uploadFile({
          file,
          fileName: file.name,
          description,
          category: currentFolder?.id || 'all', // Use current folder ID or default to "all"
        });
        
        // Call completion callback with the uploaded file ID
        if (fileId) {
          onUploadComplete(fileId);
        }
      }
      
      setUploadProgress(100);
      showSuccessToast(`${selectedFiles.length} file(s) uploaded successfully!`);
      
      // Close modal after a short delay to show completion
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      showErrorToast('Failed to upload file(s)');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
    }
  };

  return (
    <>
      <LoadingBar 
        isVisible={uploading} 
        description={`Uploading file ${currentFileIndex} of ${selectedFiles.length}...`}
      />
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#E0DBD7]">
          <h5 className="h5">Upload Files</h5>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F8F6F4] rounded-[3px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-[5px] p-8 text-center transition-colors ${
              dragActive ? 'border-[#A85C36] bg-[#F8F6F4]' : 'border-[#E0DBD7]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-[#AB9C95] mx-auto mb-4" />
            <p className="text-lg font-medium text-[#332B42] mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-[#AB9C95] mb-4">
              Support for PDF, DOC, DOCX, JPG, PNG, and more
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="btn-primary cursor-pointer inline-block"
            >
              Choose Files
            </label>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h6 className="h6 mb-3">Selected Files ({selectedFiles.length})</h6>
              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#332B42]">{file.name}</p>
                      <p className="text-xs text-[#AB9C95]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={fileDescriptions[file.name] || ''}
                      onChange={(e) => setFileDescriptions(prev => ({
                        ...prev,
                        [file.name]: e.target.value
                      }))}
                      className="flex-1 text-sm border border-[#E0DBD7] rounded-[3px] px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storage Info */}
          <div className="mt-6 p-4 bg-[#F8F6F4] rounded-[5px]">
            <p className="text-sm text-[#AB9C95]">
              Storage: {Math.round(storageStats.progressPercentage)}% used 
              ({(storageStats.usedStorage / 1024 / 1024).toFixed(1)}MB / {(storageStats.totalStorage / 1024 / 1024 / 1024).toFixed(1)}GB)
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-6 border-t border-[#E0DBD7]">
          <button
            onClick={onClose}
            className="btn-primaryinverse px-4 py-2 text-sm"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="btn-primary px-4 py-2 text-sm"
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

// New Subfolder Modal Component
const NewSubfolderModal = ({ 
  onClose, 
  onAddSubfolder, 
  parentFolder 
}: { 
  onClose: () => void; 
  onAddSubfolder: (name: string, description?: string, color?: string) => Promise<void>;
  parentFolder: FileFolder | null;
}) => {
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#a34d54');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddSubfolder(folderName.trim(), folderDescription.trim(), selectedColor);
      onClose();
    } catch (error) {
      console.error('Error creating subfolder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = [
    '#a34d54', '#894a6b', '#654d74', '#424d6b', '#2f4858',
    '#966b1f', '#7a7917', '#52862b', '#008f4f', '#00957d',
    '#4c8076', '#55433b', '#c4515c', '#a84baa'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-[#E0DBD7]">
          <h5 className="h5">Create New Subfolder</h5>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F8F6F4] rounded-[3px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Subfolder Name *
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36]"
                placeholder="Enter subfolder name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Description (optional)
              </label>
              <textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36] resize-none"
                rows={3}
                placeholder="Describe what this subfolder is for"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Folder Color
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-5 h-5 aspect-square transition-colors ${
                      selectedColor === color ? 'border border-[#332B42]' : 'border border-[#E0DBD7]'
                    }`}
                    style={{ backgroundColor: color, borderRadius: '50%' }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm"
              disabled={!folderName.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Subfolder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// New Folder Modal Component
const NewFolderModal = ({ onClose, onAddFolder }: { 
  onClose: () => void; 
  onAddFolder: (name: string, description?: string, color?: string) => Promise<void> 
}) => {
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#a34d54');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddFolder(folderName.trim(), folderDescription.trim(), selectedColor);
      onClose();
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = [
    '#a34d54', '#894a6b', '#654d74', '#424d6b', '#2f4858',
    '#966b1f', '#7a7917', '#52862b', '#008f4f', '#00957d',
    '#4c8076', '#55433b', '#c4515c', '#a84baa'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-[#E0DBD7]">
          <h5 className="h5">Create New Folder</h5>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F8F6F4] rounded-[3px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36]"
                placeholder="Enter folder name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Description (optional)
              </label>
              <textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36] resize-none"
                rows={3}
                placeholder="Describe what this folder is for"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Folder Color
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-5 h-5 aspect-square transition-colors ${
                      selectedColor === color ? 'border border-[#332B42]' : 'border border-[#E0DBD7]'
                    }`}
                    style={{ backgroundColor: color, borderRadius: '50%' }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm"
              disabled={!folderName.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Folder Confirmation Modal Component
const DeleteFolderConfirmationModal = ({ 
  folder, 
  onConfirm, 
  onClose 
}: { 
  folder: FileFolder; 
  onConfirm: () => void; 
  onClose: () => void; 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h5 className="h5 mb-2">Delete Folder</h5>
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete "{folder.name}"?
          </p>
          <p className="text-xs text-gray-500">
            This will also delete all files and subfolders within it. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-primaryinverse px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary px-4 py-2 text-sm bg-red-600 hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilesModals; 