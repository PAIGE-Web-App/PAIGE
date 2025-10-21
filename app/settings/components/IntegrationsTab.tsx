"use client";

import { useState, useEffect } from "react";
import { useCustomToast } from "../../../hooks/useCustomToast";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { addGmailScopes, getGmailCalendarScopeString } from '../../../lib/gmailScopes';
import { db } from "../../../lib/firebase";
import { Calendar, Mail, CheckCircle, AlertCircle, ExternalLink, Clock, Bell } from 'lucide-react';
import SettingsTabSkeleton from './SettingsTabSkeleton';

interface IntegrationsTabProps {
  user: any;
  onGoogleAction: (action: () => Promise<void>) => void;
}

export default function IntegrationsTab({ user, onGoogleAction }: IntegrationsTabProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [calendarStatus, setCalendarStatus] = useState<any>({ isLinked: false });
  const [loading, setLoading] = useState(true);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Gmail data purge states
  const [gmailDataStats, setGmailDataStats] = useState<{
    totalMessages: number;
    contactsWithGmailData: number;
  } | null>(null);
  const [loadingGmailStats, setLoadingGmailStats] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurgingData, setIsPurgingData] = useState(false);

  // Gmail push notifications states
  const [gmailWatchStatus, setGmailWatchStatus] = useState<{
    isActive: boolean;
    expiration?: string;
    lastProcessedAt?: string;
  } | null>(null);
  const [loadingGmailWatch, setLoadingGmailWatch] = useState(false);

  // Fetch Gmail data stats when Gmail is connected
  useEffect(() => {
    const fetchGmailStats = async () => {
      if (!user?.uid || !googleConnected) {
        setGmailDataStats(null);
        return;
      }
      
      setLoadingGmailStats(true);
      try {
        const response = await fetch(`/api/gmail/purge-data?userId=${user.uid}`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGmailDataStats({
              totalMessages: data.totalMessages,
              contactsWithGmailData: data.contactsWithGmailData,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch Gmail stats:', error);
      } finally {
        setLoadingGmailStats(false);
      }
    };
    
    fetchGmailStats();
  }, [user?.uid, googleConnected]);

      // Fetch Gmail watch status when Gmail is connected
      useEffect(() => {
        const fetchGmailWatchStatus = async () => {
          if (!user?.uid || !googleConnected) {
            setGmailWatchStatus(null);
            return;
          }
          
          setLoadingGmailWatch(true);
          try {
            // Get user data to check gmailWatch status
            const response = await fetch(`/api/check-gmail-auth-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.uid }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.userData?.gmailWatch) {
                setGmailWatchStatus({
                  isActive: data.userData.gmailWatch.isActive || false,
                  expiration: data.userData.gmailWatch.expiration,
                  lastProcessedAt: data.userData.gmailWatch.lastProcessedAt,
                });
              } else {
                setGmailWatchStatus({ isActive: false });
              }
            }
          } catch (error) {
            console.error('Failed to fetch Gmail watch status:', error);
          } finally {
            setLoadingGmailWatch(false);
          }
        };
        
        fetchGmailWatchStatus();
      }, [user?.uid, googleConnected]);


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

  const handleConnectGoogle = async () => {
    if (!user?.uid) {
      showErrorToast("Could not find user. Please try logging in again.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      addGmailScopes(provider, true); // Include calendar scopes
      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Store Gmail tokens from the popup
      try {
        const { GoogleAuthProvider } = await import('firebase/auth');
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        
        if (accessToken) {
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            access_token: accessToken,
            refresh_token: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 3600 * 1000, // 1 hour from now
            email: result.user.email, // Store Gmail account email
            scope: getGmailCalendarScopeString()
          };
          
          // Check if user exists before updating
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Update user document with Gmail tokens
            await updateDoc(userDocRef, {
              googleTokens: gmailTokens,
              gmailConnected: true,
            });
          }
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', 'true');
          }
        }
      } catch (tokenError) {
        console.error('❌ Error storing Gmail tokens:', tokenError);
      }
      
      // Get ID token and call session login
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (res.ok) {
        // Update local state
        setGoogleConnected(true);
        setGoogleEmail(result.user.email || "");
        
        // Refresh the integration status
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.googleTokens) {
          setGoogleEmail(userData.googleTokens.email || userData.googleEmail || "");
        }
        
        showSuccessToast("Google account connected successfully!");
        
        // Trigger Gmail auth check to update the Gmail auth context
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmail-auth-updated'));
        }
      } else {
        console.error('❌ Google auth failed');
        showErrorToast("Failed to connect Google account. Please try again.");
      }
    } catch (error: any) {
      console.error('❌ Google auth error:', error);
      showErrorToast("Failed to connect Google account. Please try again.");
    } finally {
      setLoading(false);
    }
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
          showSuccessToast(data.message || "All Google integrations disconnected successfully");
        } else {
          showErrorToast(data.message || "Failed to disconnect Google account");
        }
      } catch (error) {
        showErrorToast("Failed to disconnect Google account");
      }
    });
  };

  const handlePurgeGmailData = async () => {
    if (!user?.uid) return;
    
    setIsPurgingData(true);
    try {
      const response = await fetch('/api/gmail/purge-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccessToast(data.message || 'Gmail data deleted successfully');
        setGmailDataStats({ totalMessages: 0, contactsWithGmailData: 0 });
        setShowPurgeModal(false);
      } else {
        showErrorToast(data.error || 'Failed to delete Gmail data');
      }
    } catch (error) {
      console.error('Failed to purge Gmail data:', error);
      showErrorToast('Failed to delete Gmail data');
    } finally {
      setIsPurgingData(false);
    }
  };

  const handleDisconnectGmail = () => {
    onGoogleAction(async () => {
      try {
        // Check if there's imported Gmail data
        const hasGmailData = gmailDataStats && gmailDataStats.totalMessages > 0;
        
        if (hasGmailData) {
          // Prompt user about imported data
          const shouldDeleteData = window.confirm(
            `You have ${gmailDataStats.totalMessages} imported Gmail messages from ${gmailDataStats.contactsWithGmailData} contacts.\n\n` +
            `Would you like to delete this imported data?\n\n` +
            `• Click "OK" to disconnect Gmail AND delete all imported messages\n` +
            `• Click "Cancel" to disconnect Gmail but keep imported messages\n\n` +
            `Note: This does NOT affect your actual Gmail account.`
          );
          
          if (shouldDeleteData) {
            // Purge data first
            setIsPurgingData(true);
            const purgeResponse = await fetch('/api/gmail/purge-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.uid }),
            });
            setIsPurgingData(false);
            
            const purgeData = await purgeResponse.json();
            if (purgeData.success) {
              showSuccessToast(`Deleted ${purgeData.deletedCount} imported messages`);
              setGmailDataStats({ totalMessages: 0, contactsWithGmailData: 0 });
            }
          }
        }
        
        // Disconnect Gmail
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          googleTokens: deleteField(),
          gmailImportCompleted: deleteField(),
        });
        setGoogleConnected(false);
        setGoogleEmail("");
        showSuccessToast("Gmail integration disconnected successfully");
      } catch (error) {
        showErrorToast("Failed to disconnect Gmail integration");
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
        showSuccessToast('Google Calendar disconnected successfully');
      } else {
        showErrorToast(data.message || 'Failed to disconnect Google Calendar');
      }
    } catch (error) {
      showErrorToast('Failed to disconnect Google Calendar');
    }
  };

  const handleReauthorizeGoogle = async () => {
    if (!user?.uid) {
      showErrorToast("Could not find user. Please try logging in again.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Import Firebase auth dynamically to avoid SSR issues
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const provider = new GoogleAuthProvider();
      // Request all scopes for full re-authorization in settings
      addGmailScopes(provider, true); // Include calendar scopes
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      // Force account selection and consent to show scope selection
      provider.setCustomParameters({
        prompt: 'select_account consent'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Store Gmail tokens from the popup
      try {
        const { GoogleAuthProvider } = await import('firebase/auth');
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        
        if (accessToken) {
          // Store Gmail tokens in Firestore (matching API expected format)
          const gmailTokens = {
            access_token: accessToken,
            refresh_token: null, // Firebase popup doesn't provide refresh token
            expiryDate: Date.now() + 3600 * 1000, // 1 hour from now
            email: result.user.email, // Store Gmail account email
            scope: getGmailCalendarScopeString()
          };
          
          // Check if user exists before updating
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Update user document with Gmail tokens
            await updateDoc(userDocRef, {
              googleTokens: gmailTokens,
              gmailConnected: true,
            });
          }
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('gmailConnected', 'true');
          }
        }
      } catch (tokenError) {
        console.error('❌ Error storing Gmail tokens:', tokenError);
      }
      
      // Get ID token and call session login
      const idToken = await result.user.getIdToken();
      const res = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (res.ok) {
        // Update local state
        setGoogleConnected(true);
        setGoogleEmail(result.user.email || "");
        
        // Refresh the integration status
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        if (userData?.googleTokens) {
          setGoogleEmail(userData.googleTokens.email || userData.googleEmail || "");
        }
        
        // Automatically set up Gmail Watch for push notifications
        try {
          const watchResponse = await fetch('/api/gmail/setup-watch-optimized', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
          });
          
          if (watchResponse.ok) {
            showSuccessToast("Google account re-authorized and Gmail push notifications enabled!");
          } else {
            showSuccessToast("Google account re-authorized successfully!");
          }
        } catch (watchError) {
          console.error('Failed to setup Gmail Watch after reauth:', watchError);
          showSuccessToast("Google account re-authorized successfully!");
        }
      } else {
        console.error('❌ Google reauth failed');
        showErrorToast("Failed to re-authorize Google account. Please try again.");
      }
    } catch (error: any) {
      console.error('❌ Google reauth error:', error);
      showErrorToast("Failed to re-authorize Google account. Please try again.");
    } finally {
      setLoading(false);
    }
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
        showSuccessToast('Google Calendar created and linked successfully!');
        setCalendarStatus({
          isLinked: true,
          calendarId: data.calendarId,
          calendarName: data.calendarName,
          lastSyncAt: new Date().toISOString(),
        });
      } else {
        showErrorToast(data.message || 'Failed to create Google Calendar');
      }
    } catch (error) {
      showErrorToast('Failed to create Google Calendar');
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
            
            {/* Gmail Data Stats & Purge Controls */}
            {googleConnected && (
              <div className="mt-4 pt-4 border-t border-[#AB9C95]/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-[#332B42]" />
                      <span className="font-medium text-[#332B42] text-sm">Imported Gmail Data</span>
                    </div>
                    {loadingGmailStats ? (
                      <p className="text-xs text-[#7A7A7A] ml-6">Loading...</p>
                    ) : gmailDataStats && gmailDataStats.totalMessages > 0 ? (
                      <div className="ml-6 text-xs text-[#7A7A7A]">
                        <p>{gmailDataStats.totalMessages} messages from {gmailDataStats.contactsWithGmailData} contacts</p>
                        <p className="mt-0.5 text-[10px] text-[#7A7A7A]">
                          These are copies stored in Paige. Your Gmail is not affected.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#7A7A7A] ml-6">No imported messages</p>
                    )}
                  </div>
                  {gmailDataStats && gmailDataStats.totalMessages > 0 && (
                    <button
                      onClick={() => setShowPurgeModal(true)}
                      disabled={isPurgingData}
                      className="px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPurgingData ? 'Deleting...' : 'Delete Data'}
                    </button>
                  )}
                </div>
              </div>
            )}

                {/* Gmail Push Notifications Status (Read-only) */}
                {googleConnected && (
                  <div className="mt-4 pt-4 border-t border-[#AB9C95]/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-4 h-4 text-[#332B42]" />
                      <span className="font-medium text-[#332B42] text-sm">Gmail Push Notifications</span>
                    </div>
                    {loadingGmailWatch ? (
                      <p className="text-xs text-[#7A7A7A] ml-6">Loading...</p>
                    ) : gmailWatchStatus?.isActive ? (
                      <div className="ml-6 text-xs text-[#7A7A7A]">
                        <p className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Active - Auto-generating todo suggestions from new emails
                        </p>
                        {gmailWatchStatus.expiration && (
                          <p className="mt-0.5">
                            Expires: {new Date(parseInt(gmailWatchStatus.expiration)).toLocaleDateString()}
                          </p>
                        )}
                        {gmailWatchStatus.lastProcessedAt && (
                          <p className="mt-0.5">
                            Last processed: {formatLastSync(gmailWatchStatus.lastProcessedAt)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-[#7A7A7A]">
                          When you receive emails from contacts, Paige will automatically suggest relevant todo items.
                        </p>
                      </div>
                    ) : (
                      <div className="ml-6 text-xs text-[#7A7A7A]">
                        <p>Disabled - Re-authorize Google to enable automatic todo suggestions from new emails</p>
                        <p className="mt-0.5 text-[10px] text-[#7A7A7A]">
                          Use the "Re-authorize" button above to enable Gmail push notifications.
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
      
      {/* Gmail Data Purge Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h6 className="font-playfair font-medium text-[#332B42] mb-2">
                  Delete Imported Gmail Data?
                </h6>
                <p className="text-sm text-[#5A4A42] mb-3">
                  This will permanently delete <strong>{gmailDataStats?.totalMessages} imported messages</strong> from <strong>{gmailDataStats?.contactsWithGmailData} contacts</strong> in Paige.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                  <p className="text-xs text-blue-800">
                    <strong>Important:</strong> This only deletes the copies stored in Paige. Your actual Gmail account and emails are not affected in any way.
                  </p>
                </div>
                <p className="text-xs text-[#7A7A7A]">
                  Manually created messages in Paige will not be deleted. You can re-import Gmail messages at any time.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPurgeModal(false)}
                disabled={isPurgingData}
                className="px-4 py-2 rounded font-work-sans text-sm font-medium border border-[#AB9C95] text-[#332B42] hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeGmailData}
                disabled={isPurgingData}
                className="px-4 py-2 rounded font-work-sans text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurgingData ? 'Deleting...' : 'Delete Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 