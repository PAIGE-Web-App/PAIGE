import { useState, useEffect } from 'react';

interface VibeIntegrationData {
  vibes: string[];
  boardType: string;
  lastUpdated: string;
}

export function useVibeIntegration() {
  const [vibeData, setVibeData] = useState<VibeIntegrationData | null>(null);
  const [hasVibes, setHasVibes] = useState(false);

  useEffect(() => {
    // Check for vibes data on mount and set up storage listener
    checkForVibes();
    
    // Listen for storage changes (when vibes are updated from mood boards)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedVibes' || e.key === 'selectedBoardType' || e.key === 'vibesLastUpdated') {
        checkForVibes();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleVibeUpdate = () => {
      checkForVibes();
    };
    
    window.addEventListener('vibesUpdated', handleVibeUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vibesUpdated', handleVibeUpdate);
    };
  }, []);

  const checkForVibes = () => {
    try {
      const vibes = localStorage.getItem('selectedVibes');
      const boardType = localStorage.getItem('selectedBoardType');
      const lastUpdated = localStorage.getItem('vibesLastUpdated');

      if (vibes && boardType && lastUpdated) {
        const parsedVibes = JSON.parse(vibes);
        if (Array.isArray(parsedVibes) && parsedVibes.length > 0) {
          setVibeData({
            vibes: parsedVibes,
            boardType,
            lastUpdated
          });
          setHasVibes(true);
          return;
        }
      }
      
      setVibeData(null);
      setHasVibes(false);
    } catch (error) {
      console.error('Error checking for vibes:', error);
      setVibeData(null);
      setHasVibes(false);
    }
  };

  const clearVibes = () => {
    localStorage.removeItem('selectedVibes');
    localStorage.removeItem('selectedBoardType');
    localStorage.removeItem('vibesLastUpdated');
    setVibeData(null);
    setHasVibes(false);
  };

  const getVibeContext = (): string => {
    if (!vibeData) return '';
    
    const boardTypeLabel = vibeData.boardType === 'wedding-day' ? 'wedding' : 
                          vibeData.boardType === 'reception' ? 'reception' : 
                          vibeData.boardType === 'engagement' ? 'engagement' : 'event';
    
    return `I'm planning my ${boardTypeLabel} and going for a ${vibeData.vibes.join(', ')} vibe.`;
  };

  const getVibePrompt = (): string => {
    if (!vibeData) return '';
    
    return `Please incorporate these vibes naturally into my message: ${vibeData.vibes.join(', ')}. Make it sound friendly and conversational.`;
  };

  return {
    vibeData,
    hasVibes,
    clearVibes,
    getVibeContext,
    getVibePrompt,
    checkForVibes
  };
}
