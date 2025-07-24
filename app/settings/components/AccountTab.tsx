"use client";

import { useState } from "react";
import { User, Pencil, Trash2 } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../../lib/firebase";
import { toast } from "react-hot-toast";
import { validateEmail, validateName, addCacheBuster } from '../utils/profileValidation';
import AvatarUploadModal from './AvatarUploadModal';
import DeleteAccountModal from '../../../components/DeleteAccountModal';
import UpgradePlanModal from '../../../components/UpgradePlanModal';
import WeddingPlannerSearchInput from '../../../components/WeddingPlannerSearchInput';
import PlannerCard from '../../../components/PlannerCard';
import { CircleArrowUp } from 'lucide-react';

interface AccountTabProps {
  user: any;
  profileImageUrl: string | null;
  setProfileImageUrl: (url: string) => void;
  updateUser: (data: any) => Promise<void>;
  saving: boolean;
  onSave: () => Promise<void>;
  email: string;
  userName: string;
  setUserName: (name: string) => void;
  partnerName: string;
  setPartnerName: (name: string) => void;
  partnerEmail: string;
  setPartnerEmail: (email: string) => void;
  plannerName: string;
  setPlannerName: (name: string) => void;
  plannerEmail: string;
  setPlannerEmail: (email: string) => void;
  // Wedding Planner state (for AccountTab only)
  selectedPlannerMetadata: any;
  setSelectedPlannerMetadata: (metadata: any) => void;
  plannerSearch: string;
  setPlannerSearch: (search: string) => void;
  hasUnsavedChanges: boolean;
}

