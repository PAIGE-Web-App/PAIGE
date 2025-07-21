"use client";

import { useState } from "react";
import { User, Pencil, Trash2 } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage } from "../../../lib/firebase";
import { db } from "../../../lib/firebase";
import { toast } from "react-hot-toast";
import { validateEmail, validateName, addCacheBuster } from '../utils/profileValidation';
import AvatarUploadModal from './AvatarUploadModal';
import DeleteAccountModal from '../../../components/DeleteAccountModal';

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
  hasUnsavedChanges,
}: AccountTabProps) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userNameError, setUserNameError] = useState("");
  const [partnerNameError, setPartnerNameError] = useState("");

  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com';

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
      <div className="flex gap-8 pb-8">
        <div className="flex-1 bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Account Details</h2>
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
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Your Partner's Name*</label>
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
          
          {/* Delete Account Section */}
          <div className="mb-4 pt-4 border-t border-[#E0D6D0]">
            <label className="block text-xs font-work-sans text-[#332B42] mb-1">Danger Zone</label>
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
          <div className="flex justify-end items-center mt-6 gap-3">
            <button
              className="btn-primary px-8 py-2 rounded font-semibold text-base disabled:opacity-60"
              onClick={onSave}
              disabled={saving || !hasUnsavedChanges || !!userNameError || !!partnerNameError}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
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
    </>
  );
} 