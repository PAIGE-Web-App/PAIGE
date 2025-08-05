import React, { useState } from 'react';
import { FileText, Image, File, FileImage, FileVideo, FileAudio, FileArchive } from 'lucide-react';

interface FilePreviewProps {
  fileType: string;
  fileUrl: string;
  fileName: string;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ fileType, fileUrl, fileName, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileType.toLowerCase());
  const isPdf = fileType.toLowerCase() === 'pdf';
  const isVideo = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileType.toLowerCase());
  const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileType.toLowerCase());
  const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(fileType.toLowerCase());

  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-8 h-8 text-red-600" />;
    if (isVideo) return <FileVideo className="w-8 h-8 text-purple-600" />;
    if (isAudio) return <FileAudio className="w-8 h-8 text-green-600" />;
    if (isArchive) return <FileArchive className="w-8 h-8 text-orange-600" />;
    if (isImage) return <FileImage className="w-8 h-8 text-blue-600" />;
    return <FileText className="w-8 h-8 text-gray-600" />;
  };

  const getFileTypeColor = () => {
    if (isPdf) return 'bg-red-50 border-red-200';
    if (isVideo) return 'bg-purple-50 border-purple-200';
    if (isAudio) return 'bg-green-50 border-green-200';
    if (isArchive) return 'bg-orange-50 border-orange-200';
    if (isImage) return 'bg-blue-50 border-blue-200';
    return 'bg-gray-50 border-gray-200';
  };

  // For images, show actual preview
  if (isImage && !imageError) {
    return (
      <div className={`relative w-full h-32 bg-gray-100 rounded-[5px] overflow-hidden ${className}`}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A85C36]"></div>
          </div>
        )}
        <img
          src={fileUrl}
          alt={fileName}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
      </div>
    );
  }

  // For PDFs, show PDF icon with preview overlay
  if (isPdf) {
    return (
      <div className={`relative w-full h-32 bg-red-50 border border-red-200 rounded-[5px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <FileText className="w-12 h-12 text-red-600 mx-auto mb-2" />
          <div className="text-xs text-red-700 font-medium">PDF</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-100 opacity-30"></div>
      </div>
    );
  }

  // For videos, show video icon with play button
  if (isVideo) {
    return (
      <div className={`relative w-full h-32 bg-purple-50 border border-purple-200 rounded-[5px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <FileVideo className="w-12 h-12 text-purple-600 mx-auto mb-2" />
          <div className="text-xs text-purple-700 font-medium">Video</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-100 opacity-30"></div>
      </div>
    );
  }

  // For audio files
  if (isAudio) {
    return (
      <div className={`relative w-full h-32 bg-green-50 border border-green-200 rounded-[5px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <FileAudio className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <div className="text-xs text-green-700 font-medium">Audio</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-100 opacity-30"></div>
      </div>
    );
  }

  // For archives
  if (isArchive) {
    return (
      <div className={`relative w-full h-32 bg-orange-50 border border-orange-200 rounded-[5px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <FileArchive className="w-12 h-12 text-orange-600 mx-auto mb-2" />
          <div className="text-xs text-orange-700 font-medium">Archive</div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-100 opacity-30"></div>
      </div>
    );
  }

  // Default for other file types
  return (
    <div className={`relative w-full h-32 bg-gray-50 border border-gray-200 rounded-[5px] flex items-center justify-center ${className}`}>
      <div className="text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <div className="text-xs text-gray-700 font-medium uppercase">{fileType}</div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-100 opacity-30"></div>
    </div>
  );
};

export default FilePreview; 