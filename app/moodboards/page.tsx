"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Edit3, Upload, Heart, Palette, Camera, X, Save, Plus, Star, MapPin, Flag } from "lucide-react";
import WeddingBanner from "../../components/WeddingBanner";
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useGlobalCompletionToasts } from "../../hooks/useGlobalCompletionToasts";
import { useQuickStartCompletion } from "../../hooks/useQuickStartCompletion";
import { useMoodBoardStorage } from "../../hooks/useMoodBoardStorage";
import VibePill from "../../components/VibePill";
import { useCredits } from "../../contexts/CreditContext";
import { useMoodBoards } from "../../contexts/MoodBoardsContext";
import { useImageUpload } from "../../hooks/useImageUpload";
import ImageUploadProgress from "../../components/inspiration/ImageUploadProgress";

// Import new components
import PinterestBanner from "../../components/inspiration/PinterestBanner";
import MoodBoardContent from "../../components/inspiration/MoodBoardContent";
import MoodBoardSidebar from "../../components/inspiration/MoodBoardSidebar";
import NewBoardModal from "../../components/inspiration/NewBoardModal";
import VibeEditModal from "../../components/inspiration/VibeEditModal";
import ImageEditModal from "../../components/inspiration/ImageEditModal";
import UpgradePlanModal from "../../components/UpgradePlanModal";
import Banner from "../../components/Banner";
import MoodBoardSkeleton from "../../components/inspiration/MoodBoardSkeleton";
import VibePreviewModal from "../../components/inspiration/VibePreviewModal";
import VibeSection from "../../components/inspiration/VibeSection";
import LoadingBar from "../../components/LoadingBar";
import MoodBoardCard from "../../components/inspiration/MoodBoardCard";

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
  const searchParams = useSearchParams();
  const { vibe, generatedVibes, vibeInputMethod, weddingLocation } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  const { credits, refreshCredits } = useCredits();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();
  
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
  // uploadingImage is now managed by useImageUpload hook
  const [generatingVibes, setGeneratingVibes] = useState(false);

  const [showPinterestSearch, setShowPinterestSearch] = useState(false);
  const [pinterestSearchQuery, setPinterestSearchQuery] = useState('');
  const [pinterestResults, setPinterestResults] = useState<any[]>([]);
  const [searchingPinterest, setSearchingPinterest] = useState(false);
  const [pinterestBannerExpanded, setPinterestBannerExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Use shared mood boards context
  const { moodBoards, setMoodBoards, moodBoardsLoading, saveMoodBoards } = useMoodBoards();

  // Image upload optimization
  const { uploading: uploadingImage, uploadProgress, uploadImages, cancelUpload } = useImageUpload({
    onBoardsUpdate: setMoodBoards,
    onFirstImageUpload: (imageUrl, file) => {
      setImagePreviewUrl(imageUrl);
      setUploadedImage(file);
    }
  });
  
  // Local state
  const [activeMoodBoard, setActiveMoodBoard] = useState<string>('');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardType, setNewBoardType] = useState<'custom' | 'wedding-day' | 'reception' | 'engagement'>('custom');
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

  // Mobile state management
  const [mobileViewMode, setMobileViewMode] = useState<'boards' | 'content'>('boards');
  const [isMobile, setIsMobile] = useState(false);
  
  // Storage tracking for mood board images
  const storageStats = useMoodBoardStorage(moodBoards, userPlan.tier);

  // Memoized expensive calculations
  const canCreateNewBoard = useMemo(() => {
    return moodBoards.length < userPlan.maxBoards;
  }, [moodBoards.length, userPlan.maxBoards]);

  const activeBoard = useMemo(() => {
    return getActiveBoard(moodBoards, activeMoodBoard);
  }, [moodBoards, activeMoodBoard]);

  // Handle custom event for opening new board modal from dashboard
  useEffect(() => {
    const handler = () => {
      if (!canCreateNewBoard) {
        setShowUpgradeModal(true);
      } else {
        setShowNewBoardModal(true);
      }
    };
    
    window.addEventListener('open-new-board-modal', handler);
    
    return () => {
      window.removeEventListener('open-new-board-modal', handler);
    };
  }, [canCreateNewBoard, moodBoards.length, userPlan.maxBoards]);

  const boardCount = useMemo(() => {
    return moodBoards.length;
  }, [moodBoards.length]);

  // Mobile detection and handlers
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // handleMobileBoardSelect is now defined as useCallback below

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
    const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
    if (!activeBoard) {
      return;
    }
    
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
        } else {
          // Update existing object format
          updatedImages[imageIndex] = {
            ...updatedImages[imageIndex],
            fileName,
            description
          };
        }
        return { ...board, images: updatedImages };
      }
      return board;
    });
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
    if (activeBoard && activeBoard.vibes) {
      setEditingVibes([...activeBoard.vibes]);
    } else {
      setEditingVibes([]);
    }
  }, [activeBoard]);

  // Data is now loaded by the shared context - no need for local loading

  // Save mood boards to Firestore whenever they change
  useEffect(() => {
    const saveMoodBoardsToFirestore = async () => {
      if (!user || moodBoardsLoading || moodBoards.length === 0) return;
      
      try {
        await saveMoodBoards(moodBoards);
      } catch (error) {
        console.error('Error saving mood boards:', error);
        showErrorToast('Failed to save mood boards');
      }
    };

    // Debounce saves to avoid excessive Firestore writes
    const timeoutId = setTimeout(saveMoodBoardsToFirestore, 1000);
    return () => clearTimeout(timeoutId);
  }, [moodBoards, user, moodBoardsLoading, saveMoodBoards, showErrorToast]);

  // Memoized event handlers
  const handleNewBoard = useCallback(() => {
    if (!canCreateNewBoard) {
      setShowUpgradeModal(true);
    } else {
      setShowNewBoardModal(true);
    }
  }, [canCreateNewBoard]);

  const handleDismissUpgradeBanner = useCallback(() => {
    setShowBoardLimitBanner(false);
  }, []);

  const handleMobileBoardSelect = useCallback((boardId: string) => {
    router.push(`/moodboards/${boardId}`);
  }, [router]);

  // Helper functions (canCreateNewBoard is now memoized above)

  const handleSave = async () => {
    if (!user || !activeBoard) return;
    
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
    if (!user || !activeMoodBoard) return;
    await uploadImages(files, user.uid, activeMoodBoard, moodBoards);
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
        formData.append('image', imageToUse);
      } else if (typeof imageToUse === 'string') {
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
          // It's a regular URL (likely Firebase Storage), use proxy to avoid CORS
          const proxyResponse = await fetch('/api/fetch-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: imageToUse }),
          });
          
          if (!proxyResponse.ok) {
            throw new Error('Failed to fetch image via proxy');
          }
          
          const proxyData = await proxyResponse.json();
          if (!proxyData.success) {
            throw new Error('Proxy failed to fetch image');
          }
          
          // Convert base64 data URL to blob
          const response = await fetch(proxyData.imageData);
          const blob = await response.blob();
          formData.append('image', blob, 'image.jpg');
        }
      }
      
      const response = await fetch('/api/generate-vibes-from-image', {
        method: 'POST',
        headers: {
          'x-user-id': user.uid, // Send userId in headers for credit validation
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.vibes && Array.isArray(data.vibes)) {
        // Add new vibes to the active board
        const newVibes = data.vibes.filter((v: string) => !getActiveBoard(moodBoards, activeMoodBoard)?.vibes.includes(v));
        
        // Update the active board with new vibes (add to top)
        const updatedMoodBoards = moodBoards.map(board => 
          board.id === activeMoodBoard 
            ? { 
                ...board, 
                vibes: [...newVibes, ...board.vibes],
                vibeInputMethod: 'image'
              }
            : board
        );
        
        setMoodBoards(updatedMoodBoards);
        
        // Refresh credits after successful completion
        try {
          await refreshCredits();
        } catch (refreshError) {
          console.warn('Failed to refresh credits after vibe generation:', refreshError);
        }
        
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
          
          
          const formData = new FormData();
          
          // Add required fields for bulk vibe generation
          formData.append('userId', user.uid);
          formData.append('moodBoardId', activeMoodBoard);
          formData.append('imageId', `image-${index}`);
          
          // Convert image URL to blob for API
          const response = await fetch(imageUrl);
          
          if (!response.ok) {
            console.error('Failed to fetch image:', response.status, response.statusText);
            continue;
          }
          
          const blob = await response.blob();
          formData.append('image', blob, 'image.jpg');
          const apiResponse = await fetch('/api/generate-bulk-vibes', {
            method: 'POST',
            headers: {
              'x-user-id': user.uid, // Send userId in headers for credit validation
            },
            body: formData,
          });
          
          const data = await apiResponse.json();
          
          if (data.vibes && Array.isArray(data.vibes)) {
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
        
        // Refresh credits after successful completion
        try {
          await refreshCredits();
        } catch (refreshError) {
          console.warn('Failed to refresh credits after bulk vibe generation:', refreshError);
        }
        
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
    if (!canCreateNewBoard) {
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
      
      // Show completion toast for creating first moodboard
      showCompletionToast('moodboard');
      
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
        setActiveMoodBoard(updatedBoards[0]?.id || '');
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

  if (loading || moodBoardsLoading) {
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
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Mood Board Sidebar */}
            <MoodBoardSidebar
              moodBoards={moodBoards}
              selectedMoodBoard={activeMoodBoard}
              onSelectMoodBoard={setActiveMoodBoard}
              onNewBoard={() => {
                if (!canCreateNewBoard) {
                  setShowUpgradeModal(true);
                } else {
                  setShowNewBoardModal(true);
                }
              }}
              onEditBoard={editMoodBoard}
              onDeleteBoard={deleteMoodBoard}
              inlineEditingBoardId={inlineEditingBoardId}
              inlineEditingName={inlineEditingName}
              onInlineEditChange={setInlineEditingName}
              onSaveInlineEdit={saveInlineEdit}
              onCancelInlineEdit={cancelInlineEdit}
              userPlan={userPlan}
              isLoading={moodBoardsLoading}
              mobileViewMode={isMobile ? 'boards' : 'desktop'}
              onMobileBoardSelect={isMobile ? handleMobileBoardSelect : undefined}
              usedStorage={storageStats.usedStorage}
              totalStorage={storageStats.totalStorage}
              plan={storageStats.plan}
              onUpgrade={() => {
                // TODO: Implement upgrade modal
                showErrorToast('Upgrade your plan to get more storage!');
              }}
              showUpgradeBanner={isMobile && !canCreateNewBoard && showBoardLimitBanner}
              onDismissUpgradeBanner={() => setShowBoardLimitBanner(false)}
            />

            {/* Main Content Area - Mobile shows only boards list */}
            <div className={`unified-main-content ${isMobile ? 'mobile-boards-view' : ''}`}>
              {/* Mobile: Show message to select a board */}
              {isMobile && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <Heart className="w-16 h-16 mx-auto mb-4 text-[#AB9C95]" />
                    <h3 className="text-lg font-playfair font-medium text-[#332B42] mb-2">
                      Select a Mood Board
                    </h3>
                    <p className="text-sm text-[#7A7A7A] mb-4">
                      Choose a mood board from the sidebar to view and edit its content
                    </p>
                    <button
                      onClick={() => {
                        if (!canCreateNewBoard) {
                          setShowUpgradeModal(true);
                        } else {
                          setShowNewBoardModal(true);
                        }
                      }}
                      className="btn-primary flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Board
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop: Show unique content for /moodboards page */}
              {!isMobile && (
                <>
                  {/* Main Content Area */}
                  <div className="flex-1 overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full mb-2">
                      <div className="flex items-center w-full gap-4 px-4 py-3">
                        <h6 className="text-[#332B42] font-playfair font-medium">
                          Your Mood Boards
                        </h6>
                        <div className="flex-1"></div>
                        <button
                          onClick={() => {
                            if (!canCreateNewBoard) {
                              setShowUpgradeModal(true);
                            } else {
                              setShowNewBoardModal(true);
                            }
                          }}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Create New Board
                        </button>
                      </div>
                    </div>

                {/* Plan Limit Warning - positioned like todo page upgrade banner */}
                <AnimatePresence>
                  {!canCreateNewBoard && showBoardLimitBanner && (
                    <div className="px-4 pt-2">
                      <Banner
                        message={
                          <>
                            You've reached the limit of {userPlan.maxBoards} mood boards for your {userPlan.tier} plan.
                            <button onClick={() => setShowUpgradeModal(true)} className="ml-2 font-semibold underline">Upgrade to create more!</button>
                          </>
                        }
                        type="info"
                        onDismiss={() => setShowBoardLimitBanner(false)}
                      />
                    </div>
                  )}
                </AnimatePresence>

                    {/* Main Content */}
                    <div className="p-6">
                      {moodBoards.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-12">
                          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Palette className="w-12 h-12 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-[#332B42] mb-2">No mood boards yet</h3>
                          <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Create your first mood board to start organizing your wedding inspiration and ideas.
                          </p>
                          <button
                            onClick={() => {
                              if (!canCreateNewBoard) {
                                setShowUpgradeModal(true);
                              } else {
                                setShowNewBoardModal(true);
                              }
                            }}
                            className="btn-primary flex items-center gap-2 mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            Create Your First Board
                          </button>
                        </div>
                      ) : (
                        /* Boards Grid */
                        <div>
                          <div className="mb-6">
                            <h2 className="text-xl font-semibold text-[#332B42] mb-2">Your Mood Boards</h2>
                            <p className="text-gray-600">
                              Click on any board below to view and edit its content, or create a new one to get started.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {moodBoards.map((board) => (
                              <MoodBoardCard key={board.id} board={board} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
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
            description="Generating vibes from your image!\nPlease don't refresh"
            isVisible={generatingVibes}
            onComplete={() => {
              // Credit update event is already emitted in generateVibesFromImage
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
          />

          {/* Image upload progress */}
          <ImageUploadProgress
            uploadProgress={uploadProgress}
            onCancel={cancelUpload}
            isVisible={uploadingImage}
          />
    </div>
  );
}
