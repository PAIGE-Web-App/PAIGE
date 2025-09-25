"use client";

import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, use, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Edit3, Upload, Heart, Palette, Camera, X, Save, Plus, Star, MapPin, Flag, MoreHorizontal, Trash2, ArrowLeft } from "lucide-react";
import WeddingBanner from "../../../components/WeddingBanner";
import { useUserProfileData } from "../../../hooks/useUserProfileData";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useCustomToast } from "../../../hooks/useCustomToast";
import { useMoodBoardStorage } from "../../../hooks/useMoodBoardStorage";
import VibePill from "../../../components/VibePill";
import { useCredits } from "../../../contexts/CreditContext";
import { useMoodBoards } from "../../../contexts/MoodBoardsContext";
import { useImageUpload } from "../../../hooks/useImageUpload";
import ImageUploadProgress from "../../../components/inspiration/ImageUploadProgress";

// Import new components
import PinterestBanner from "../../../components/inspiration/PinterestBanner";
import MoodBoardContent from "../../../components/inspiration/MoodBoardContent";
import NewBoardModal from "../../../components/inspiration/NewBoardModal";
import VibeEditModal from "../../../components/inspiration/VibeEditModal";
import ImageEditModal from "../../../components/inspiration/ImageEditModal";
import UpgradePlanModal from "../../../components/UpgradePlanModal";
import Banner from "../../../components/Banner";
import BadgeCount from "../../../components/BadgeCount";
import MoodBoardSkeleton from "../../../components/inspiration/MoodBoardSkeleton";
import VibePreviewModal from "../../../components/inspiration/VibePreviewModal";
import VibeSection from "../../../components/inspiration/VibeSection";
import LoadingBar from "../../../components/LoadingBar";
import MoodBoardSidebar from "../../../components/inspiration/MoodBoardSidebar";

// Import types and utilities
import { MoodBoard, UserPlan, PLAN_LIMITS, BOARD_TEMPLATES } from "../../../types/inspiration";
import { 
  getActiveBoard, 
  addImageToBoard, 
  removeImageFromBoard,
  updateBoardVibes,
  createNewBoard,
  uploadImageToStorage,
  cleanupBase64Images
} from "../../../utils/moodBoardUtils";
import { creditEventEmitter } from "../../../utils/creditEventEmitter";
import NotEnoughCreditsModal from "../../../components/NotEnoughCreditsModal";
import { COUPLE_SUBSCRIPTION_CREDITS } from "../../../types/credits";

interface MoodBoardPageProps {
  params: Promise<{
    boardId: string;
  }>;
}

