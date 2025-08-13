import React, { useState, useMemo } from 'react';
import { FileText, Image, Video, Music, Archive, File } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface FilePreviewProps {
  fileType: string;
  fileUrl: string;
  fileName: string;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ fileType, fileUrl, fileName, className = '' }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Enhanced file type detection
  const fileTypeInfo = useMemo(() => {
    const type = fileType.toLowerCase();
    
    // Image types
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'].includes(type);
    
    // Video types
    const isVideo = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm'].includes(type);
    
    // Audio types
    const isAudio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg'].includes(type);
    
    // Archive types
    const isArchive = ['zip', 'rar', '7z', 'tar', 'gz', 'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'].includes(type);
    
    // PDF
    const isPdf = type === 'pdf' || type === 'application/pdf';

    return { isImage, isVideo, isAudio, isArchive, isPdf };
  }, [fileType]);

  // For images, show actual preview
  if (fileTypeInfo.isImage && !imageError) {
    return (
      <div className={`relative w-full h-32 bg-gray-100 rounded-[5px] overflow-hidden ${className}`}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <LoadingSpinner size="sm" />
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
          loading="lazy"
        />
      </div>
    );
  }

  // For videos, show video preview
  if (fileTypeInfo.isVideo) {
    return (
      <div className={`relative w-full h-32 bg-gray-100 rounded-[5px] overflow-hidden flex items-center justify-center ${className}`}>
        <video
          src={fileUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
          <Video className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  // For audio files
  if (fileTypeInfo.isAudio) {
    return (
      <div className={`w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-[5px] flex items-center justify-center ${className}`}>
        <Music className="w-8 h-8 text-purple-600" />
      </div>
    );
  }

  // For archives
  if (fileTypeInfo.isArchive) {
    return (
      <div className={`w-full h-32 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-[5px] flex items-center justify-center ${className}`}>
        <Archive className="w-8 h-8 text-orange-600" />
      </div>
    );
  }

  // For PDFs
  if (fileTypeInfo.isPdf) {
    return (
      <div className={`w-full h-32 bg-gradient-to-br from-red-100 to-pink-100 rounded-[5px] flex items-center justify-center ${className}`}>
        <FileText className="w-8 h-8 text-red-600" />
      </div>
    );
  }

  // Default file icon
  return (
    <div className={`w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[5px] flex items-center justify-center ${className}`}>
      <File className="w-8 h-8 text-gray-600" />
    </div>
  );
};

export default FilePreview; 