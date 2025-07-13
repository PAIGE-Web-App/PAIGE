import React from 'react';

/**
 * Highlights matching text in a string based on a search query
 * @param text - The text to search within
 * @param searchQuery - The search query to highlight
 * @returns JSX with highlighted text or the original text if no match
 */
export const highlightText = (text: string, searchQuery: string): React.ReactNode => {
  if (!searchQuery.trim() || !text) return text;
  
  const matchIndex = text.toLowerCase().indexOf(searchQuery.toLowerCase());
  if (matchIndex === -1) return text;
  
  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + searchQuery.length);
  const after = text.slice(matchIndex + searchQuery.length);
  
  return (
    <>
      {before}
      <mark className="bg-yellow-200 text-[#332B42] font-semibold px-0.5 rounded">
        {match}
      </mark>
      {after}
    </>
  );
}; 