export default function AccountTab({ 
  user, 
  profileImageUrl, 
  setProfileImageUrl, 
  updateUser, 
  saving, 
  onSave,
  email,
  userName,
  setUserName,
  partnerName,
  setPartnerName,
  partnerEmail,
  setPartnerEmail,
  plannerName,
  setPlannerName,
  plannerEmail,
  setPlannerEmail,
  // Wedding Planner state (for AccountTab only)
  selectedPlannerMetadata,
  setSelectedPlannerMetadata,
  plannerSearch,
  setPlannerSearch,
  hasUnsavedChanges,
}: AccountTabProps) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userNameError, setUserNameError] = useState("");
  const [partnerNameError, setPartnerNameError] = useState("");

  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com';

  // Check if user has premium features (check if partner/planner names are set up)
  const hasPremiumFeatures = () => {
    return (partnerName && partnerName.trim()) || (plannerName && plannerName.trim());
  };

  // Helper to capitalize each word
  const capitalizeWords = (str: string) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserName = capitalizeWords(e.target.value);
    setUserName(newUserName);
    const error = validateName(newUserName, "Your full name");
    setUserNameError(error);
  };

  const handleUserNameBlur = () => {
    const error = validateName(userName, "Your full name");
    setUserNameError(error);
  };

  const handlePartnerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartnerName = capitalizeWords(e.target.value);
    setPartnerName(newPartnerName);
    const error = validateName(newPartnerName, "Your partner's name");
    setPartnerNameError(error);
  };

  const handlePartnerNameBlur = () => {
    const error = validateName(partnerName, "Your partner's name");
    setPartnerNameError(error);
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const avatarRef = storageRef(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      // Save to Firestore so it persists across reloads
      await updateDoc(doc(db, "users", user.uid), { profileImageUrl: downloadURL });
      setProfileImageUrl(downloadURL);
      await updateUser({ profileImageUrl: downloadURL });
      toast.success("Profile image updated successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload profile image.");
    }
  };

  const handleDeleteAccount = async (reason: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          reason: reason
        }),
      });

      if (response.ok) {
        toast.success('Account deleted successfully');
        // Sign out the user
        const auth = getAuth();
        await auth.signOut();
        // Redirect to login page
        window.location.href = '/login';
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Account Details Container */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h5 className="mb-6">Account Details</h5>
          <div className="flex flex-col items-center mb-4">
            <div
              className="w-16 h-16 rounded-full mb-2 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: '#7D7B7B' }}
            >
              {profileImageUrl ? (
                <img
                  key={addCacheBuster(profileImageUrl) || ''}
                  src={addCacheBuster(profileImageUrl) || ''}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = ""; }}
                />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <button 
              className="text-xs text-[#A85C36] underline mb-2 flex items-center gap-1" 
              onClick={() => setShowAvatarModal(true)}
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-work-sans text-[#332B42] mb-1">Email Address*</label>
            {isGoogleUser ? (
              <div className="flex items-center gap-2 bg-[#F3F2F0] px-3 py-2 rounded w-full">
                <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" title="Signed up with Google" />
                <span className="text-sm text-[#332B42] break-all">{email}</span>
              </div>
            ) : (
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-3 py-2 border rounded bg-[#F3F2F0] text-sm text-[#7A7A7A] focus:outline-none"
              />
            )}
          </div>
          <div className="mb-4">
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Full Name*</label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={handleUserNameChange}
                onBlur={handleUserNameBlur}
                className="w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] text-[#332B42] text-transform: capitalize;"
                autoComplete="name"
                disabled={saving}
              />
              {userNameError && <p className="text-red-500 text-xs mt-1">{userNameError}</p>}
          </div>
          {!isGoogleUser && (
            <div className="mb-4">
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Password</label>
              <button
                className="text-xs text-[#A85C36] underline hover:opacity-80 mt-1 text-left"
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error("No email found for this account.");
                    return;
                  }
                  try {
                    const auth = getAuth();
                    await sendPasswordResetEmail(auth, email);
                    toast.success(`Password reset email sent to ${email}`);
                  } catch (err) {
                    toast.error("Failed to send password reset email.");
                  }
                }}
              >
                Reset Password
              </button>
            </div>
          )}
        </div>
          
        {/* Collaboration Banner */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CircleArrowUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Invite your Partner and Wedding Planner</h4>
              <p className="text-xs opacity-90">Maximize your collaboration and get everything done in one space. Upgrade for maximum collaboration features and more!</p>
            </div>
          </div>
        </div>

        {/* Partner Profile Container */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h5 className="mb-6">Partner Profile</h5>
          <p className="text-xs text-gray-600 mb-4">Manage your partner's information for @mention notifications and collaboration.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Partner Name</label>
              <input
                type="text"
                id="partnerName"
                value={partnerName}
                onChange={handlePartnerNameChange}
                onBlur={handlePartnerNameBlur}
                className="w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] text-[#332B42] text-transform: capitalize;"
                autoComplete="name"
                disabled={saving}
              />
              {partnerNameError && <p className="text-red-500 text-xs mt-1">{partnerNameError}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Partner Email</label>
              <input 
                type="email" 
                value={partnerEmail || ''} 
                onChange={e => setPartnerEmail(e.target.value)} 
                className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" 
                placeholder="Enter your partner's email"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Your partner will receive @mention notifications via email</p>
            </div>
          </div>
        </div>

        {/* Wedding Planner Profile Container */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h5 className="mb-6">Wedding Planner Profile</h5>
          <p className="text-xs text-gray-600 mb-4">Manage your wedding planner's information for @mention notifications and collaboration.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Wedding Planner Name</label>
              <input 
                type="text" 
                value={plannerName || ''} 
                onChange={e => setPlannerName(e.target.value)} 
                className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" 
                placeholder="Enter your wedding planner's name"
                disabled={saving}
              />
            </div>
            
            <div>
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Wedding Planner Email</label>
              <input 
                type="email" 
                value={plannerEmail || ''} 
                onChange={e => setPlannerEmail(e.target.value)} 
                className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" 
                placeholder="Enter your wedding planner's email"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">Your wedding planner will receive @mention notifications via email</p>
            </div>

            {/* Wedding Planner Search */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Search for your Wedding Planner via Google</label>
              <p className="text-xs text-gray-500 mb-2">Linking a Wedding Planner here will add the Planner to your Vendors</p>
              <WeddingPlannerSearchInput
                value={plannerSearch}
                onChange={(value) => {
                  setPlannerSearch(value);
                }}
                setPlannerMetadata={(planner) => {
                  setSelectedPlannerMetadata(planner);
                  if (planner?.name) {
                    setPlannerName(planner.name);
                  }
                }}
                placeholder="Search for wedding planners..."
                disabled={saving}
              />
              {selectedPlannerMetadata && (
                <div className="mt-4">
                  <PlannerCard
                    planner={selectedPlannerMetadata}
                                    onDelete={() => {
                  setSelectedPlannerMetadata(null);
                  setPlannerSearch("");
                  setPlannerName("");
                }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone Container */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h5 className="mb-6">Danger Zone</h5>
            <button
              className="text-xs text-red-600 underline hover:opacity-80 mt-1 text-left flex items-center gap-1"
              type="button"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-3 h-3" />
              Delete Account
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
          </div>

        {/* Save Changes Button */}
        <div className="flex justify-end items-center">
            <button
              className="btn-primary px-8 py-2 rounded font-semibold text-base disabled:opacity-60"
              onClick={onSave}
              disabled={saving || !hasUnsavedChanges || !!userNameError || !!partnerNameError}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
        </div>
      </div>
      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onUpload={handleAvatarUpload}
      />
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteAccount={handleDeleteAccount}
        isDeleting={isDeleting}
      />
      {showUpgradeModal && (
        <UpgradePlanModal
          reason="collaboration"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
} 