import React from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

interface DragDropZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
  isLoading?: boolean;
  uploadingImage?: boolean;
}

export default function DragDropZone({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  isLoading = false,
  uploadingImage = false
}: DragDropZoneProps) {
  if (isLoading) {
    return (
      <div className="border-2 border-dashed border-[#AB9C95] rounded-[5px] p-4 text-center bg-white">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mx-auto mb-2 w-48"></div>
          <div className="h-3 bg-gray-200 rounded mx-auto mb-4 w-64"></div>
          <div className="h-3 bg-gray-200 rounded mx-auto w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`rounded-[5px] p-4 text-center transition-all duration-200 ${
        isDragOver 
          ? 'border-2 border-dashed border-[#A85C36] bg-[#F3F2F0] scale-[1.02]' 
          : 'bg-white hover:bg-gray-50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      animate={{
        scale: isDragOver ? 1.02 : 1,
        backgroundColor: isDragOver ? '#F3F2F0' : '#FFFFFF'
      }}
      transition={{ duration: 0.2 }}
    >
      {isDragOver && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Upload className="w-8 h-8 text-[#A85C36] mx-auto mb-2" />
          <p className="text-[#A85C36] font-medium">Drop your images here!</p>
          <p className="text-sm text-[#A85C36] opacity-80">JPG, PNG, GIF, WebP files only</p>
        </motion.div>
      )}
      
      {uploadingImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="w-8 h-8 border-2 border-[#A85C36] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-[#A85C36] font-medium">Uploading images...</p>
          <p className="text-sm text-[#A85C36] opacity-80">Please wait while we process your files</p>
        </motion.div>
      )}
      
      {children}
    </motion.div>
  );
}
