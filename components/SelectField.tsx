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
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full border px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] ${
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
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </label>
  );
}
