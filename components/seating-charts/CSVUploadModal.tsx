"use client";
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Guest, CSVUploadResult } from '../../types/seatingChart';
import { parseCSVFile, generateCSVTemplate, CSVColumnMapping, DEFAULT_CSV_MAPPING, debugExcelFile } from '../../utils/csvUploadUtils';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestsUploaded: (guests: Guest[], customColumns?: any[]) => void;
}

export default function CSVUploadModal({ isOpen, onClose, onGuestsUploaded }: CSVUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>(DEFAULT_CSV_MAPPING);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check for supported file types
    const supportedTypes = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!supportedTypes.includes(fileExtension)) {
      alert('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Debug Excel files
      if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        await debugExcelFile(file);
      }
      
      const result = await parseCSVFile(file, columnMapping);
      setUploadResult(result);
    } catch (error) {
      setUploadResult({
        success: false,
        guests: [],
        errors: ['Failed to process file'],
        warnings: [],
        totalRows: 0,
        processedRows: 0
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_list_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleConfirmUpload = () => {
    if (uploadResult?.guests) {
      onGuestsUploaded(uploadResult.guests, uploadResult.customColumns);
      onClose();
    }
  };

  const handleReset = () => {
    setUploadResult(null);
    setColumnMapping(DEFAULT_CSV_MAPPING);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#AB9C95]">
            <div>
              <h5 className="h5 text-[#332B42]">Upload Guest List</h5>
              <p className="text-sm text-[#AB9C95]">Import your guest list from a CSV or Excel file</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {!uploadResult ? (
              <div className="space-y-6">
                {/* Download Template */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h6 className="h6 text-blue-900 mb-2">Get Started with a Template</h6>
                      <p className="text-sm text-blue-700 mb-2">
                        Download our CSV template with 10 example guests to see the required format and add your guest information.
                      </p>
                       <p className="text-xs text-blue-600 mb-3">
                         <strong>Tip:</strong> Keep the default column names unchanged. Add extra columns as needed - they'll be auto-detected.
                       </p>
                      <button
                        onClick={handleDownloadTemplate}
                        className="btn-primaryinverse text-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-[#A85C36] bg-[#F8F6F4]' : 'border-[#AB9C95]'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-[#AB9C95] mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-[#332B42] mb-2">Upload Your File</h4>
                  <p className="text-sm text-[#AB9C95] mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-[#AB9C95] mb-2">
                    Supports CSV, XLS, and XLSX files
                  </p>
                  <p className="text-xs text-[#A85C36] mb-4 font-medium">
                    Note: "Name" column required. Include other standard columns for best results.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary mx-auto block"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing...' : 'Upload File'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload Results */}
                <div className={`p-4 rounded-lg border ${
                  uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <h6 className={`h6 ${
                        uploadResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                      </h6>
                      <p className={`text-sm ${
                        uploadResult.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {uploadResult.processedRows} of {uploadResult.totalRows} guests processed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {uploadResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h6 className="h6 text-red-900 mb-2">Errors</h6>
                    <ul className="text-sm text-red-700 space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {uploadResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h6 className="h6 text-yellow-900 mb-2">Warnings</h6>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {uploadResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Guest Preview */}
                {uploadResult.guests.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="h6 text-[#332B42] mb-3">
                      Guest Preview ({uploadResult.guests.length} guests)
                      {uploadResult.customColumns && uploadResult.customColumns.length > 0 && (
                        <span className="text-sm text-[#A85C36] ml-2">
                          (+ {uploadResult.customColumns.length} custom columns)
                        </span>
                      )}
                    </h6>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 font-medium text-[#332B42]">Guest Name</th>
                            <th className="text-left py-2 font-medium text-[#332B42]">Relationship</th>
                            <th className="text-left py-2 font-medium text-[#332B42]">Meal Preference</th>
                            <th className="text-left py-2 font-medium text-[#332B42]">Notes</th>
                            {/* Dynamic custom columns */}
                            {uploadResult.customColumns?.map((column) => (
                              <th key={column.id} className="text-left py-2 font-medium text-[#332B42]">
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.guests.slice(0, 10).map((guest) => (
                            <tr key={guest.id} className="border-b border-gray-200 hover:bg-gray-100">
                              <td className="py-2 font-medium text-[#332B42]">{guest.fullName}</td>
                              <td className="py-2 text-[#AB9C95]">{guest.relationship || '-'}</td>
                              <td className="py-2 text-[#AB9C95]">{guest.mealPreference || '-'}</td>
                              <td className="py-2 text-[#AB9C95] max-w-xs truncate" title={guest.notes || ''}>
                                {guest.notes || '-'}
                              </td>
                              {/* Dynamic custom field values */}
                              {uploadResult.customColumns?.map((column) => (
                                <td key={column.id} className="py-2 text-[#AB9C95] max-w-xs truncate" 
                                    title={guest.customFields?.[column.key] || ''}>
                                  {guest.customFields?.[column.key] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {uploadResult.guests.length > 10 && (
                        <div className="text-sm text-[#AB9C95] mt-2 text-center">
                          ... and {uploadResult.guests.length - 10} more guests
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#AB9C95]">
            <button
              onClick={handleReset}
              className="btn-primaryinverse"
            >
              Start Over
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="btn-primaryinverse"
              >
                Cancel
              </button>
              
              {uploadResult?.success && (
                <button
                  onClick={handleConfirmUpload}
                  className="btn-primary"
                >
                  Import {uploadResult.guests.length} Guests
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
