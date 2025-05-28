// utils/categoryStyle.ts

// Define a set of hardcoded Tailwind classes you want to use
// Ensure these classes are present in your tailwind.config.js safelist
// so Tailwind always generates them.
const hardcodedCategoryClasses = [
  "bg-blue-600 border-blue-600",
  "bg-green-600 border-green-600",
  "bg-purple-600 border-purple-600",
  "bg-orange-600 border-orange-600",
  "bg-indigo-600 border-indigo-600",
  "bg-teal-600 border-teal-600",
  "bg-pink-600 border-pink-600",
  "bg-lime-600 border-lime-600",
  "bg-amber-600 border-amber-600",
  "bg-red-600 border-red-600",
];

// Function to get a hardcoded style based on the category name
export const getCategoryStyle = (category: string): string => {
  // Always include text-white for visibility
  if (!category) return "bg-gray-500 border-gray-500 text-white"; // Default for empty

  // Use a simple hash to pick a deterministic class from the hardcoded list
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % hardcodedCategoryClasses.length;

  return `${hardcodedCategoryClasses[index]} text-white`;
};