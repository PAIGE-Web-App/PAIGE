import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { FileFolder } from '@/types/files';
import { query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';

export const useFileFolders = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FileFolder | null>(null);
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
      const foldersData: FileFolder[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        foldersData.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          userId: user.uid,
          parentId: data.parentId,
          fileCount: data.fileCount || 0,
          subfolderCount: data.subfolderCount || 0,
          color: data.color,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      // Add "All Files" folder
      const allFilesFolder: FileFolder = {
        id: 'all',
        name: 'All Files',
        userId: user.uid,
        fileCount: 0, // Will be updated by parent component
        subfolderCount: 0,
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
  const addFolder = async (name: string, description?: string, color?: string, parentId?: string): Promise<void> => {
    if (!user) return;

    try {
      const folderData = {
        name: name.trim(),
        description: description?.trim(),
        userId: user.uid,
        parentId: parentId || null, // Use provided parentId or null for top-level folder
        fileCount: 0,
        subfolderCount: 0,
        color: color || '#A85C36', // Use provided color or default
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
  const updateFolder = async (folderId: string, updates: Partial<FileFolder>): Promise<void> => {
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

  // Delete folder with cascading deletion
  const deleteFolder = async (folderId: string): Promise<void> => {
    if (!user) return;

    try {
      
      
      // Get all folders to find subfolders
      const foldersQuery = query(getUserCollectionRef('fileCategories', user.uid));
      const foldersSnapshot = await getDocs(foldersQuery);
      const allFolders = foldersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as Omit<FileFolder, 'id'>) 
      })) as FileFolder[];
      
      // Find all subfolders recursively (including nested subfolders)
      const foldersToDelete = new Set<string>();
      const findSubfolders = (parentId: string) => {
        foldersToDelete.add(parentId);
        const children = allFolders.filter(f => f.parentId === parentId);
        children.forEach(child => findSubfolders(child.id));
      };
      
      findSubfolders(folderId);
      const foldersToDeleteArray = Array.from(foldersToDelete);
      
      
      // Get all files in any of the folders to be deleted
      const filesQuery = query(getUserCollectionRef('files', user.uid));
      const filesSnapshot = await getDocs(filesQuery);
      
      const filesToDelete = filesSnapshot.docs.filter(doc => {
        const data = doc.data() as any;
        return foldersToDelete.has(data.folderId);
      });
      
      
      
      // Delete all files first
      if (filesToDelete.length > 0) {
        const fileDeletePromises = filesToDelete.map(doc => deleteDoc(doc.ref));
        await Promise.all(fileDeletePromises);

      }
      
      // Delete all folders (subfolders first, then parent)
      const folderDeletePromises = foldersToDeleteArray.map(folderId => 
        deleteDoc(doc(getUserCollectionRef('fileCategories', user.uid), folderId))
      );
      await Promise.all(folderDeletePromises);
      
      
      // If the deleted folder was selected, clear selection
      if (selectedFolder && foldersToDelete.has(selectedFolder.id)) {
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