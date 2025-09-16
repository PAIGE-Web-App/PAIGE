import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Upload, X } from 'lucide-react';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface ImageUploadProgressProps {
  uploadProgress: UploadProgress[];
  onCancel: () => void;
  isVisible: boolean;
}

const ImageUploadProgress: React.FC<ImageUploadProgressProps> = memo(({ 
  uploadProgress, 
  onCancel, 
  isVisible 
}) => {
  if (!isVisible || uploadProgress.length === 0) return null;

  const completedCount = uploadProgress.filter(p => p.status === 'completed').length;
  const errorCount = uploadProgress.filter(p => p.status === 'error').length;
  const totalCount = uploadProgress.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">
            Uploading Images ({completedCount}/{totalCount})
          </h4>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {uploadProgress.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {item.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {item.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                {item.status === 'uploading' && (
                  <Upload className="w-4 h-4 text-blue-500 animate-pulse" />
                )}
                {item.status === 'pending' && (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 truncate">
                  {item.fileName}
                </p>
                
                {item.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <motion.div
                      className="bg-blue-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}

                {item.status === 'error' && item.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {item.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {errorCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-red-500">
              {errorCount} image{errorCount > 1 ? 's' : ''} failed to upload
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

ImageUploadProgress.displayName = 'ImageUploadProgress';

export default ImageUploadProgress;
