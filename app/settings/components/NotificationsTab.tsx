"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useUserProfileData } from "../../../hooks/useUserProfileData";
import { Bell, Mail, CheckCircle, XCircle, MessageSquare, ClipboardList, DollarSign, Users } from 'lucide-react';
import NotificationsTabSkeleton from './NotificationsTabSkeleton';

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
    return <NotificationsTabSkeleton />;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* External Notifications Container */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">External Notifications</h5>
        <p className="text-sm text-[#7A7A7A] mb-6">
          These notifications are sent to your phone and email when vendors contact you through Paige.
        </p>
        
        {/* Phone Number Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3 text-[#332B42]">Contact Information</h4>
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

        {/* External Notification Preferences Section */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3 text-[#332B42]">External Notification Preferences</h4>
          <div className="space-y-4">
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
        
        {/* External Notifications Info */}
        <div className="p-4 bg-[#F8F6F4] rounded-md">
          <h6 className="font-semibold text-[#332B42] mb-2">How External Notifications Work</h6>
          <ul className="text-sm text-[#7A7A7A] space-y-1">
            <li>• <strong>SMS:</strong> Receive text messages when vendors send you messages through Paige</li>
            <li>• <strong>Email:</strong> Get email notifications with message previews and direct links to reply</li>
          </ul>
          <p className="text-xs text-[#7A7A7A] mt-3">
            Your contact information is only used for notifications and is never shared with vendors or third parties.
          </p>
        </div>
      </div>

      {/* In-App Notifications Container */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">In-App Notifications</h5>
        <p className="text-sm text-[#7A7A7A] mb-6">
          These notifications appear in the bell icon in your navigation and help you stay on top of your wedding planning.
        </p>
        
        {/* Notification Legend */}
        <div className="mb-6 p-4 bg-[#F8F6F4] rounded-md">
          <h6 className="font-semibold text-[#332B42] mb-3">Notification Types</h6>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-[#332B42] font-medium">Urgent</span>
              <span className="text-[#7A7A7A]">- Requires immediate attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-[#332B42] font-medium">Your Work</span>
              <span className="text-[#7A7A7A]">- Items you need to complete</span>
            </div>
          </div>
        </div>

        {/* In-App Notification Types */}
        <div className="space-y-4">
          {/* Messages */}
          <div className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[#332B42] block">New Messages</span>
              <span className="text-sm text-[#7A7A7A]">Unread messages from vendors and contacts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-[#7A7A7A]">Urgent</span>
            </div>
          </div>

          {/* Todo Assigned */}
          <div className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[#332B42] block">To-Do Items Assigned to You</span>
              <span className="text-sm text-[#7A7A7A]">Tasks assigned by your partner or wedding planner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-[#7A7A7A]">Urgent</span>
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[#332B42] block">Budget Alerts</span>
              <span className="text-sm text-[#7A7A7A]">Categories over budget or overdue payments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-[#7A7A7A]">Urgent</span>
            </div>
          </div>

          {/* Vendors */}
          <div className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[#332B42] block">Vendor Updates</span>
              <span className="text-sm text-[#7A7A7A]">New comments, reviews, or vendor activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-[#7A7A7A]">Urgent</span>
            </div>
          </div>

          {/* Incomplete Todos */}
          <div className="flex items-center p-4 border rounded-[5px] gap-4">
            <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-[#A85C36]" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[#332B42] block">Incomplete To-Do Items</span>
              <span className="text-sm text-[#7A7A7A]">Your total number of incomplete tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-[#7A7A7A]">Your Work</span>
            </div>
          </div>
        </div>

        {/* In-App Notifications Info */}
        <div className="mt-6 p-4 bg-[#F8F6F4] rounded-md">
          <h6 className="font-semibold text-[#332B42] mb-2">How In-App Notifications Work</h6>
          <ul className="text-sm text-[#7A7A7A] space-y-1">
            <li>• <strong>Bell Icon:</strong> Shows total count of urgent notifications (red badge)</li>
            <li>• <strong>Navigation Dots:</strong> Blue dots show work items, red dots show urgent items</li>
            <li>• <strong>Click to View:</strong> Click the bell icon to see detailed notifications</li>
            <li>• <strong>Dismiss:</strong> Click "Dismiss" to mark notifications as read</li>
            <li>• <strong>Auto-Update:</strong> Notifications update in real-time as events occur</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 