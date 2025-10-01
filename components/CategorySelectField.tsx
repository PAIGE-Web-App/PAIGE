// components/CategorySelectField.tsx
import React, { useMemo } from "react";
import SelectField from "./SelectField";
import FormField from "./FormField";
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';

interface CategorySelectFieldProps {
  userId: string;
  value: string;
  customCategoryValue: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCustomCategoryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  customCategoryError?: string;
  label: string;
  placeholder: string;
  className?: string;
}


const CategorySelectField: React.FC<CategorySelectFieldProps> = ({
  userId,
  value,
  customCategoryValue,
  onChange,
  onCustomCategoryChange,
  error,
  customCategoryError,
  label,
  placeholder,
  className,
}) => {
  // Use ONLY centralized categories - exactly like vendors catalog
  const allCategoriesCombined = useMemo(() => {
    // Use only the centralized VENDOR_CATEGORIES - no mixing with any other sources
    const centralizedCategories = VENDOR_CATEGORIES.map(cat => cat.singular);
    
    return [
      { value: "", label: placeholder }, // Placeholder option
      ...centralizedCategories.map((cat) => ({ value: cat, label: cat })),
      { value: "Other", label: "Other" },
    ];
  }, [placeholder]);

  return (
    <div className={className}>
      <SelectField
        label={label}
        name="category"
        value={value}
        onChange={onChange}
        // Pass the array of objects directly
        options={allCategoriesCombined}
        error={error}
      />

      {value === "Other" && (
        <FormField
          label="Custom Category"
          name="customCategory"
          value={customCategoryValue}
          onChange={onCustomCategoryChange}
          placeholder="Enter custom category"
          error={customCategoryError}
        />
      )}
    </div>
  );
};

export default CategorySelectField;
