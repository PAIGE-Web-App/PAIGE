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
  onDoubleClickFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onAnalyzeFile: (file: FileItem) => void;
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
  onDoubleClickFile,
  onDeleteFile,
  onEditFile,
  onAnalyzeFile,
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
          
          {/* Table Header for List View */}
          {viewMode === 'list' && (
            <div className="bg-[#F8F6F4] border border-[#E0DBD7] rounded-t-[5px] p-2 mb-0">
              <div className="grid grid-cols-12 gap-0.5 text-sm font-medium text-[#AB9C95]">
                <div className="col-span-3 truncate">File Name</div>
                <div className="col-span-1 truncate">Preview</div>
                <div className="col-span-2 truncate">Size</div>
                <div className="col-span-2 truncate">Folder</div>
                <div className="col-span-2 truncate">Date</div>
                <div className="col-span-1 text-center truncate">By</div>
                <div className="col-span-1 text-center truncate">Actions</div>
              </div>
            </div>
          )}
          
          <div className={viewMode === 'list' ? 'border border-[#E0DBD7] border-t-0 rounded-b-[5px]' : ''}>
            <FileGrid
              files={files}
              viewMode={viewMode}
              selectedFile={selectedFile}
              folders={folders}
              isLoading={isLoading}
              onSelectFile={onSelectFile}
              onDoubleClickFile={onDoubleClickFile}
              onDeleteFile={onDeleteFile}
              onEditFile={onEditFile}
              onAnalyzeFile={onAnalyzeFile}
            />
          </div>
        </div>
      )}
    </div>
  );
});

CombinedContentView.displayName = 'CombinedContentView';

export default CombinedContentView; 