/** @type {import('tailwindcss').Config} */
// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}", // Keep this as it's correctly scanning your utils
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["'Playfair Display'", "serif"],
        work: ['"Work Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Revert to a hardcoded safelist for now, to ensure these classes are generated
  safelist: [
    // Include all classes from hardcodedCategoryClasses array
    "bg-blue-600", "border-blue-600",
    "bg-green-600", "border-green-600",
    "bg-purple-600", "border-purple-600",
    "bg-orange-600", "border-orange-600",
    "bg-indigo-600", "border-indigo-600",
    "bg-teal-600", "border-teal-600",
    "bg-pink-600", "border-pink-600",
    "bg-lime-600", "border-lime-600",
    "bg-amber-600", "border-amber-600",
    "bg-red-600", "border-red-600",
    "bg-gray-500", "border-gray-500", // For the default/empty category
    "text-white", // Ensure text-white is always available
  ],
};