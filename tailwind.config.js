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
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Custom breakpoints for mobile-first design
        'mobile': '640px',
        'tablet': '768px',
        'desktop': '1024px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
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
    'animate-bounce-once',
  ],
};