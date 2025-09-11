"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Edit3, Upload, Heart, Palette, Camera, X, Save, Plus, Star, MapPin, Flag } from "lucide-react";
import WeddingBanner from "../../components/WeddingBanner";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useMoodBoardStorage } from "../../hooks/useMoodBoardStorage";
import VibePill from "../../components/VibePill";
import { useCredits } from "../../hooks/useCredits";

// Import new components
import PinterestBanner from "../../components/inspiration/PinterestBanner";
import MoodBoardTabs from "../../components/inspiration/MoodBoardTabs";
import MoodBoardContent from "../../components/inspiration/MoodBoardContent";
import NewBoardModal from "../../components/inspiration/NewBoardModal";
import VibeEditModal from "../../components/inspiration/VibeEditModal";
import ImageEditModal from "../../components/inspiration/ImageEditModal";
import StorageProgressBar from "../../components/StorageProgressBar";
import UpgradePlanModal from "../../components/UpgradePlanModal";
import Banner from "../../components/Banner";
import MoodBoardSkeleton from "../../components/inspiration/MoodBoardSkeleton";
import VibePreviewModal from "../../components/inspiration/VibePreviewModal";
import LoadingBar from "../../components/LoadingBar";

// Import types and utilities
import { MoodBoard, UserPlan, PLAN_LIMITS, BOARD_TEMPLATES } from "../../types/inspiration";
import { 
  getActiveBoard, 
  addImageToBoard, 
  removeImageFromBoard, 
  updateBoardVibes,
  createNewBoard,
  uploadImageToStorage,
  cleanupBase64Images
} from "../../utils/moodBoardUtils";
import { creditEventEmitter } from "../../utils/creditEventEmitter";
import NotEnoughCreditsModal from "../../components/NotEnoughCreditsModal";
import { COUPLE_SUBSCRIPTION_CREDITS } from "../../types/credits";

