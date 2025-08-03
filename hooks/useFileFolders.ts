import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { FileCategory } from '@/types/files';
import { query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';

export const useFileFolders = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FileCategory[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FileCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch folders from Firestore
  useEffect(() => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    const q = query(
      getUserCollectionRef('fileCategories', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const foldersData: FileCategory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        foldersData.push({
          id: doc.id,
          name: data.name,
          count: data.count || 0,
          color: data.color,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      // Add "All Files" folder
      const allFilesFolder: FileCategory = {
        id: 'all',
        name: 'All Files',
        count: 0, // Will be updated by parent component
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setFolders([allFilesFolder, ...foldersData]);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching folders:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Create a new folder
  const addFolder = async (name: string, description?: string): Promise<void> => {
    if (!user) return;

    try {
      const folderData = {
        name: name.trim(),
        count: 0,
        color: '#A85C36', // Default color
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(getUserCollectionRef('fileCategories', user.uid), folderData);
    } catch (err) {
      console.error('Error adding folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    }
  };

  // Update folder
  const updateFolder = async (folderId: string, updates: Partial<FileCategory>): Promise<void> => {
    if (!user) return;

    try {
      const folderRef = doc(getUserCollectionRef('fileCategories', user.uid), folderId);
      await updateDoc(folderRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Error updating folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      throw err;
    }
  };

  // Delete folder
  const deleteFolder = async (folderId: string): Promise<void> => {
    if (!user) return;

    try {
      // Check if folder has files
      const filesQuery = query(getUserCollectionRef('files', user.uid));
      const filesSnapshot = await getDocs(filesQuery);
      
      const filesInFolder = filesSnapshot.docs.filter(doc => {
        const data = doc.data() as any;
        return data.categoryId === folderId;
      });
      
      if (filesInFolder.length > 0) {
        throw new Error('Cannot delete folder that contains files. Please move or delete all files first.');
      }

      await deleteDoc(doc(getUserCollectionRef('fileCategories', user.uid), folderId));
      
      // If the deleted folder was selected, clear selection
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      throw err;
    }
  };

  // Update file count for a folder
  const updateFolderFileCount = async (folderId: string, count: number): Promise<void> => {
    if (!user) return;

    try {
      const folderRef = doc(getUserCollectionRef('fileCategories', user.uid), folderId);
      await updateDoc(folderRef, {
        count: count,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Error updating folder file count:', err);
    }
  };

  return {
    folders,
    selectedFolder,
    setSelectedFolder,
    loading,
    error,
    addFolder,
    updateFolder,
    deleteFolder,
    updateFolderFileCount,
  };
}; 