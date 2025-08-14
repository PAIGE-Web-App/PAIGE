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

// Import new components
import PinterestBanner from "../../components/inspiration/PinterestBanner";
import MoodBoardTabs from "../../components/inspiration/MoodBoardTabs";
import MoodBoardContent from "../../components/inspiration/MoodBoardContent";
import NewBoardModal from "../../components/inspiration/NewBoardModal";
import VibeEditModal from "../../components/inspiration/VibeEditModal";
import StorageProgressBar from "../../components/StorageProgressBar";
import UpgradePlanModal from "../../components/UpgradePlanModal";
import Banner from "../../components/Banner";

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

export default function MoodBoardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { daysLeft, userName, isLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { vibe, generatedVibes, vibeInputMethod, weddingLocation } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // User plan (for now, default to free - you can integrate with your billing system)
  const userPlan = PLAN_LIMITS.free;
  
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
  
  // Storage tracking for mood board images
  const storageStats = useMoodBoardStorage(moodBoards, userPlan.tier);

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
          
          // Migration: Check if we need to migrate existing vibes to wedding-day board
          const existingVibes = [...(data.vibe || []), ...(data.generatedVibes || [])];
          const existingVibeInputMethod = data.vibeInputMethod || 'pills';
          
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
          } else {
            // Mood boards exist, but check if wedding-day board needs vibes migrated
            const weddingDayBoard = savedMoodBoards.find(board => board.id === 'wedding-day');
            if (weddingDayBoard && existingVibes.length > 0 && weddingDayBoard.vibes.length === 0) {
              // Migrate vibes to existing wedding-day board
              weddingDayBoard.vibes = existingVibes;
              weddingDayBoard.vibeInputMethod = existingVibeInputMethod;
              console.log('Migrated existing vibes to Wedding Day board');
            }
          }
          
          // Save the migrated data to Firestore if we made changes
          if (existingVibes.length > 0) {
            try {
              await updateDoc(doc(db, "users", user.uid), {
                moodBoards: savedMoodBoards
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
        await updateDoc(doc(db, "users", user.uid), {
          moodBoards: moodBoards
        });
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
          const updatedBoards = addImageToBoard(moodBoards, activeMoodBoard, imageUrl);
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
      
      // Handle both File objects and image URLs
      if (imageToUse instanceof File) {
        formData.append('image', imageToUse);
      } else if (typeof imageToUse === 'string') {
        // Convert image URL to blob for API
        const response = await fetch(imageToUse);
        const blob = await response.blob();
        formData.append('image', blob, 'image.jpg');
      }
      
      console.log('Uploading image for vibe generation...');
      const response = await fetch('/api/generate-vibes-from-image', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.vibes && Array.isArray(data.vibes)) {
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
        
        showSuccessToast(`Generated ${newVibes.length} new vibes from your image!`);
        setShowImageUpload(false);
        setUploadedImage(null);
        setImagePreviewUrl(null);
      } else {
        const errorMessage = data.error || 'Failed to generate vibes from image';
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Error generating vibes:', error);
      showErrorToast('Network error: Failed to generate vibes from image');
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
      setEditingVibes([...editingVibes, newVibe.trim()]);
      setNewVibe('');
      setShowVibeInput(false);
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
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              {/* Left side: Header and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-5 h-5 text-[#A85C36]" />
                  <h5>Mood Boards</h5>
                </div>
                <p className="text-sm text-[#364257] mb-2">
                  Create mood boards with vibes that train Paige to write more curated content when reaching out to vendors.
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#A85C36]" />
                  <a href="#" className="text-[#A85C36] hover:text-[#8B4513] text-sm font-medium transition-colors">
                    See it in action
                  </a>
                </div>
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
          <div className="border-b border-gray-200 mb-2"></div>

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
            
            {/* Mood Board Content */}
            {getActiveBoard(moodBoards, activeMoodBoard) && (
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
                  onChooseVibe={() => setIsEditing(true)}
                  onEditVibes={() => setIsEditing(true)}
                  onEditBoardName={editMoodBoard}
                  onDeleteBoard={deleteMoodBoard}
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
        </div>
      </div>
  );
}
