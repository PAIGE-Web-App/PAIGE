"use client";

import React, { useState, useEffect } from 'react';

interface MaxBudgetInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

const MaxBudgetInput: React.FC<MaxBudgetInputProps> = ({
  value,
  onChange,
  placeholder = "Enter maximum budget",
  className = "",
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  // Sync with parent component's value
  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    const numericValue = Number(newValue.replace(/[^0-9]/g, ''));
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  const handleBlur = () => {
    // Ensure we have a valid number on blur
    const numericValue = Number(localValue.replace(/[^0-9]/g, ''));
    if (isNaN(numericValue) || numericValue === 0) {
      setLocalValue(value.toString());
    }
  };

  const formatDisplayValue = (val: string) => {
    const numericValue = Number(val.replace(/[^0-9]/g, ''));
    if (isNaN(numericValue) || numericValue === 0) return '';
    return numericValue.toLocaleString();
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#332B42] text-sm">$</span>
      <input
        type="text"
        value={formatDisplayValue(localValue)}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full pl-8 pr-4 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:border-[#A85C36] bg-white"
        placeholder={placeholder}
      />
    </div>
  );
};

export default MaxBudgetInput; 