import React from "react";

// Define a type for the options, allowing either a string or an object with value/label
type SelectOption = string | { value: string; label: string; };

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[]; // This MUST be SelectOption[]
  error?: string;
}

export default function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
}: SelectFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-[#332B42]">{label}</span>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full border pr-10 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] ${
            error ? "border-red-500" : "border-[#AB9C95]"
          }`}
        >
          {options.map((opt) => {
            // Determine key, value, and label based on whether opt is a string or an object
            const optionValue = typeof opt === 'string' ? opt : opt.value;
            const optionLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        {/* Custom chevron icon */}
        <svg
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#332B42]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </label>
  );
}
