// utils/categoryStyle.ts

// Updated color palette
const hardcodedCategoryHexColors = [
  "#a34d54", "#894a6b", "#654d74", "#424d6b", "#2f4858",
  "#966b1f", "#7a7917", "#52862b", "#008f4f", "#00957d",
  "#4c8076", "#55433b", "#c4515c", "#a84baa", "#5269cb"
];

// Function to get a hardcoded style based on the category name
export const getCategoryStyle = (category: string): string => {
  if (!category) return "bg-gray-500 border-gray-500 text-white"; // Default for empty

  // Use a simple hash to pick a deterministic color from the palette
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % hardcodedCategoryHexColors.length;
  const color = hardcodedCategoryHexColors[index];

  // Use inline style for background and border color
  return `text-white`;
};

// Helper to get the hex color for a category (for inline style)
export const getCategoryHexColor = (category: string): string => {
  if (!category) return "#6b7280"; // Tailwind gray-500
  
  // For recommended pills, use specific teal color
  const isRecommendedPill = category.toLowerCase().includes('recommended');
  
  if (isRecommendedPill) {
    return "#A85C36"; // Accent brown color for recommended pills
  }
  
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % hardcodedCategoryHexColors.length;
  return hardcodedCategoryHexColors[index];
};