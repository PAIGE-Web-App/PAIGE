import React, { memo } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { Folder } from 'lucide-react';
import FileGrid from './FileGrid';
import SubfolderGrid from './SubfolderGrid';
import BadgeCount from './BadgeCount';

interface CombinedContentViewProps {
  files: FileItem[];
  subfolders: FileFolder[];
  viewMode: 'list' | 'grid';
  selectedFile: FileItem | null;
  folders: FileFolder[];
  folderFileCounts: Map<string, number>;
  isLoading?: boolean;
  onSelectFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onSelectSubfolder: (subfolder: FileFolder) => void;
  onMoveFile?: (fileId: string, newFolderId: string) => Promise<void>;
  onEditSubfolder?: (subfolder: FileFolder) => void;
  onDeleteSubfolder?: (subfolder: FileFolder) => void;
}

const CombinedContentView: React.FC<CombinedContentViewProps> = memo(({
  files,
  subfolders,
  viewMode,
  selectedFile,
  folders,
  folderFileCounts,
  isLoading = false,
  onSelectFile,
  onDeleteFile,
  onEditFile,
  onSelectSubfolder,
  onMoveFile,
  onEditSubfolder,
  onDeleteSubfolder
}) => {
  const hasFiles = files.length > 0;
  const hasSubfolders = subfolders.length > 0;

  return (
    <div className="space-y-6">
      {/* Folders Section - Always on top */}
      {hasSubfolders && (
        <div>
          <h3 className="text-sm font-medium text-[#332B42] mb-3 px-1 flex items-center gap-2">
            Folders
            <BadgeCount count={subfolders.length} />
          </h3>
                           <SubfolderGrid 
                   subfolders={subfolders}
                   onSelectSubfolder={onSelectSubfolder}
                   folderFileCounts={folderFileCounts}
                   folders={folders}
                   onMoveFile={onMoveFile}
                   onEditSubfolder={onEditSubfolder}
                   onDeleteSubfolder={onDeleteSubfolder}
                 />
        </div>
      )}

      {/* Files Section - Below folders */}
      {hasFiles && (
        <div>
          <h3 className="text-sm font-medium text-[#332B42] mb-3 px-1 flex items-center gap-2">
            Files
            <BadgeCount count={files.length} />
          </h3>
          <FileGrid
            files={files}
            viewMode={viewMode}
            selectedFile={selectedFile}
            folders={folders}
            isLoading={isLoading}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            onEditFile={onEditFile}
          />
        </div>
      )}
    </div>
  );
});

CombinedContentView.displayName = 'CombinedContentView';

export default CombinedContentView; 