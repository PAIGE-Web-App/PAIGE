"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useUserProfileData } from "../../../hooks/useUserProfileData";
import { toast } from "react-hot-toast";
import { Bell, Mail, Save, CheckCircle, XCircle } from "lucide-react";

export default function NotificationsTab() {
  const { user } = useAuth();
  const { phoneNumber, notificationPreferences, profileLoading } = useUserProfileData();

  // Per-type local state
  const [localPhoneNumber, setLocalPhoneNumber] = useState("");
  const [localPreferences, setLocalPreferences] = useState({ sms: false, email: false });
  const [savedPreferences, setSavedPreferences] = useState({ sms: false, email: false });
  const [saving, setSaving] = useState({ sms: false, email: false });
  const [status, setStatus] = useState({ sms: "", email: "" });
  const [hasChanged, setHasChanged] = useState({ sms: false, email: false });

  // Sync with Firestore data
  useEffect(() => {
    if (!profileLoading) {
      setLocalPhoneNumber(phoneNumber || "");
      setLocalPreferences(notificationPreferences || { sms: false, email: false });
      setSavedPreferences(notificationPreferences || { sms: false, email: false });
      setHasChanged({ sms: false, email: false });
      setStatus({ sms: "", email: "" });
    }
  }, [phoneNumber, notificationPreferences, profileLoading]);

  // Track changes per type
  useEffect(() => {
    setHasChanged({
      sms: localPreferences.sms !== savedPreferences.sms,
      email: localPreferences.email !== savedPreferences.email,
    });
  }, [localPreferences, savedPreferences]);

  const handlePreferenceToggle = (key) => {
    setLocalPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (type) => {
    if (!user?.uid) {
      toast.error("Please log in to save notification settings");
      return;
    }
    setSaving((prev) => ({ ...prev, [type]: true }));
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        notificationPreferences: { ...savedPreferences, [type]: localPreferences[type] },
        updatedAt: new Date(),
      });
      setSavedPreferences((prev) => ({ ...prev, [type]: localPreferences[type] }));
      setHasChanged((prev) => ({ ...prev, [type]: false }));
      toast.success(`${type === "sms" ? "SMS" : "Email"} notification preference saved!`);
    } catch (error) {
      toast.error("Failed to save notification settings");
    } finally {
      setSaving((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleTest = async (type) => {
    if (!user?.uid) {
      toast.error("Please log in to test notifications");
      return;
    }
    setStatus((prev) => ({ ...prev, [type]: "testing" }));
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, testType: type }),
      });
      const data = await response.json();
      if (data.success && data.results[type].sent) {
        setStatus((prev) => ({ ...prev, [type]: "success" }));
        toast.success(`${type === "sms" ? "SMS" : "Email"} test sent!`);
      } else {
        setStatus((prev) => ({ ...prev, [type]: "fail" }));
        toast.error(data.results[type].error || `Failed to send ${type} test`);
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, [type]: "fail" }));
      toast.error(`Failed to send ${type} test`);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setLocalPhoneNumber(formatted);
  };

  if (profileLoading) {
    return (
      <div className="flex gap-8 pb-8">
        <div className="flex-1 bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Notifications</h2>
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[#332B42] text-sm mt-4">Loading notification settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-8 pb-8">
      <div className="flex-1 bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Notification Settings</h2>
        
        {/* Phone Number Section */}
        <div className="mb-8">
          <h3 className="text-md font-semibold mb-4 text-[#332B42]">Contact Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Phone Number (for SMS notifications)
              </label>
              <input
                type="tel"
                value={localPhoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-[#AB9C95] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A85C36] focus:border-transparent"
                maxLength={14}
              />
              <p className="text-xs text-[#7A7A7A] mt-1">
                Your phone number is used only for SMS notifications and is never shared with vendors.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="mb-8">
          <h3 className="text-md font-semibold mb-4 text-[#332B42]">Notification Preferences</h3>
          <div className="space-y-6">
            {/* SMS Notifications */}
            <div className="flex items-center p-4 border rounded-[5px] gap-4">
              <input
                type="checkbox"
                checked={localPreferences.sms}
                onChange={() => handlePreferenceToggle('sms')}
                className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
              />
              <Bell size={20} className="text-green-500 mr-2" />
              <span className="font-medium text-[#332B42] block flex-1">SMS Notifications</span>
              <button
                onClick={() => handleSave('sms')}
                disabled={!hasChanged.sms || saving.sms}
                className={`px-3 py-1 rounded-md text-white font-medium ${hasChanged.sms && !saving.sms ? 'bg-[#A85C36] hover:bg-[#8B4A2A]' : 'bg-[#AB9C95] cursor-not-allowed'}`}
              >
                {saving.sms ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => handleTest('sms')}
                disabled={!localPreferences.sms || hasChanged.sms || saving.sms}
                className={`ml-2 px-3 py-1 rounded-md font-medium ${localPreferences.sms && !hasChanged.sms && !saving.sms ? 'bg-[#364257] text-white hover:bg-[#2A3441]' : 'bg-[#AB9C95] text-white cursor-not-allowed'}`}
              >
                Test
              </button>
              {status.sms === 'success' && <CheckCircle className="text-green-600 ml-2" />}
              {status.sms === 'fail' && <XCircle className="text-red-600 ml-2" />}
              {status.sms === 'testing' && <span className="ml-2 text-xs text-gray-500">Testing...</span>}
            </div>
            {/* Email Notifications */}
            <div className="flex items-center p-4 border rounded-[5px] gap-4">
              <input
                type="checkbox"
                checked={localPreferences.email}
                onChange={() => handlePreferenceToggle('email')}
                className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
              />
              <Mail size={20} className="text-blue-500 mr-2" />
              <span className="font-medium text-[#332B42] block flex-1">Email Notifications</span>
              <button
                onClick={() => handleSave('email')}
                disabled={!hasChanged.email || saving.email}
                className={`px-3 py-1 rounded-md text-white font-medium ${hasChanged.email && !saving.email ? 'bg-[#A85C36] hover:bg-[#8B4A2A]' : 'bg-[#AB9C95] cursor-not-allowed'}`}
              >
                {saving.email ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => handleTest('email')}
                disabled={!localPreferences.email || hasChanged.email || saving.email}
                className={`ml-2 px-3 py-1 rounded-md font-medium ${localPreferences.email && !hasChanged.email && !saving.email ? 'bg-[#364257] text-white hover:bg-[#2A3441]' : 'bg-[#AB9C95] text-white cursor-not-allowed'}`}
              >
                Test
              </button>
              {status.email === 'success' && <CheckCircle className="text-green-600 ml-2" />}
              {status.email === 'fail' && <XCircle className="text-red-600 ml-2" />}
              {status.email === 'testing' && <span className="ml-2 text-xs text-gray-500">Testing...</span>}
            </div>
          </div>
        </div>
        {/* Information Section */}
        <div className="mt-8 p-4 bg-[#F8F6F4] rounded-md">
          <h4 className="font-semibold text-[#332B42] mb-2">How Notifications Work</h4>
          <ul className="text-sm text-[#7A7A7A] space-y-1">
            <li>• <strong>SMS:</strong> Receive text messages when vendors send you messages through Paige</li>
            <li>• <strong>Email:</strong> Get email notifications with message previews and direct links to reply</li>
          </ul>
          <p className="text-xs text-[#7A7A7A] mt-3">
            Your contact information is only used for notifications and is never shared with vendors or third parties.
          </p>
        </div>
      </div>
    </div>
  );
} 