"use client";

import React, { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface BudgetSliderProps {
  value: number[];
  onChange: (value: number[]) => void;
  step?: number;
  min?: number;
  max?: number;
}

const BudgetSlider: React.FC<BudgetSliderProps> = ({
  value,
  onChange,
  step = 1000,
  min = 0,
  max = 150000,
}) => {
  const [localBudget, setLocalBudget] = useState(value);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  // Sync with parent component's value
  useEffect(() => {
    setLocalBudget(value);
  }, [value]);
  
  // Auto-correct invalid state
  useEffect(() => {
    if (localBudget[1] - localBudget[0] < step) {
      if (activeThumb === 'min') {
        onChange([localBudget[0], localBudget[0] + step]);
      } else {
        onChange([localBudget[1] - step, localBudget[1]]);
      }
    }
  }, [localBudget, step, activeThumb, onChange]);

  const handleSliderChange = (newValue: number | number[]) => {
    const newRange = newValue as number[];
    const [newMin, newMax] = newRange;
    
    if (newMin !== localBudget[0]) {
      setActiveThumb('min');
    } else if (newMax !== localBudget[1]) {
      setActiveThumb('max');
    }
    
    onChange(newRange);
  };
  
  const formatBudget = (num: number) => {
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num}`;
  };

  return (
    <div>
      <div className="text-left mb-2">
        <h6>
          {formatBudget(localBudget[0])} - {formatBudget(localBudget[1])}
        </h6>
      </div>
      <Slider
        range
        min={min}
        max={max}
        step={step}
        value={localBudget}
        onChange={handleSliderChange}
        className="w-full"
        styles={{
          track: { backgroundColor: '#332B42', height: 2 },
          rail: { backgroundColor: '#D7D0CC', height: 2 },
          handle: {
            borderColor: '#332B42',
            backgroundColor: '#F3F2F0',
            height: 16,
            width: 16,
            marginTop: -7,
            opacity: 1,
            boxShadow: '0 0 0 1px #332B42',
          },
        }}
      />
      <div className="flex justify-between w-full text-xs text-[#332B42] mt-1">
        <span>{formatBudget(min)}</span>
        <span>{formatBudget(max)}+</span>
      </div>
    </div>
  );
};

export default BudgetSlider; 