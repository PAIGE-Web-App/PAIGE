/**
 * Shared utility functions for file operations
 */

/**
 * Format file size in bytes to human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB", "256 KB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon class based on file type
 * @param fileType - File type/extension
 * @returns Icon component props for file type
 */
export const getFileTypeIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  
  if (type.includes('pdf')) {
    return { className: 'w-6 h-6 text-red-600' };
  }
  if (type.includes('doc') || type.includes('docx')) {
    return { className: 'w-6 h-6 text-blue-600' };
  }
  if (type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif')) {
    return { className: 'w-6 h-6 text-green-600' };
  }
  return { className: 'w-6 h-6 text-gray-600' };
};

/**
 * Get folder name for display, handling special cases
 * @param folderId - Folder ID
 * @param folders - Array of available folders
 * @returns Display name for the folder
 */
export const getFolderDisplayName = (folderId: string, folders?: any[]): string => {
  if (folderId === 'all') return 'All Files';
  const folder = folders?.find(f => f.id === folderId);
  return folder ? folder.name : 'Unknown Folder';
};
