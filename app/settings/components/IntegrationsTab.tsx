"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { Calendar, Mail, CheckCircle, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import SettingsTabSkeleton from './SettingsTabSkeleton';

interface IntegrationsTabProps {
  user: any;
  onGoogleAction: (action: () => Promise<void>) => void;
}

export default function IntegrationsTab({ user, onGoogleAction }: IntegrationsTabProps) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [calendarStatus, setCalendarStatus] = useState<any>({ isLinked: false });
  const [loading, setLoading] = useState(true);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      setLoading(true);
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.googleTokens) {
          setGoogleConnected(true);
          setGoogleEmail(userData.googleTokens.email || userData.googleEmail || "");
        } else {
          setGoogleConnected(false);
          setGoogleEmail("");
        }
        // Fetch calendar status
        const response = await fetch('/api/google-calendar/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        if (response.ok) {
          const data = await response.json();
          setCalendarStatus(data);
        }
      } catch (error) {
        setGoogleConnected(false);
        setGoogleEmail("");
      } finally {
        setLoading(false);
      }
    };
    fetchGoogleIntegration();
  }, [user?.uid]);

  const handleConnectGoogle = () => {
    if (!user?.uid) {
      toast.error("Could not find user. Please try logging in again.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/settings?tab=integrations`);
    const googleAuthUrl = `/api/auth/google/initiate?userId=${user.uid}&redirectUri=${redirectUri}`;
    window.location.href = googleAuthUrl;
  };

  const handleDisconnectGoogle = () => {
    onGoogleAction(async () => {
      try {
        const response = await fetch('/api/google-calendar/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, disconnectType: 'all' }),
        });
        const data = await response.json();
        if (data.success) {
        setGoogleConnected(false);
        setGoogleEmail("");
          setCalendarStatus({ isLinked: false });
          toast.success(data.message || "All Google integrations disconnected successfully");
        } else {
          toast.error(data.message || "Failed to disconnect Google account");
        }
      } catch (error) {
        toast.error("Failed to disconnect Google account");
      }
    });
  };

  const handleDisconnectGmail = () => {
    onGoogleAction(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        // Only remove Gmail-related data, keep calendar if it exists
        await updateDoc(userRef, {
          googleTokens: deleteField(),
          gmailImportCompleted: deleteField(),
        });
        setGoogleConnected(false);
        setGoogleEmail("");
        toast.success("Gmail integration disconnected successfully");
      } catch (error) {
        toast.error("Failed to disconnect Gmail integration");
      }
    });
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await response.json();
      if (data.success) {
        setCalendarStatus({ isLinked: false });
        toast.success('Google Calendar disconnected successfully');
      } else {
        toast.error(data.message || 'Failed to disconnect Google Calendar');
      }
    } catch (error) {
      toast.error('Failed to disconnect Google Calendar');
    }
  };

  const handleReauthorizeGoogle = () => {
    if (!user?.uid) {
      toast.error("Could not find user. Please try logging in again.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/settings?tab=integrations`);
    const googleAuthUrl = `/api/auth/google/initiate?userId=${user.uid}&redirectUri=${redirectUri}`;
    window.location.href = googleAuthUrl;
  };

  const createCalendar = async () => {
    setIsCreatingCalendar(true);
    try {
      const response = await fetch('/api/google-calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, calendarName: 'Paige Wedding To-Dos' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Google Calendar created and linked successfully!');
        setCalendarStatus({
          isLinked: true,
          calendarId: data.calendarId,
          calendarName: data.calendarName,
          lastSyncAt: new Date().toISOString(),
        });
      } else {
        toast.error(data.message || 'Failed to create Google Calendar');
      }
    } catch (error) {
      toast.error('Failed to create Google Calendar');
    } finally {
      setIsCreatingCalendar(false);
    }
  };

  const openGoogleCalendar = () => {
    if (calendarStatus.calendarId) {
      window.open(`https://calendar.google.com/calendar/embed?src=${calendarStatus.calendarId}`, '_blank');
    }
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <SettingsTabSkeleton />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Integrations</h5>
        <div className="space-y-6">
          <div className="border border-[#AB9C95] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <img src="/Google__G__logo.svg" alt="Google" className="w-8 h-8" />
                <div>
                <h6 className="font-playfair font-medium text-[#332B42]">Google Integration</h6>
                {googleConnected && googleEmail && (
                  <p className="text-sm text-[#7A7A7A]">{googleEmail}</p>
                )}
                {!googleConnected && (
                  <p className="text-sm text-[#7A7A7A]">Connect your Google account to enable Gmail and Calendar features</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${googleConnected ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={googleConnected ? 'text-green-700' : 'text-gray-500'}>Gmail: Import contacts, send messages</span>
                  {googleConnected && (
                    <button
                      onClick={handleDisconnectGmail}
                      className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
                      title="Disconnect Gmail only"
                    >
                      Disconnect Gmail
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className={`w-4 h-4 ${calendarStatus.isLinked ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={calendarStatus.isLinked ? 'text-green-700' : 'text-gray-500'}>Google Calendar: Sync all wedding to-dos</span>
                  {calendarStatus.isLinked && (
                    <button
                      onClick={handleDisconnectCalendar}
                      className="ml-2 text-xs text-red-600 hover:text-red-800 underline"
                      title="Disconnect Calendar only"
                    >
                      Disconnect Calendar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {googleConnected ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleReauthorizeGoogle}
                      className="btn-primary px-4 py-2 rounded font-work-sans text-sm font-medium"
                    >
                      Re-authorize
                    </button>
                    <button
                      onClick={handleDisconnectGoogle}
                      disabled={isDisconnecting}
                      className="px-4 py-2 rounded font-work-sans text-sm font-medium transition-colors duration-150 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      title="Disconnect all Google services"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect All'}
                    </button>
                  </div>
                ) : (
              <button
                    onClick={handleConnectGoogle}
                    className="btn-primary px-4 py-2 rounded font-work-sans text-sm font-medium"
                  >
                    Connect
              </button>
                )}
              </div>
            </div>
            {/* Calendar controls/status */}
            {googleConnected && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#332B42] flex items-center gap-1">
                    <img src="/Google__G__logo.svg" alt="Google" className="w-4 h-4" />
                    Google Calendar
                  </span>
                  {calendarStatus.isLinked ? (
                    <span className="ml-2 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Linked</span>
                  ) : (
                    <div className="relative group ml-2">
                      <button
                        onClick={createCalendar}
                        disabled={isCreatingCalendar}
                        className="btn-primary px-2 py-1 rounded text-xs"
                      >
                        {isCreatingCalendar ? 'Creating...' : 'Create Calendar'}
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        This will create a dedicated Google Calendar in your account for syncing all your Paige wedding to-dos from all lists.
                      </div>
                    </div>
                  )}
                  {calendarStatus.isLinked && (
                    <button
                      onClick={openGoogleCalendar}
                      className="ml-2 text-[#A85C36] hover:text-[#8B4513] text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </button>
                  )}
                </div>
                {calendarStatus.isLinked && (
                  <div className="ml-6 mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Calendar ID:</span>
                      <span className="truncate max-w-[180px]">{calendarStatus.calendarId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Last sync to Google:</span>
                      <Clock className="w-3 h-3" />
                      {formatLastSync(calendarStatus.lastSyncAt)}
                    </div>
                    {calendarStatus.lastSyncCount !== undefined && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Items synced:</span>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        {calendarStatus.lastSyncCount}
                      </div>
                    )}
                    {calendarStatus.lastSyncErrors !== undefined && calendarStatus.lastSyncErrors > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Errors:</span>
                        <AlertCircle className="w-3 h-3 text-red-600" />
                        {calendarStatus.lastSyncErrors}
                      </div>
                    )}
                    {calendarStatus.lastWebhookSyncAt && (
                      <div className="text-xs text-gray-500 bg-green-50 border border-green-200 rounded-[3px] p-2 mt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Real-time sync active
                        </div>
                        <div>Last webhook: {formatLastSync(calendarStatus.lastWebhookSyncAt)}</div>
                        {calendarStatus.lastWebhookEventCount && (
                          <div>Events processed: {calendarStatus.lastWebhookEventCount}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 