export default function MoodBoardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { daysLeft, userName, isLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { vibe, generatedVibes, vibeInputMethod, weddingLocation } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { credits } = useCredits();
  
  // User plan (for now, default to free - you can integrate with your billing system)
  const userPlan = PLAN_LIMITS.free;
  const userCredits = COUPLE_SUBSCRIPTION_CREDITS.free; // For credit information
  
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [editingVibes, setEditingVibes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVibeInput, setShowVibeInput] = useState(false);
  const [newVibe, setNewVibe] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingVibes, setGeneratingVibes] = useState(false);

  const [showPinterestSearch, setShowPinterestSearch] = useState(false);
  const [pinterestSearchQuery, setPinterestSearchQuery] = useState('');
  const [pinterestResults, setPinterestResults] = useState<any[]>([]);
  const [searchingPinterest, setSearchingPinterest] = useState(false);
  const [pinterestBannerExpanded, setPinterestBannerExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Mood board state
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [activeMoodBoard, setActiveMoodBoard] = useState<string>('wedding-day');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardType, setNewBoardType] = useState<'custom' | 'wedding-day' | 'reception' | 'engagement'>('custom');
  const [moodBoardsLoading, setMoodBoardsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBoardLimitBanner, setShowBoardLimitBanner] = useState(true);
  const [editingBoard, setEditingBoard] = useState<MoodBoard | null>(null);
  const [inlineEditingBoardId, setInlineEditingBoardId] = useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = useState('');
  
  // Image edit modal state
  const [showImageEditModal, setShowImageEditModal] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  
  // Vibe preview modal state
  const [showVibePreviewModal, setShowVibePreviewModal] = useState(false);
  
  // Not enough credits modal state
  const [showNotEnoughCreditsModal, setShowNotEnoughCreditsModal] = useState(false);
  const [creditModalData, setCreditModalData] = useState({
    requiredCredits: 2,
    currentCredits: 0,
    feature: 'this feature'
  });
  
  // Storage tracking for mood board images
  const storageStats = useMoodBoardStorage(moodBoards, userPlan.tier);

  // Image management functions
  const handleEditImage = (imageIndex: number) => {
    setEditingImageIndex(imageIndex);
    setShowImageEditModal(true);
  };

  const handleDownloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccessToast('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      showErrorToast('Failed to download image');
    }
  };

  const handleUpdateImage = (imageIndex: number, fileName: string, description: string) => {
    console.log('handleUpdateImage called with:', { imageIndex, fileName, description });
    
    const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
    if (!activeBoard) {
      console.log('No active board found');
      return;
    }
    
    console.log('Active board:', activeBoard);
    console.log('Current images:', activeBoard.images);
    console.log('Image at index:', activeBoard.images[imageIndex]);
    
    const updatedBoards = moodBoards.map(board => {
      if (board.id === activeBoard.id) {
        const updatedImages = [...board.images];
        // Handle both old string format and new object format
        if (typeof updatedImages[imageIndex] === 'string') {
          // Convert old string format to new object format
          updatedImages[imageIndex] = {
            url: updatedImages[imageIndex] as string,
            fileName,
            description,
            uploadedAt: new Date()
          };
          console.log('Converted string image to object:', updatedImages[imageIndex]);
        } else {
          // Update existing object format
          updatedImages[imageIndex] = {
            ...updatedImages[imageIndex],
            fileName,
            description
          };
          console.log('Updated existing object image:', updatedImages[imageIndex]);
        }
        return { ...board, images: updatedImages };
      }
      return board;
    });
    
    console.log('Updated boards:', updatedBoards);
    setMoodBoards(updatedBoards);
    showSuccessToast('Image updated successfully!');
  };

  const handleUseVibesInDraft = (vibes: string[], boardType: string) => {
    // Store the selected vibes and board type for use in draft messages
    // This will be accessible from the main dashboard draft message area
    localStorage.setItem('selectedVibes', JSON.stringify(vibes));
    localStorage.setItem('selectedBoardType', boardType);
    localStorage.setItem('vibesLastUpdated', new Date().toISOString());
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('vibesUpdated'));
    
    showSuccessToast(`Vibes saved! They'll be available in your Draft Message area.`);
    
    // Optionally redirect to main dashboard or open draft message area
    // router.push('/');
  };

  // Initialize editing vibes when active board changes
  useEffect(() => {
    const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
    if (activeBoard && activeBoard.vibes) {
      setEditingVibes([...activeBoard.vibes]);
    } else {
      setEditingVibes([]);
    }
  }, [activeMoodBoard, moodBoards]);

  // Load mood boards from Firestore with migration
  useEffect(() => {
    const loadMoodBoards = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          let savedMoodBoards = data.moodBoards || [];
          
          // Migration: Check if we need to migrate existing vibes to wedding-day board (only once)
          const existingVibes = [...(data.vibe || []), ...(data.generatedVibes || [])];
          const existingVibeInputMethod = data.vibeInputMethod || 'pills';
          const hasMigratedVibes = data.hasMigratedVibesToMoodBoard; // Check if migration already happened
          
          if (savedMoodBoards.length === 0) {
            // No mood boards exist, create default with migrated vibes
            const defaultBoard: MoodBoard = {
              id: 'wedding-day',
              name: 'Wedding Day',
              type: 'wedding-day',
              images: [], // TODO: Add onboarding image if available
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
              console.log('Migrated existing vibes to Wedding Day board');
            }
          }
          
          // Save the migrated data to Firestore if we made changes and mark migration as complete
          if (existingVibes.length > 0 && !hasMigratedVibes) {
            try {
              await updateDoc(doc(db, "users", user.uid), {
                moodBoards: savedMoodBoards,
                hasMigratedVibesToMoodBoard: true // Mark migration as complete
              });
              console.log('Successfully saved migrated mood boards');
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
              console.log('Successfully cleaned up base64 images');
              setMoodBoards(cleanedBoards);
            } else {
              setMoodBoards(savedMoodBoards);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up base64 images:', cleanupError);
            // Continue with original boards if cleanup fails
            setMoodBoards(savedMoodBoards);
          }
          
          setActiveMoodBoard(savedMoodBoards[0].id);
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
        setActiveMoodBoard('wedding-day');
      } finally {
        setMoodBoardsLoading(false);
      }
    };

    loadMoodBoards();
  }, [user]);

  // Save mood boards to Firestore whenever they change
  useEffect(() => {
    const saveMoodBoards = async () => {
      if (!user || moodBoardsLoading || moodBoards.length === 0) return;
      
      try {
        // Sync vibes with user profile settings for Wedding Day board
        const weddingDayBoard = moodBoards.find(board => board.id === 'wedding-day');
        if (weddingDayBoard) {
          // Update user profile with current vibes from Wedding Day board
          await updateDoc(doc(db, "users", user.uid), {
            moodBoards: moodBoards,
            vibe: weddingDayBoard.vibes, // Sync vibes with profile
            generatedVibes: [], // Clear generated vibes since they're now in mood board
            vibeInputMethod: weddingDayBoard.vibeInputMethod || 'pills'
          });
        } else {
          // No wedding day board, just save mood boards
          await updateDoc(doc(db, "users", user.uid), {
            moodBoards: moodBoards
          });
        }
      } catch (error) {
        console.error('Error saving mood boards:', error);
        showErrorToast('Failed to save mood boards');
      }
    };

    // Debounce saves to avoid excessive Firestore writes
    const timeoutId = setTimeout(saveMoodBoards, 1000);
    return () => clearTimeout(timeoutId);
  }, [moodBoards, user, moodBoardsLoading]);

  // Helper functions
  const canCreateNewBoard = () => {
    return moodBoards.length < userPlan.maxBoards;
  };

  const handleSave = async () => {
    if (!user || !getActiveBoard(moodBoards, activeMoodBoard)) return;
    
    setSaving(true);
    try {
      // Update the active board's vibes
      const updatedMoodBoards = updateBoardVibes(moodBoards, activeMoodBoard, editingVibes);
      setMoodBoards(updatedMoodBoards);
      
      showSuccessToast('Wedding vibe updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving vibe:', error);
      showErrorToast('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFilesDrop(Array.from(files));
    }
  };

  const handleFilesDrop = async (files: File[]) => {
    if (!user) return;
    
    setUploadingImage(true);
    
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          // Upload to Firebase Storage instead of base64
          const imageUrl = await uploadImageToStorage(file, user.uid, activeMoodBoard);
          
          // Add the Storage URL to the mood board
          const updatedBoards = addImageToBoard(moodBoards, activeMoodBoard, imageUrl, file.name);
          setMoodBoards(updatedBoards);
          
          // Set the first image as the main preview for vibe generation
          if (!imagePreviewUrl) {
            setImagePreviewUrl(imageUrl);
            setUploadedImage(file);
          }
          
          showSuccessToast(`Uploaded ${file.name} successfully!`);
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      showErrorToast('Failed to upload images. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const generateVibesFromImage = async (imageUrl?: string) => {
    if (!user) return;
    
    // If no imageUrl provided, use the uploadedImage
    const imageToUse = imageUrl || uploadedImage;
    if (!imageToUse) return;
    
    setGeneratingVibes(true);
    try {
      const formData = new FormData();
      
      // Add user ID for credit validation
      formData.append('userId', user.uid);
      
      // Handle both File objects and image URLs
      if (imageToUse instanceof File) {
        console.log('Processing File object:', imageToUse.name, imageToUse.type, imageToUse.size);
        formData.append('image', imageToUse);
      } else if (typeof imageToUse === 'string') {
        console.log('Processing image URL:', imageToUse);
        // Check if it's already a base64 string
        if (imageToUse.startsWith('data:image/')) {
          // It's already a base64 string, convert to blob
          const response = await fetch(imageToUse);
          const blob = await response.blob();
          formData.append('image', blob, 'image.jpg');
        } else if (imageToUse.startsWith('blob:')) {
          // It's a blob URL, fetch it
          const response = await fetch(imageToUse);
          const blob = await response.blob();
          formData.append('image', blob, 'image.jpg');
        } else {
          // It's a regular URL, fetch it
          const response = await fetch(imageToUse);
          const blob = await response.blob();
          formData.append('image', blob, 'image.jpg');
        }
      }
      
      console.log('Uploading image for vibe generation...');
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await fetch('/api/generate-vibes-from-image', {
        method: 'POST',
        headers: {
          'x-user-id': user.uid, // Send userId in headers for credit validation
        },
        body: formData,
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success && data.vibes && Array.isArray(data.vibes)) {
        // Add new vibes to the active board
        const newVibes = data.vibes.filter((v: string) => !getActiveBoard(moodBoards, activeMoodBoard)?.vibes.includes(v));
        
        // Update the active board with new vibes
        const updatedMoodBoards = moodBoards.map(board => 
          board.id === activeMoodBoard 
            ? { 
                ...board, 
                vibes: [...board.vibes, ...newVibes],
                vibeInputMethod: 'image'
              }
            : board
        );
        
        setMoodBoards(updatedMoodBoards);
        
        // Emit credit update event to refresh credit display
        creditEventEmitter.emit();
        
        const vibeText = newVibes.length === 1 ? 'vibe' : 'vibes';
        showSuccessToast(`Generated ${newVibes.length} new ${vibeText} from your image!`);
        setShowImageUpload(false);
        setUploadedImage(null);
        setImagePreviewUrl(null);
      } else {
        const errorMessage = data.error || 'Failed to generate vibes from image';
        
        // Check if it's a credit-related error
        if (errorMessage.includes('Not enough credits') || errorMessage.includes('Insufficient credits')) {
          setCreditModalData({
            requiredCredits: 2, // Single vibe generation costs 2 credits
            currentCredits: 0, // We'll get this from the error response if available
            feature: 'vibe generation'
          });
          setShowNotEnoughCreditsModal(true);
        } else {
          showErrorToast(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error generating vibes:', error);
      showErrorToast('Network error: Failed to generate vibes from image');
    } finally {
      setGeneratingVibes(false);
    }
  };

  const generateVibesFromAllImages = async (board: MoodBoard) => {
    if (!user || !board.images || board.images.length === 0) return;
    
    setGeneratingVibes(true);
    try {
      let allNewVibes: string[] = [];
      
      // Process each image in the board
      for (let index = 0; index < board.images.length; index++) {
        const image = board.images[index];
        try {
          const imageUrl = image.url;
          if (!imageUrl) continue;
          
          console.log('Processing image in board:', imageUrl);
          
          const formData = new FormData();
          
          // Add required fields for bulk vibe generation
          formData.append('userId', user.uid);
          formData.append('moodBoardId', activeMoodBoard);
          formData.append('imageId', `image-${index}`);
          
          // Convert image URL to blob for API
          console.log('Fetching image from URL:', imageUrl);
          const response = await fetch(imageUrl);
          
          if (!response.ok) {
            console.error('Failed to fetch image:', response.status, response.statusText);
            continue;
          }
          
          const blob = await response.blob();
          console.log('Image blob size:', blob.size, 'type:', blob.type);
          formData.append('image', blob, 'image.jpg');
          
          console.log('Processing image for bulk vibe generation...');
          const apiResponse = await fetch('/api/generate-bulk-vibes', {
            method: 'POST',
            headers: {
              'x-user-id': user.uid, // Send userId in headers for credit validation
            },
            body: formData,
          });
          
          const data = await apiResponse.json();
          
          if (data.success && data.vibes && Array.isArray(data.vibes)) {
            // Filter out vibes that already exist in the board
            const newVibes = data.vibes.filter((v: string) => !board.vibes.includes(v));
            allNewVibes = [...allNewVibes, ...newVibes];
          }
        } catch (error) {
          console.error('Error processing image:', error);
          
          // Check if it's a credit-related error
          if (error instanceof Error && (error.message.includes('Not enough credits') || error.message.includes('Insufficient credits'))) {
            setCreditModalData({
              requiredCredits: 5, // Bulk vibe generation costs 5 credits
              currentCredits: 0,
              feature: 'bulk vibe generation'
            });
            setShowNotEnoughCreditsModal(true);
            break; // Stop processing other images if credits are insufficient
          }
          
          // Continue with other images even if one fails
        }
      }
      
      if (allNewVibes.length > 0) {
        // Remove duplicates
        const uniqueNewVibes = [...new Set(allNewVibes)];
        
        // Update the board with new vibes
        const updatedMoodBoards = moodBoards.map(b => 
          b.id === board.id 
            ? { 
                ...b, 
                vibes: [...b.vibes, ...uniqueNewVibes],
                vibeInputMethod: 'image'
              }
            : b
        );
        
        setMoodBoards(updatedMoodBoards);
        
        // Emit credit update event to refresh credit display
        creditEventEmitter.emit();
        
        const vibeText = uniqueNewVibes.length === 1 ? 'vibe' : 'vibes';
        showSuccessToast(`Generated ${uniqueNewVibes.length} new ${vibeText} from all images!`);
      } else {
        showErrorToast('No new vibes could be generated from the images');
      }
    } catch (error) {
      console.error('Error generating vibes from all images:', error);
      showErrorToast('Failed to generate vibes from all images');
    } finally {
      setGeneratingVibes(false);
    }
  };

  const addMoodBoard = async (name: string, type: 'custom' | 'wedding-day' | 'reception' | 'engagement') => {
    // Check if we're editing an existing board
    if (editingBoard) {
      // Update existing board
      try {
        const updatedBoards = moodBoards.map(board => 
          board.id === editingBoard.id 
            ? { ...board, name, type }
            : board
        );
        
        setMoodBoards(updatedBoards);
        setShowNewBoardModal(false);
        setNewBoardName('');
        setEditingBoard(null);
        showSuccessToast(`Updated mood board: ${name}`);
        
        // Save to Firestore
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            moodBoards: updatedBoards
          });
        }
      } catch (error) {
        console.error('Error updating mood board:', error);
        showErrorToast('Failed to update mood board');
      }
      return;
    }

    // Creating new board
    if (!canCreateNewBoard()) {
      showErrorToast(`You've reached the limit of ${userPlan.maxBoards} mood boards for your plan. Upgrade to create more!`);
      return;
    }

    const newBoard = createNewBoard(name, type);

    try {
      // Update local state immediately for responsive UI
      setMoodBoards(prev => [...prev, newBoard]);
      setActiveMoodBoard(newBoard.id);
      setShowNewBoardModal(false);
      setNewBoardName('');
      showSuccessToast(`Created new mood board: ${name}`);
      
      // Save to Firestore (will be handled by useEffect)
    } catch (error) {
      console.error('Error creating mood board:', error);
      showErrorToast('Failed to create mood board');
    }
  };

  const editMoodBoard = (board: MoodBoard) => {
    // Update the board with new data (for inline editing)
    try {
      const updatedBoards = moodBoards.map(b => 
        b.id === board.id ? board : b
      );
      
      setMoodBoards(updatedBoards);
      
      // Save to Firestore
      if (user) {
        updateDoc(doc(db, "users", user.uid), {
          moodBoards: updatedBoards
        });
      }
      
      showSuccessToast('Board updated successfully');
    } catch (error) {
      console.error('Error updating board:', error);
      showErrorToast('Failed to update board');
    }
  };

  const saveInlineEdit = async () => {
    if (!inlineEditingBoardId || !inlineEditingName.trim()) return;
    
    try {
      const updatedBoards = moodBoards.map(board => 
        board.id === inlineEditingBoardId 
          ? { ...board, name: inlineEditingName.trim() }
          : board
      );
      
      setMoodBoards(updatedBoards);
      setInlineEditingBoardId(null);
      setInlineEditingName('');
      showSuccessToast('Board name updated successfully');
      
      // Save to Firestore
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          moodBoards: updatedBoards
        });
      }
    } catch (error) {
      console.error('Error updating board name:', error);
      showErrorToast('Failed to update board name');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingBoardId(null);
    setInlineEditingName('');
  };

  const deleteMoodBoard = async (boardId: string) => {
    if (!user) return;
    
    try {
      const updatedBoards = moodBoards.filter(board => board.id !== boardId);
      setMoodBoards(updatedBoards);
      
      // If we deleted the active board, switch to the first available board
      if (activeMoodBoard === boardId) {
        setActiveMoodBoard(updatedBoards[0]?.id || 'wedding-day');
      }
      
      // Save to Firestore
      await updateDoc(doc(db, "users", user.uid), {
        moodBoards: updatedBoards
      });
      
      showSuccessToast('Mood board deleted successfully');
    } catch (error) {
      console.error('Error deleting mood board:', error);
      showErrorToast('Failed to delete mood board');
    }
  };

  const addVibe = () => {
    if (newVibe.trim()) {
      // Split by commas and trim each vibe
      const vibesToAdd = newVibe.split(',').map(vibe => vibe.trim()).filter(vibe => vibe.length > 0);
      
      if (vibesToAdd.length > 0) {
        setEditingVibes([...editingVibes, ...vibesToAdd]);
        setNewVibe('');
        // Don't close the input section - keep it open for more vibes
      }
    }
  };

  const removeVibe = (index: number) => {
    setEditingVibes(editingVibes.filter((_, i) => i !== index));
  };

  // Auth check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linen">
      <WeddingBanner 
        daysLeft={daysLeft}
        userName={userName}
        isLoading={isLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container flex flex-col gap-6 py-8">
        {/* Page Header - Always show immediately */}
        <div className="mb-4">
            <div className="flex items-center justify-between">
              {/* Left side: Header and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-[#A85C36]" />
                  <h5>Mood Boards</h5>
                </div>
                <p className="text-sm text-[#364257]">
                  Create mood boards with vibes that train Paige to write more curated content when reaching out to vendors.{' '}
                  <Sparkles className="w-4 h-4 text-[#A85C36] inline" />
                  <button 
                    onClick={() => setShowVibePreviewModal(true)}
                    className="text-[#A85C36] hover:text-[#8B4513] text-sm font-medium transition-colors"
                  >
                    See it in action
                  </button>
                </p>
              </div>
              
              {/* Right side: Storage Usage with 40px gap */}
              <div className="w-64 ml-10">
                <StorageProgressBar
                  usedStorage={storageStats.usedStorage}
                  totalStorage={storageStats.totalStorage}
                  plan={storageStats.plan.toUpperCase() as 'FREE' | 'PREMIUM' | 'ENTERPRISE'}
                  showUpgradeModal={() => {
                    // TODO: Implement upgrade modal
                    showErrorToast('Upgrade your plan to get more storage!');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Border line underneath header */}
          <div className="border-b border-[#AB9C95] mb-2"></div>

          {/* Mood Board Section */}
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                {/* Mood Board Tabs */}
                <MoodBoardTabs
                  moodBoards={moodBoards}
                  activeMoodBoard={activeMoodBoard}
                  onTabChange={setActiveMoodBoard}
                  onNewBoard={() => setShowNewBoardModal(true)}
                  onEditBoard={editMoodBoard}
                  onDeleteBoard={deleteMoodBoard}
                  inlineEditingBoardId={inlineEditingBoardId}
                  inlineEditingName={inlineEditingName}
                  onInlineEditChange={setInlineEditingName}
                  onSaveInlineEdit={saveInlineEdit}
                  onCancelInlineEdit={cancelInlineEdit}
                  userPlan={userPlan}
                  isLoading={moodBoardsLoading}
                />
                
                {/* Right side actions */}
                <div className="flex items-center gap-3">
                  {/* Pinterest Integration Button */}
                  <PinterestBanner 
                    isExpanded={pinterestBannerExpanded}
                    onToggle={() => setPinterestBannerExpanded(!pinterestBannerExpanded)}
                  />
                </div>
              </div>

              {/* Plan Limit Warning */}
              {!canCreateNewBoard() && showBoardLimitBanner && (
                <div className="mb-4">
                  <div className="bg-blue-100 text-blue-800 p-2 text-sm rounded-[5px] mb-4 flex items-center justify-between">
                    <div className="flex-1">
                      You've reached the limit of {userPlan.maxBoards} mood boards for your {userPlan.tier} plan.{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowUpgradeModal(true);
                        }}
                        className="underline text-blue-700 hover:text-blue-900"
                      >
                        Upgrade to create more!
                      </a>
                    </div>
                    <button 
                      onClick={() => setShowBoardLimitBanner(false)}
                      className="ml-4 p-1 rounded-full hover:bg-opacity-75 transition-colors"
                      aria-label="Dismiss banner"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mood Board Content - Show skeleton only for dynamic content */}
            {moodBoardsLoading ? (
              <MoodBoardSkeleton />
            ) : (
              getActiveBoard(moodBoards, activeMoodBoard) && (
                <div className="bg-white border border-gray-100 rounded-lg p-6">
                  <MoodBoardContent
                    board={getActiveBoard(moodBoards, activeMoodBoard)!}
                    userPlan={userPlan}
                    weddingLocation={weddingLocation || undefined}
                    isEditing={isEditing}
                    generatingVibes={generatingVibes}
                    isDragOver={isDragOver}
                    onRemoveImage={(index) => {
                      const updatedBoards = removeImageFromBoard(moodBoards, activeMoodBoard, index);
                      setMoodBoards(updatedBoards);
                    }}
                    onGenerateVibes={generateVibesFromImage}
                    onExtractVibesFromAll={generateVibesFromAllImages}
                    onChooseVibe={() => setIsEditing(true)}
                    onEditVibes={() => setIsEditing(true)}
                    onEditBoardName={editMoodBoard}
                    onDeleteBoard={deleteMoodBoard}
                    onEditImage={handleEditImage}
                    onDownloadImage={handleDownloadImage}
                    onImageUpload={handleImageUpload}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const files = Array.from(e.dataTransfer.files) as File[];
                      const imageFiles = files.filter(file => file.type.startsWith('image/'));
                      
                      if (imageFiles.length !== files.length) {
                        showErrorToast('Only image files are accepted. Please upload JPG, PNG, GIF, or WebP files.');
                      }
                      
                      if (imageFiles.length > 0) {
                        handleFilesDrop(imageFiles);
                      }
                    }}
                    isLoading={moodBoardsLoading}
                    uploadingImage={uploadingImage}
                  />
                </div>
              )
            )}
          </div>

        {/* Modals */}
          <NewBoardModal
            isOpen={showNewBoardModal}
            onClose={() => {
              setShowNewBoardModal(false);
              setEditingBoard(null);
              setNewBoardName('');
            }}
            onCreate={addMoodBoard}
            newBoardName={newBoardName}
            setNewBoardName={setNewBoardName}
            newBoardType={newBoardType}
            setNewBoardType={setNewBoardType}
            isEditing={!!editingBoard}
            editingBoard={editingBoard}
          />

          <VibeEditModal
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSave={handleSave}
            editingVibes={editingVibes}
            setEditingVibes={setEditingVibes}
            boardName={getActiveBoard(moodBoards, activeMoodBoard)?.name || 'Mood Board'}
            saving={saving}
            showVibeInput={showVibeInput}
            setShowVibeInput={setShowVibeInput}
            newVibe={newVibe}
            setNewVibe={setNewVibe}
            onAddVibe={addVibe}
            onRemoveVibe={removeVibe}
          />

          {showUpgradeModal && (
            <UpgradePlanModal
              maxLists={userPlan.maxBoards}
              reason="lists"
              onClose={() => setShowUpgradeModal(false)}
            />
          )}

          {/* Image Edit Modal */}
          {showImageEditModal && editingImageIndex !== null && getActiveBoard(moodBoards, activeMoodBoard) && (() => {
            const activeBoard = getActiveBoard(moodBoards, activeMoodBoard)!;
            const image = activeBoard.images[editingImageIndex];
            
            // Handle both old string format and new object format
            const imageUrl = typeof image === 'string' ? image : image.url;
            const imageName = typeof image === 'string' ? `Image ${editingImageIndex + 1}` : image.fileName;
            const imageDescription = typeof image === 'string' ? '' : image.description;
            
            return (
              <ImageEditModal
                isOpen={showImageEditModal}
                onClose={() => {
                  setShowImageEditModal(false);
                  setEditingImageIndex(null);
                }}
                onSave={handleUpdateImage}
                imageIndex={editingImageIndex}
                currentFileName={imageName}
                currentDescription={imageDescription}
                imageUrl={imageUrl}
              />
            );
          })()}

          {/* Vibe Preview Modal */}
          <VibePreviewModal
            isOpen={showVibePreviewModal}
            onClose={() => setShowVibePreviewModal(false)}
            moodBoards={moodBoards}
            activeMoodBoard={activeMoodBoard}
            onUseInDraft={handleUseVibesInDraft}
          />

          {/* Loading Bar for Generate Vibes */}
          <LoadingBar
            description="Generating vibes from your image..."
            isVisible={generatingVibes}
            onComplete={() => {
              // Credit update event is already emitted in generateVibesFromImage
              console.log('Vibe generation completed');
            }}
          />

          {/* Not Enough Credits Modal */}
          <NotEnoughCreditsModal
            isOpen={showNotEnoughCreditsModal}
            onClose={() => setShowNotEnoughCreditsModal(false)}
            requiredCredits={creditModalData.requiredCredits}
            currentCredits={creditModalData.currentCredits}
            feature={creditModalData.feature}
            accountInfo={{
              tier: 'Free', // Since we're using the free tier
              dailyCredits: userCredits.monthlyCredits,
              refreshTime: 'Daily at midnight'
            }}
            currentCredits={credits ? (credits.dailyCredits + credits.bonusCredits) : 0}
          />
        </div>
      </div>
  );
}
