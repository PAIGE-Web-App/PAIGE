'use client';
import { useState, useEffect } from 'react';

interface ViewportHeightState {
  height: number;
  isShort: boolean; // Height < 800px
  isVeryShort: boolean; // Height < 600px
}

export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState<ViewportHeightState>({
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    isShort: typeof window !== 'undefined' ? window.innerHeight < 800 : false,
    isVeryShort: typeof window !== 'undefined' ? window.innerHeight < 600 : false,
  });

  useEffect(() => {
    const checkHeight = () => {
      const height = window.innerHeight;
      setViewportHeight({
        height,
        isShort: height < 800,
        isVeryShort: height < 600,
      });
    };

    // Check on mount
    checkHeight();

    // Add event listener with throttling
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkHeight, 100);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewportHeight;
}

