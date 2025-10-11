/**
 * Email Form Field with Real-time Validation
 * Extends FormField with email validation and fake domain detection
 */

import React, { useState, useEffect } from 'react';
import { validateEmail, getValidationMessage } from '@/utils/emailValidation';

type EmailFormFieldProps = {
  label: React.ReactNode;
  name: string;
  value: string | undefined;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean, warning?: string) => void;
};

export default function EmailFormField({
  label,
  name,
  value = "",
  placeholder,
  onChange,
  error,
  showValidation = true,
  onValidationChange
}: EmailFormFieldProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    if (!value.trim()) {
      setValidationMessage(null);
      setIsValid(true);
      onValidationChange?.(true);
      return;
    }

    const message = getValidationMessage(value);
    const validation = validateEmail(value);
    
    setValidationMessage(message);
    setIsValid(validation.isValid);
    onValidationChange?.(validation.isValid, message || undefined);
  }, [value, onValidationChange]);

  const getInputStyles = () => {
    const baseStyles = "w-full border px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2";
    
    if (!value.trim()) {
      return `${baseStyles} border-[#AB9C95] focus:ring-[#A85C36]`;
    }
    
    if (!isValid) {
      return `${baseStyles} border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50`;
    }
    
    if (validationMessage) {
      return `${baseStyles} border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50`;
    }
    
    return `${baseStyles} border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50`;
  };

  const getIcon = () => {
    if (!value.trim()) return null;
    
    if (!isValid) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (validationMessage) {
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-[#332B42]">{label}</span>
      <div className="relative">
        <input
          type="email"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={getInputStyles()}
        />
        {getIcon() && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {getIcon()}
          </div>
        )}
      </div>
      
      {/* Show validation message if enabled and there's a message */}
      {showValidation && validationMessage && (
        <div className={`text-xs flex items-start gap-1 ${
          !isValid ? 'text-red-600' : 'text-yellow-600'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            {!isValid ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>{validationMessage}</span>
        </div>
      )}
      
      {/* Show form error if provided */}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </label>
  );
}
