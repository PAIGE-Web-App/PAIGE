"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Edit3, Upload, Heart, Palette, Camera, X, Save, Plus } from "lucide-react";
import WeddingBanner from "../../components/WeddingBanner";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCustomToast } from "../../hooks/useCustomToast";

export default function InspirationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { daysLeft, userName, isLoading, handleSetWeddingDate } = useWeddingBanner(router);
  const { vibe, generatedVibes, vibeInputMethod } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
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

  // Initialize editing vibes when data loads
  useEffect(() => {
    if (vibe && generatedVibes) {
      setEditingVibes([...vibe, ...generatedVibes]);
    }
  }, [vibe, generatedVibes]);

  const vibeOptions = [
    'Intimate & cozy',
    'Big & bold',
    'Chic city affair',
    'Outdoor & natural',
    'Traditional & timeless',
    'Modern & minimal',
    'Destination dream',
    'Boho & Whimsical',
    'Glamorous & Luxe',
    'Vintage Romance',
    'Garden Party',
    'Beachy & Breezy',
    'Art Deco',
    'Festival-Inspired',
    'Cultural Fusion',
    'Eco-Friendly',
    'Fairytale',
    'Still figuring it out',
  ];

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        vibe: editingVibes.filter(v => vibeOptions.includes(v)),
        generatedVibes: editingVibes.filter(v => !vibeOptions.includes(v)),
      });
      
      showSuccessToast('Wedding vibe updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving vibe:', error);
      showErrorToast('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingVibes([...vibe, ...generatedVibes]);
    setIsEditing(false);
    setShowVibeInput(false);
    setNewVibe('');
  };

  const addVibe = (vibeToAdd: string) => {
    if (!editingVibes.includes(vibeToAdd)) {
      setEditingVibes([...editingVibes, vibeToAdd]);
    }
  };

  const removeVibe = (vibeToRemove: string) => {
    setEditingVibes(editingVibes.filter(v => v !== vibeToRemove));
  };

  const addCustomVibe = () => {
    if (newVibe.trim() && !editingVibes.includes(newVibe.trim())) {
      setEditingVibes([...editingVibes, newVibe.trim()]);
      setNewVibe('');
      setShowVibeInput(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVibesFromImage = async () => {
    if (!uploadedImage || !user) return;
    
    setGeneratingVibes(true);
    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      
      console.log('Uploading image for vibe generation...');
      const response = await fetch('/api/generate-vibes-from-image', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Response data type:', typeof data);
      console.log('Response data keys:', Object.keys(data));
      
      if (data.vibes && Array.isArray(data.vibes)) {
        // Add new vibes to the editing list
        const newVibes = data.vibes.filter((v: string) => !editingVibes.includes(v));
        setEditingVibes([...editingVibes, ...newVibes]);
        
        // Save the image preview and update vibe input method
        await updateDoc(doc(db, "users", user.uid), {
          vibeInputMethod: 'image',
        });
        
        showSuccessToast(`Generated ${newVibes.length} new vibes from your image!`);
        setShowImageUpload(false);
        setUploadedImage(null);
        setImagePreviewUrl(null);
      } else {
        const errorMessage = data.error || 'Failed to generate vibes from image';
        console.error('API Error:', errorMessage);
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Error generating vibes:', error);
              showErrorToast('Network error: Failed to generate vibes from image');
    } finally {
      setGeneratingVibes(false);
    }
  };

  const allVibes = [...vibe, ...generatedVibes];
  const hasVibes = allVibes.length > 0;

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
    <div className="min-h-screen bg-[#F3F2F0]">
      <WeddingBanner 
        daysLeft={daysLeft}
        userName={userName}
        isLoading={isLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container">
        {/* Header removed as requested */}

        {/* Your Wedding Vibe Block - now full width */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-[#A85C36]" />
                <h6>
                  Your Wedding Vibe
                </h6>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#A85C36] border border-[#A85C36] rounded-lg hover:bg-[#A85C36] hover:text-white transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Vibe
                </button>
              )}
            </div>

            {!hasVibes && !isEditing ? (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#332B42] mb-2">No vibe selected yet</h3>
                <p className="text-[#364257] mb-6">Start by selecting some vibes that resonate with your wedding vision.</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary px-6 py-2 rounded-lg font-medium"
                >
                  Choose Your Vibe
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Vibes */}
                <div>
                  <h3 className="text-lg font-medium text-[#332B42] mb-4">
                    {isEditing ? 'Edit Your Vibes' : 'Selected Vibes'}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {editingVibes.map((vibeItem, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`px-4 py-2 rounded-full border-2 font-medium text-sm ${
                          isEditing
                            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer'
                            : 'border-[#A85C36] bg-[#A85C36] text-white'
                        }`}
                        onClick={() => isEditing && removeVibe(vibeItem)}
                      >
                        <div className="flex items-center gap-2">
                          {vibeItem}
                          {isEditing && <X className="w-3 h-3" />}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Vibe Input Method Info */}
                {!isEditing && vibeInputMethod && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {vibeInputMethod === 'image' && <Camera className="w-4 h-4 text-[#A85C36]" />}
                      {vibeInputMethod === 'pills' && <Palette className="w-4 h-4 text-[#A85C36]" />}
                      {vibeInputMethod === 'pinterest' && <Upload className="w-4 h-4 text-[#A85C36]" />}
                      <span className="text-sm font-medium text-[#332B42]">
                        {vibeInputMethod === 'image' && 'Generated from inspiration image'}
                        {vibeInputMethod === 'pills' && 'Selected from popular vibes'}
                        {vibeInputMethod === 'pinterest' && 'Inspired by Pinterest'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Edit Controls */}
                {isEditing && (
                  <div className="space-y-4">
                    {/* Add from popular vibes */}
                    <div>
                      <h4 className="text-md font-medium text-[#332B42] mb-3">Add from popular vibes:</h4>
                      <div className="flex flex-wrap gap-2">
                        {vibeOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => addVibe(option)}
                            disabled={editingVibes.includes(option)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              editingVibes.includes(option)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#F3F2F0] text-[#332B42] hover:bg-[#A85C36] hover:text-white border border-[#AB9C95]'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add custom vibe */}
                    <div>
                      <h4 className="text-md font-medium text-[#332B42] mb-3">Add custom vibe:</h4>
                      {!showVibeInput ? (
                        <button
                          onClick={() => setShowVibeInput(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#A85C36] border border-[#A85C36] rounded-lg hover:bg-[#A85C36] hover:text-white transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Custom Vibe
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newVibe}
                            onChange={(e) => setNewVibe(e.target.value)}
                            placeholder="Enter your custom vibe..."
                            className="flex-1 px-3 py-2 border border-[#AB9C95] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                            onKeyPress={(e) => e.key === 'Enter' && addCustomVibe()}
                          />
                          <button
                            onClick={addCustomVibe}
                            disabled={!newVibe.trim()}
                            className="px-4 py-2 bg-[#A85C36] text-white rounded-lg text-sm font-medium hover:bg-[#8B4513] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowVibeInput(false);
                              setNewVibe('');
                            }}
                            className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Generate vibes from image */}
                    <div>
                      <h4 className="text-md font-medium text-[#332B42] mb-3">Generate vibes from image:</h4>
                      <button
                        onClick={() => setShowImageUpload(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#A85C36] border border-[#A85C36] rounded-lg hover:bg-[#A85C36] hover:text-white transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Upload Image & Generate Vibes
                      </button>
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-[#A85C36] text-white rounded-lg font-medium hover:bg-[#8B4513] disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-6 py-2 border border-[#AB9C95] text-[#332B42] rounded-lg font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-playfair font-semibold text-[#332B42] mb-4">
              Need More Inspiration?
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/settings?tab=wedding')}
                className="flex items-center gap-2 px-6 py-3 bg-[#A85C36] text-white rounded-lg font-medium hover:bg-[#8B4513] transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Wedding Details
              </button>
              <button
                onClick={() => router.push('/todo')}
                className="flex items-center gap-2 px-6 py-3 border border-[#A85C36] text-[#A85C36] rounded-lg font-medium hover:bg-[#A85C36] hover:text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Plan Your Wedding
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Upload Modal */}
      <AnimatePresence>
        {showImageUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-playfair font-semibold text-[#332B42]">
                  Upload Inspiration Image
                </h3>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-[#364257] mb-6">
                Upload a wedding inspiration image and we'll generate vibes that match your vision.
              </p>

              {!imagePreviewUrl ? (
                <div className="border-2 border-dashed border-[#AB9C95] rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-[#AB9C95] mx-auto mb-4" />
                  <p className="text-[#364257] mb-4">
                    Click to upload or drag and drop
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="btn-primary px-6 py-2 rounded-lg font-medium cursor-pointer inline-block"
                  >
                    Choose Image
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImagePreviewUrl(null);
                        setUploadedImage(null);
                      }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={generateVibesFromImage}
                      disabled={generatingVibes}
                      className="flex-1 btn-primary py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      {generatingVibes ? 'Generating Vibes...' : 'Generate Vibes'}
                    </button>
                    <button
                      onClick={() => setShowImageUpload(false)}
                      className="px-4 py-2 border border-[#AB9C95] text-[#332B42] rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 