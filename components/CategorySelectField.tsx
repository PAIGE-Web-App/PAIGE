// components/CategorySelectField.tsx
import React, { useState, useEffect, useMemo } from "react";
import SelectField from "./SelectField";
import FormField from "./FormField";
import { getAllCategories } from "../lib/firebaseCategories";

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

// Helper function to identify Firestore document IDs
const isFirestoreDocumentId = (category: string): boolean => {
  // Firestore document IDs are typically 20 characters long and contain only letters, numbers, and hyphens
  return typeof category === 'string' && /^[a-zA-Z0-9_-]{15,}$/.test(category);
};

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
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  // Default categories to be shown if no custom categories are fetched or for new users
  const defaultCategories = useMemo(
    () => [
      "Photographer",
      "Caterer",
      "Florist",
      "DJ",
      "Venue",
      "Wedding Planner",
      "Officiant",
      "Baker",
      "Dress Shop",
      "Suit/Tux Rental",
      "Hair Stylist",
      "Makeup Artist",
      "Musician",
      "Stationery",
      "Transportation",
      "Rentals",
      "Favors",
      "Jeweler",
      "Videographer",
    ],
    []
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getAllCategories(userId);
        // Filter out Firestore document IDs from the fetched categories
        const filteredCategories = fetchedCategories.filter(category => !isFirestoreDocumentId(category));
        setCategoryOptions(filteredCategories);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, [userId]);

  // Memoize the combined and sorted list of categories for the dropdown
  const allCategoriesCombined = useMemo(() => {
    const uniqueCategories = new Set([...defaultCategories, ...categoryOptions]);
    uniqueCategories.delete("Other"); // Ensure 'Other' is not duplicated if it somehow appears in fetched categories

    const sortedCategories = Array.from(uniqueCategories).sort((a, b) =>
      a.localeCompare(b)
    );

    // Ensure that the 'Other' option is always at the end
    // and that all options are objects with value and label for SelectField
    return [
      { value: "", label: placeholder }, // Placeholder option
      ...sortedCategories.map((cat) => ({ value: cat, label: cat })),
      { value: "Other", label: "Other" },
    ];
  }, [categoryOptions, defaultCategories, placeholder]);

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
