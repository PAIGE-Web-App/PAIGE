"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MoodBoard } from '../types/inspiration';
import { cleanupBase64Images } from '../utils/moodBoardUtils';

interface MoodBoardsContextType {
  moodBoards: MoodBoard[];
  setMoodBoards: (boards: MoodBoard[] | ((prev: MoodBoard[]) => MoodBoard[])) => void;
  moodBoardsLoading: boolean;
  refreshMoodBoards: () => Promise<void>;
  saveMoodBoards: (boards: MoodBoard[]) => Promise<void>;
}

const MoodBoardsContext = createContext<MoodBoardsContextType | undefined>(undefined);

export const useMoodBoards = () => {
  const context = useContext(MoodBoardsContext);
  if (context === undefined) {
    throw new Error('useMoodBoards must be used within a MoodBoardsProvider');
  }
  return context;
};

interface MoodBoardsProviderProps {
  children: ReactNode;
}

export const MoodBoardsProvider: React.FC<MoodBoardsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [moodBoardsLoading, setMoodBoardsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadMoodBoards = async () => {
    if (!user || hasLoaded) return;
    
    setMoodBoardsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        let savedMoodBoards = data.moodBoards || [];
        
        // Migration: Check if we need to migrate existing vibes to wedding-day board (only once)
        const existingVibes = [...(data.vibe || []), ...(data.generatedVibes || [])];
        const existingVibeInputMethod = data.vibeInputMethod || 'pills';
        const hasMigratedVibes = data.hasMigratedVibesToMoodBoard;
        
        if (savedMoodBoards.length === 0) {
          // No mood boards exist, create default with migrated vibes
          const defaultBoard: MoodBoard = {
            id: 'wedding-day',
            name: 'Wedding Day',
            type: 'wedding-day',
            images: [],
            vibes: existingVibes,
            createdAt: new Date(),
            vibeInputMethod: existingVibeInputMethod
          };
          
          savedMoodBoards = [defaultBoard];
        } else if (!hasMigratedVibes) {
          // Mood boards exist, but check if wedding-day board needs vibes migrated (only once)
          const weddingDayBoard = savedMoodBoards.find(board => board.id === 'wedding-day');
          if (weddingDayBoard && existingVibes.length > 0 && weddingDayBoard.vibes.length === 0) {
            // Migrate vibes to existing wedding-day board
            weddingDayBoard.vibes = existingVibes;
            weddingDayBoard.vibeInputMethod = existingVibeInputMethod;
          }
        }
        
        // Save the migrated data to Firestore if we made changes and mark migration as complete
        if (existingVibes.length > 0 && !hasMigratedVibes) {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              moodBoards: savedMoodBoards,
              hasMigratedVibesToMoodBoard: true
            });
          } catch (migrationError) {
            console.error('Error saving migrated mood boards:', migrationError);
          }
        }
        
        // Clean up any existing base64 images to prevent document size issues
        try {
          const cleanedBoards = await cleanupBase64Images(savedMoodBoards, user.uid);
          if (JSON.stringify(cleanedBoards) !== JSON.stringify(savedMoodBoards)) {
            // Save cleaned boards if changes were made
            await updateDoc(doc(db, "users", user.uid), {
              moodBoards: cleanedBoards
            });
            setMoodBoards(cleanedBoards);
          } else {
            setMoodBoards(savedMoodBoards);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up base64 images:', cleanupError);
          // Continue with original boards if cleanup fails
          setMoodBoards(savedMoodBoards);
        }
      }
    } catch (error) {
      console.error('Error loading mood boards:', error);
      // Fallback to default board
      const defaultBoard: MoodBoard = {
        id: 'wedding-day',
        name: 'Wedding Day',
        type: 'wedding-day',
        images: [],
        vibes: [],
        createdAt: new Date()
      };
      setMoodBoards([defaultBoard]);
    } finally {
      setMoodBoardsLoading(false);
      setHasLoaded(true);
    }
  };

  const refreshMoodBoards = async () => {
    setHasLoaded(false);
    await loadMoodBoards();
  };

  const saveMoodBoards = async (boards: MoodBoard[]) => {
    if (!user) return;
    
    try {
      // Sync vibes with user profile settings for Wedding Day board
      const weddingDayBoard = boards.find(board => board.id === 'wedding-day');
      if (weddingDayBoard) {
        // Update user profile with current vibes from Wedding Day board
        await updateDoc(doc(db, "users", user.uid), {
          moodBoards: boards,
          vibe: weddingDayBoard.vibes, // Sync vibes with profile
          generatedVibes: [], // Clear generated vibes since they're now in mood board
          vibeInputMethod: weddingDayBoard.vibeInputMethod || 'pills'
        });
      } else {
        // No wedding day board, just save mood boards
        await updateDoc(doc(db, "users", user.uid), {
          moodBoards: boards
        });
      }
    } catch (error) {
      console.error('Error saving mood boards:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadMoodBoards();
  }, [user]);

  const value: MoodBoardsContextType = {
    moodBoards,
    setMoodBoards,
    moodBoardsLoading,
    refreshMoodBoards,
    saveMoodBoards
  };

  return (
    <MoodBoardsContext.Provider value={value}>
      {children}
    </MoodBoardsContext.Provider>
  );
};
