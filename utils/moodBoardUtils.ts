import { MoodBoard, UserPlan } from '../types/inspiration';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const canCreateNewBoard = (moodBoards: MoodBoard[], userPlan: UserPlan): boolean => {
  return moodBoards.length < userPlan.maxBoards;
};

export const canAddMoreImages = (board: MoodBoard | undefined, userPlan: UserPlan): boolean => {
  if (!board) return false;
  return board.images.length < userPlan.maxImagesPerBoard;
};

export const getActiveBoard = (moodBoards: MoodBoard[], activeMoodBoardId: string): MoodBoard | undefined => {
  return moodBoards.find(board => board.id === activeMoodBoardId);
};

export const getActiveBoardImages = (moodBoards: MoodBoard[], activeMoodBoardId: string): string[] => {
  const board = getActiveBoard(moodBoards, activeMoodBoardId);
  return board?.images || [];
};

export const getActiveBoardVibes = (moodBoards: MoodBoard[], activeMoodBoardId: string): string[] => {
  const board = getActiveBoard(moodBoards, activeMoodBoardId);
  return board?.vibes || [];
};

export const uploadImageToStorage = async (file: File, userId: string, boardId: string): Promise<string> => {
  // Use existing Firebase Storage path structure: users/{userId}/mood-boards/{boardId}/{filename}
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const storageRef = ref(storage, `users/${userId}/mood-boards/${boardId}/${fileName}`);
  
  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);
  
  // Get the download URL
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

export const addImageToBoard = (moodBoards: MoodBoard[], boardId: string, imageUrl: string): MoodBoard[] => {
  return moodBoards.map(board => 
    board.id === boardId 
      ? { ...board, images: [...board.images, imageUrl] }
      : board
  );
};

export const removeImageFromBoard = (moodBoards: MoodBoard[], boardId: string, imageIndex: number): MoodBoard[] => {
  return moodBoards.map(board => 
    board.id === boardId 
      ? { ...board, images: board.images.filter((_, i) => i !== imageIndex) }
      : board
  );
};

export const addVibeToBoard = (moodBoards: MoodBoard[], boardId: string, vibe: string): MoodBoard[] => {
  return moodBoards.map(board => 
    board.id === boardId 
      ? { ...board, vibes: [...board.vibes, vibe] }
      : board
  );
};

export const removeVibeFromBoard = (moodBoards: MoodBoard[], boardId: string, vibeIndex: number): MoodBoard[] => {
  return moodBoards.map(board => 
    board.id === boardId 
      ? { ...board, vibes: board.vibes.filter((_, i) => i !== vibeIndex) }
      : board
  );
};

export const updateBoardVibes = (moodBoards: MoodBoard[], boardId: string, vibes: string[]): MoodBoard[] => {
  return moodBoards.map(board => 
    board.id === boardId 
      ? { ...board, vibes }
      : board
  );
};

export const createNewBoard = (name: string, type: 'custom' | 'wedding-day' | 'reception' | 'engagement'): MoodBoard => {
  return {
    id: `board-${Date.now()}`,
    name,
    type,
    images: [],
    vibes: [],
    createdAt: new Date()
  };
};

export const cleanupBase64Images = async (moodBoards: MoodBoard[], userId: string): Promise<MoodBoard[]> => {
  const cleanedBoards: MoodBoard[] = [];
  
  for (const board of moodBoards) {
    const cleanedBoard: MoodBoard = { ...board };
    const cleanedImages: string[] = [];
    
    for (const imageUrl of board.images) {
      // Check if this is a base64 image (starts with data:)
      if (imageUrl.startsWith('data:')) {
        try {
          // Convert base64 to blob and upload to Storage
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Create a file from the blob
          const file = new File([blob], `migrated-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Upload to Firebase Storage
          const newImageUrl = await uploadImageToStorage(file, userId, board.id);
          cleanedImages.push(newImageUrl);
          
          console.log(`Migrated base64 image to Storage: ${newImageUrl}`);
        } catch (error) {
          console.error('Failed to migrate base64 image:', error);
          // Remove the image if migration fails
          continue;
        }
      } else {
        // Keep non-base64 URLs (already in Storage)
        cleanedImages.push(imageUrl);
      }
    }
    
    cleanedBoard.images = cleanedImages;
    cleanedBoards.push(cleanedBoard);
  }
  
  return cleanedBoards;
};
