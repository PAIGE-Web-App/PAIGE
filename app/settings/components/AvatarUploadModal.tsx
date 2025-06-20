"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { toast } from "react-hot-toast";
import imageCompression from 'browser-image-compression';
import { getCroppedImg } from '../utils/profileValidation';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export default function AvatarUploadModal({ isOpen, onClose, onUpload }: AvatarUploadModalProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast.error('Image must be less than 1MB.');
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      setAvatarFile(compressedFile);
      setAvatarPreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      toast.error("Failed to compress image.");
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !croppedAreaPixels) return;

    setAvatarUploading(true);
    try {
      const croppedImage = await getCroppedImg(avatarPreview!, croppedAreaPixels);
      croppedImage.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], avatarFile.name, { type: avatarFile.type });
          await onUpload(croppedFile);
          onClose();
          setAvatarFile(null);
          setAvatarPreview(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
        }
      }, avatarFile.type);
    } catch (error) {
      toast.error("Failed to process image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleClose = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
            <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4">Update Profile Image</h3>
            <div
              className={`w-full border border-[#AB9C95] px-3 py-6 rounded-[5px] text-sm flex flex-col items-center justify-center transition-colors duration-150 ${
                dragActive ? 'bg-[#F3F2F0] border-[#A85C36]' : 'bg-white'
              } mb-4`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
              onDrop={async e => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) {
                  if (!file.type.startsWith('image/')) {
                    toast.error('Please upload a valid image file.');
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    return;
                  }
                  if (file.size > 1 * 1024 * 1024) {
                    toast.error('Image must be less than 1MB.');
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    return;
                  }
                  try {
                    const compressedFile = await imageCompression(file, {
                      maxSizeMB: 1,
                      maxWidthOrHeight: 512,
                      useWebWorker: true,
                    });
                    setAvatarFile(compressedFile);
                    setAvatarPreview(URL.createObjectURL(compressedFile));
                  } catch (err) {
                    toast.error("Failed to compress image.");
                  }
                }
              }}
            >
              <div className="w-full flex flex-col items-center">
                {!avatarFile && <div className="text-xs text-[#AB9C95] mb-2 text-center">No file chosen</div>}
                {avatarFile && <div className="text-sm text-[#332B42] mb-2 text-center">Selected file: {avatarFile.name}</div>}
                <label className="btn-primaryinverse block mx-auto mt-0 mb-2 text-center cursor-pointer" htmlFor="profile-image-upload">
                  Choose File
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center w-full">
                Drag & drop an image here, or click to select. Accepted formats: JPG, PNG, GIF, SVG, WebP. Max size: 1MB.
              </div>
              {avatarPreview && (
                <div className="w-full flex flex-col items-center mt-2">
                  <div className="relative w-48 h-48 bg-[#F3F2F0] rounded-lg border border-[#AB9C95] overflow-hidden">
                    <Cropper
                      image={avatarPreview}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-4 w-full justify-center">
                    <label className="text-xs text-[#332B42]">Zoom</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 w-full mt-2">
              <button onClick={handleClose} className="btn-primaryinverse">Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleAvatarUpload} 
                disabled={avatarUploading || !avatarFile}
              >
                {avatarUploading ? "Uploading..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 