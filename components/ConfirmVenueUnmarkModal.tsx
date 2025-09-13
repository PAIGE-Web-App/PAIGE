"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmVenueUnmarkModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vendorName: string;
  onGoToSettings?: () => void;
}

export default function ConfirmVenueUnmarkModal({ 
  open, 
  onClose, 
  onConfirm, 
  vendorName,
  onGoToSettings 
}: ConfirmVenueUnmarkModalProps) {
  if (!open) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative flex flex-col items-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>
          
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          
          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4 text-center">
            Unmark Selected Venue?
          </h3>
          
          <p className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
            <strong>{vendorName}</strong> is your selected venue in your wedding settings. 
            Unmarking it as an official vendor will affect the personalized content that Paige generates for you.
          </p>
          
          <div className="w-full space-y-3">
            <button
              onClick={onConfirm}
              className="w-full btn-primary py-2 text-sm"
            >
              Unmark as Official Vendor
            </button>
            
            {onGoToSettings && (
              <button
                onClick={onGoToSettings}
                className="w-full btn-primaryinverse py-2 text-sm"
              >
                Go to Wedding Settings
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full text-sm text-[#7A7A7A] hover:text-[#332B42] py-2"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