export default function MoodBoardPage({ params }: MoodBoardPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { vibe, generatedVibes, vibeInputMethod, weddingLocation } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { credits, refreshCredits } = useCredits();
  
  // Unwrap params Promise
  const resolvedParams = use(params);
  const boardId = resolvedParams.boardId;
  
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
  const [generationType, setGenerationType] = useState<'single' | 'bulk' | null>(null);

  const [showPinterestSearch, setShowPinterestSearch] = useState(false);
  const [pinterestSearchQuery, setPinterestSearchQuery] = useState('');
  const [pinterestResults, setPinterestResults] = useState<any[]>([]);
  const [searchingPinterest, setSearchingPinterest] = useState(false);
  const [pinterestBannerExpanded, setPinterestBannerExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // State for newly added vibes (green flash animation)
  const [newlyAddedVibes, setNewlyAddedVibes] = useState<Set<string>>(new Set());
  
  // Clear newly added vibes after animation duration
  useEffect(() => {
    if (newlyAddedVibes.size > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedVibes(new Set());
      }, 2000); // Clear after 2 seconds for better visibility
      return () => clearTimeout(timer);
    }
  }, [newlyAddedVibes]);
  
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
  const [activeMoodBoard, setActiveMoodBoard] = useState<string>(boardId);
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
  const [showImagesActionsMenu, setShowImagesActionsMenu] = useState(false);
  const [showHeaderActionsMenu, setShowHeaderActionsMenu] = useState(false);
  const headerDropdownRef = useRef<HTMLDivElement>(null);
  const imagesDropdownRef = useRef<HTMLDivElement>(null);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 1024;
      setIsMobile(isMobileWidth);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // handleMobileBoardSelect is now defined as useCallback below

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imagesDropdownRef.current && !imagesDropdownRef.current.contains(event.target as Node)) {
        setShowImagesActionsMenu(false);
      }
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target as Node)) {
        setShowHeaderActionsMenu(false);
      }
    };

    if (showImagesActionsMenu || showHeaderActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImagesActionsMenu, showHeaderActionsMenu]);

  // Handle upload from actions menu
  const handleUploadFromMenu = () => {
    // Try desktop upload first, then mobile
    const desktopInput = document.getElementById('mood-board-upload') as HTMLInputElement;
    const mobileInput = document.getElementById('mood-board-upload-mobile') as HTMLInputElement;
    
    if (desktopInput) {
      desktopInput.click();
    } else if (mobileInput) {
      mobileInput.click();
    }
    setShowImagesActionsMenu(false);
  };

  // Storage tracking for mood board images
  const storageStats = useMoodBoardStorage(moodBoards, userPlan.tier);

  // Memoized expensive calculations
  const canCreateNewBoard = useMemo(() => {
    return moodBoards.length < userPlan.maxBoards;
  }, [moodBoards.length, userPlan.maxBoards]);

  const activeBoard = useMemo(() => {
    return getActiveBoard(moodBoards, activeMoodBoard);
  }, [moodBoards, activeMoodBoard]);

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

  // Data is now loaded by the shared context - no need for local loading
  // Set the active board to the one from the URL when data is loaded
  useEffect(() => {
    if (moodBoards.length > 0) {
      setActiveMoodBoard(boardId);
      
      // Check if the requested board exists
      const requestedBoard = moodBoards.find(board => board.id === boardId);
      if (!requestedBoard) {
        // Board not found, redirect to main mood boards page
        router.push('/moodboards');
      }
    }
  }, [moodBoards, boardId, router]);

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

  // Initialize editing vibes when active board changes
  useEffect(() => {
    if (activeBoard && activeBoard.vibes) {
      setEditingVibes([...activeBoard.vibes]);
    } else {
      setEditingVibes([]);
    }
  }, [activeBoard]);

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

  // Helper functions (canCreateNewBoard is now memoized above)

  const handleSave = async () => {
    if (!user || !activeBoard) return;
    
    setSaving(true);
    try {
      // Find newly added vibes by comparing with existing vibes
      const existingVibes = activeBoard.vibes || [];
      const newVibes = editingVibes.filter(vibe => !existingVibes.includes(vibe));
      
      // Update the active board's vibes
      const updatedMoodBoards = updateBoardVibes(moodBoards, activeMoodBoard, editingVibes);
      setMoodBoards(updatedMoodBoards);
      
      // Track newly added vibes for green flash animation
      if (newVibes.length > 0) {
        setNewlyAddedVibes(new Set(newVibes));
      }
      
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
    setGenerationType('single');
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
        
        // Track newly added vibes for green flash animation
        setNewlyAddedVibes(new Set(newVibes));
        
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
      setGenerationType(null);
    }
  };

  const generateVibesFromAllImages = async (board: MoodBoard) => {
    if (!user || !board.images || board.images.length === 0) return;
    
    setGeneratingVibes(true);
    setGenerationType('bulk');
    try {
      // Extract all image URLs
      const imageUrls = board.images.map(image => image.url).filter(Boolean);
      
      if (imageUrls.length === 0) {
        showErrorToast('No valid images found to process');
        return;
      }
      
      // Use the optimized bulk API (5 credits total for all images)
      const response = await fetch('/api/generate-bulk-vibes-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
        body: JSON.stringify({
          imageUrls: imageUrls,
          moodBoardId: activeMoodBoard,
        }),
      });
      
      const data = await response.json();
      
      if (data.vibes && Array.isArray(data.vibes)) {
        // Filter out vibes that already exist in the board
        const newVibes = data.vibes.filter((v: string) => !board.vibes.includes(v));
        
        if (newVibes.length > 0) {
          // Update the mood board with new vibes
          const updatedBoards = moodBoards.map(board => 
            board.id === activeMoodBoard 
              ? { ...board, vibes: [...board.vibes, ...newVibes] }
              : board
          );
          setMoodBoards(updatedBoards);
          
          // Track newly added vibes for green flash animation
          setNewlyAddedVibes(new Set(newVibes));
          
          showSuccessToast(`Generated ${newVibes.length} new vibes from ${data.imagesProcessed} images!`);
        } else {
          showSuccessToast('No new vibes generated - all vibes already exist in this board');
        }
      } else {
        showErrorToast(data.error || 'Failed to generate vibes from images');
      }
    } catch (error) {
      console.error('Error generating vibes from all images:', error);
      
      // Check if it's a credit-related error
      if (error instanceof Error && (error.message.includes('Not enough credits') || error.message.includes('Insufficient credits'))) {
        setCreditModalData({
          requiredCredits: 5, // Bulk vibe generation costs 5 credits total
          currentCredits: (userCredits.monthlyCredits || 0) + (userCredits.rolloverCredits || 0),
          feature: 'bulk_vibe_generation'
        });
        setShowNotEnoughCreditsModal(true);
        return;
      }
      
      showErrorToast('Failed to generate vibes from images. Please try again.');
    } finally {
      setGeneratingVibes(false);
      setGenerationType(null);
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

  // Auth is handled by middleware - no need for client-side redirects

  // Simplified loading - show page immediately, load data progressively
  // Removed blocking loading state - let middleware handle auth redirects

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full lg:gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Mood Board Sidebar */}
            <MoodBoardSidebar
              moodBoards={moodBoards}
              selectedMoodBoard={activeMoodBoard}
              onSelectMoodBoard={setActiveMoodBoard}
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
              mobileViewMode={isMobile ? 'boards' : undefined}
              onMobileBoardSelect={isMobile ? handleMobileBoardSelect : undefined}
              usedStorage={storageStats.usedStorage}
              totalStorage={storageStats.totalStorage}
              plan={storageStats.plan}
              onUpgrade={() => {
                setShowUpgradeModal(true);
              }}
              showUpgradeBanner={(() => {
                const canCreate = canCreateNewBoard;
                const showBanner = showBoardLimitBanner;
                return isMobile && !canCreate && showBanner;
              })()}
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
                      onClick={() => setShowNewBoardModal(true)}
                      className="btn-primary flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Board
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop: Show full content */}
              {!isMobile && (
                <>
                  {/* Main Content Area */}
                  <div className="flex-1 overflow-hidden">
                {/* Wedding Day Header - Desktop only - styled like todo page */}
                <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full mb-2">
                  <div className="flex items-center w-full gap-4 px-4 py-3">
                    {/* Left: Board Name */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <h6 className="truncate max-w-[300px] text-[#332B42] font-playfair font-medium">
                        {getActiveBoard(moodBoards, activeMoodBoard)?.name || 'Wedding Day'}
                      </h6>
                    </div>
                    
                    {/* Middle: Spacer */}
                    <div className="flex-1 min-w-0"></div>
                    
                    {/* Right: Action Buttons */}
                    <div className="flex-shrink-0 flex justify-end items-center gap-4 ml-auto">
                      {/* Pinterest Integration Button */}
                      <PinterestBanner 
                        isExpanded={pinterestBannerExpanded}
                        onToggle={() => setPinterestBannerExpanded(!pinterestBannerExpanded)}
                      />
                      
                      {/* Three-dot actions menu */}
                      <div className="relative" ref={headerDropdownRef}>
                        <button
                          onClick={() => setShowHeaderActionsMenu(!showHeaderActionsMenu)}
                          className="p-1 hover:bg-gray-100 rounded-full"
                          title="More options"
                        >
                          <MoreHorizontal size={16} className="text-gray-500" />
                        </button>
                        
                        {/* Dropdown menu */}
                        <AnimatePresence>
                          {showHeaderActionsMenu && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleUploadFromMenu();
                                    setShowHeaderActionsMenu(false);
                                  }}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                                >
                                  <Upload className="w-4 h-4 mr-2 text-[#364257]" />
                                  Upload Images
                                </button>
                                {getActiveBoard(moodBoards, activeMoodBoard)?.images && getActiveBoard(moodBoards, activeMoodBoard)!.images.length >= 2 && (
                                  <button
                                    onClick={() => {
                                      const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
                                      if (activeBoard) {
                                        generateVibesFromAllImages(activeBoard);
                                      }
                                      setShowHeaderActionsMenu(false);
                                    }}
                                    className="flex items-start w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Sparkles className="w-4 h-4 mr-2 text-[#805d93] flex-shrink-0 mt-0.5" />
                                    <span className="leading-tight">Generate Moods from All Images (5 Credits)</span>
                                  </button>
                                )}
                                {getActiveBoard(moodBoards, activeMoodBoard)?.name !== 'Wedding Day' && (
                                  <button
                                    onClick={() => {
                                      deleteMoodBoard(activeMoodBoard);
                                      setShowHeaderActionsMenu(false);
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
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

                {/* Moods Section */}
                {getActiveBoard(moodBoards, activeMoodBoard) && (
                  <div className="px-4 py-4">
                    {/* Moods Title with Edit Button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h6 className="mb-0">Moods</h6>
                        <BadgeCount count={getActiveBoard(moodBoards, activeMoodBoard)?.vibes?.length || 0} />
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 gap-1"
                        aria-label="Edit moods"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                    
                    {/* Description */}
                    <div className="text-sm text-[#7A7A7A] leading-relaxed mb-4">
                      Here are the moods that you've added or generated from images for this board. The moods below will be used to help personalize content{' '}
                      <button
                        onClick={() => setShowVibePreviewModal(true)}
                        className="text-[#805d93] hover:text-[#6a4d7a] underline font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        see it in action
                      </button>
                    </div>
                    
                    {/* Mood Pills - Moved here with 0 left/right padding */}
                    <div className="px-0">
                      <VibeSection 
                        board={getActiveBoard(moodBoards, activeMoodBoard)!}
                        weddingLocation={weddingLocation || undefined}
                        isEditing={isEditing}
                        onEdit={() => setIsEditing(true)}
                        newlyAddedVibes={newlyAddedVibes}
                      />
                    </div>
                  </div>
                )}
            
                {/* Images Section - Show skeleton only for dynamic content */}
                {moodBoardsLoading ? (
                  <MoodBoardSkeleton />
                ) : (
                  getActiveBoard(moodBoards, activeMoodBoard) && (
                    <div className="bg-white border border-gray-100 rounded-lg p-2">
                      {/* Images Title with Extract Button and Actions Menu */}
                      <div className="px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h6 className="mb-0">Images</h6>
                            <BadgeCount count={getActiveBoard(moodBoards, activeMoodBoard)?.images?.length || 0} />
                          </div>
                          <div className="flex items-center gap-2">
                            {getActiveBoard(moodBoards, activeMoodBoard)?.images && getActiveBoard(moodBoards, activeMoodBoard)!.images.length >= 2 && (
                              <button
                                onClick={() => {
                                  const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
                                  if (activeBoard) {
                                    generateVibesFromAllImages(activeBoard);
                                  }
                                }}
                                className="text-xs text-[#F3F2F0] border border-[#805d93] bg-[#805d93] rounded-[5px] px-2 py-1 hover:bg-[#6a4d7a] hover:border-[#6a4d7a] flex items-center h-7 gap-1"
                                aria-label="Generate moods from all images"
                              >
                                <Sparkles className="w-3 h-3" />
                                Generate Moods from All (5 Credits)
                              </button>
                            )}
                            
                            {/* Three-dot actions menu */}
                            <div className="relative" ref={imagesDropdownRef}>
                              <button
                                onClick={() => setShowImagesActionsMenu(!showImagesActionsMenu)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                                title="More options"
                              >
                                <MoreHorizontal size={16} className="text-gray-500" />
                              </button>
                              
                              {/* Dropdown menu */}
                              <AnimatePresence>
                                {showImagesActionsMenu && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={handleUploadFromMenu}
                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                                      >
                                        <Upload className="w-4 h-4 mr-2 text-[#364257]" />
                                        Upload Images
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                        
                        {/* Images Description */}
                        <div className="text-sm text-[#7A7A7A] leading-relaxed mb-4">
                          Upload images below to build out your moods! You can generate vibes from individual images for 2 credits each or process all images at once for 5 credits total.
                        </div>
                      </div>
                      
                      <div className="lg:overflow-y-auto lg:h-[420px]">
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
                        canCreateMoreBoards={moodBoards.length < userPlan.maxBoards}
                      />
                      </div>
                    </div>
                  )
                )}
                  </div>
                </>
              )}
            </div>
          </main>

          {/* Mobile Content - Full width, no sidebar */}
          <div className="lg:hidden flex flex-col h-full">
            {/* Mobile Header with Back Button - styled like Todo page */}
            <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full flex-shrink-0">
              <div className="flex items-center p-4 pb-2 border-b border-[#E0DBD7]">
                <button
                  onClick={() => router.push('/moodboards')}
                  className="lg:hidden p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
                  aria-label="Back to boards"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm lg:text-base font-playfair font-medium text-[#332B42] truncate">
                    {getActiveBoard(moodBoards, activeMoodBoard)?.name || 'Mood Board'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden lg:block">
                    <PinterestBanner 
                      isExpanded={pinterestBannerExpanded}
                      onToggle={() => setPinterestBannerExpanded(!pinterestBannerExpanded)}
                    />
                  </div>
                  
                  {/* Three-dot actions menu */}
                  <div className="relative" ref={headerDropdownRef}>
                    <button
                      onClick={() => setShowHeaderActionsMenu(!showHeaderActionsMenu)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                      title="More options"
                    >
                      <MoreHorizontal size={16} className="text-gray-500" />
                    </button>
                    
                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {showHeaderActionsMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                handleUploadFromMenu();
                                setShowHeaderActionsMenu(false);
                              }}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                            >
                              <Upload className="w-4 h-4 mr-2 text-[#364257]" />
                              Upload Images
                            </button>
                            {getActiveBoard(moodBoards, activeMoodBoard)?.images && getActiveBoard(moodBoards, activeMoodBoard)!.images.length >= 2 && (
                              <button
                                onClick={() => {
                                  const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
                                  if (activeBoard) {
                                    generateVibesFromAllImages(activeBoard);
                                  }
                                  setShowHeaderActionsMenu(false);
                                }}
                                className="flex items-start w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Sparkles className="w-4 h-4 mr-2 text-[#805d93] flex-shrink-0 mt-0.5" />
                                <span className="leading-tight">Generate Moods from All Images (5 Credits)</span>
                              </button>
                            )}
                            {getActiveBoard(moodBoards, activeMoodBoard)?.name !== 'Wedding Day' && (
                              <button
                                onClick={() => {
                                  deleteMoodBoard(activeMoodBoard);
                                  setShowHeaderActionsMenu(false);
                                }}
                                className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-white">

              {/* Moods Section */}
              {getActiveBoard(moodBoards, activeMoodBoard) && (
                <div className="px-4 py-4">
                  {/* Moods Title with Edit Button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h6 className="mb-0">Moods</h6>
                      <BadgeCount count={getActiveBoard(moodBoards, activeMoodBoard)?.vibes?.length || 0} />
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 gap-1"
                      aria-label="Edit moods"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                  
                  {/* Description */}
                  <div className="text-sm text-[#7A7A7A] leading-relaxed mb-4">
                    Here are the moods that you've added or generated from images for this board. The moods below will be used to help personalize content{' '}
                    <button
                      onClick={() => setShowVibePreviewModal(true)}
                      className="text-[#805d93] hover:text-[#6a4d7a] underline font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      see it in action
                    </button>
                  </div>
                  
                  {/* Mood Pills */}
                  <div className="px-0">
                    <VibeSection 
                      board={getActiveBoard(moodBoards, activeMoodBoard)!}
                      weddingLocation={weddingLocation || undefined}
                      isEditing={isEditing}
                      onEdit={() => setIsEditing(true)}
                      newlyAddedVibes={newlyAddedVibes}
                    />
                  </div>
                </div>
              )}
          
              {/* Section Separator - Mobile only */}
              <div className="lg:hidden border-t border-[#E0DBD7] mx-4"></div>
          
              {/* Images Section */}
              {moodBoardsLoading ? (
                <MoodBoardSkeleton />
              ) : (
                getActiveBoard(moodBoards, activeMoodBoard) && (
                  <div>
                    {/* Images Title with Extract Button and Actions Menu */}
                    <div className="px-4 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h6 className="mb-0">Images</h6>
                          <BadgeCount count={getActiveBoard(moodBoards, activeMoodBoard)?.images?.length || 0} />
                        </div>
                        <div className="flex items-center gap-2">
                          {getActiveBoard(moodBoards, activeMoodBoard)?.images && getActiveBoard(moodBoards, activeMoodBoard)!.images.length >= 2 && (
                            <button
                              onClick={() => {
                                const activeBoard = getActiveBoard(moodBoards, activeMoodBoard);
                                if (activeBoard) {
                                  generateVibesFromAllImages(activeBoard);
                                }
                              }}
                              className="text-xs text-[#F3F2F0] border border-[#805d93] bg-[#805d93] rounded-[5px] px-2 py-1 hover:bg-[#6a4d7a] hover:border-[#6a4d7a] flex items-center h-7 gap-1"
                              aria-label="Generate moods from all images"
                            >
                              <Sparkles className="w-3 h-3" />
                              Generate Moods from All (5 Credits)
                            </button>
                          )}
                          
                          {/* Three-dot actions menu */}
                          <div className="relative" ref={imagesDropdownRef}>
                            <button
                              onClick={() => setShowImagesActionsMenu(!showImagesActionsMenu)}
                              className="p-1 hover:bg-gray-100 rounded-full"
                              title="More options"
                            >
                              <MoreHorizontal size={16} className="text-gray-500" />
                            </button>
                            
                            {/* Dropdown menu */}
                            <AnimatePresence>
                              {showImagesActionsMenu && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                  className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                                >
                                  <div className="py-1">
                                    <button
                                      onClick={handleUploadFromMenu}
                                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                                    >
                                      <Upload className="w-4 h-4 mr-2 text-[#364257]" />
                                      Upload Images
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      
                      {/* Images Description */}
                      <div className="text-sm text-[#7A7A7A] leading-relaxed mb-4">
                        Upload images below to build out your moods! You can generate vibes from individual images for 2 credits each or process all images at once for 5 credits total.
                      </div>
                    </div>
                    
                    {/* Images Content - No padding for edge-to-edge images */}
                    <div>
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
                        canCreateMoreBoards={moodBoards.length < userPlan.maxBoards}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
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
            description={
              generationType === 'single' 
                ? "Generating Moods from Image!\nPlease don't refresh"
                : generationType === 'bulk'
                ? "Generating Moods from your Images!\nPlease don't refresh"
                : "Generating moods..."
            }
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
