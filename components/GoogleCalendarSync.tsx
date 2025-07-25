import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface GoogleCalendarSyncProps {
  userId: string;
  todoItems: any[];
  selectedListId: string | null;
  onSyncComplete?: () => void;
  compact?: boolean;
}

interface CalendarStatus {
  isLinked: boolean;
  calendarId?: string;
  calendarName?: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
  lastSyncErrors?: number;
  lastSyncFromAt?: string;
  lastSyncFromCount?: number;
  lastSyncFromErrors?: number;
  lastWebhookSyncAt?: string;
  lastWebhookEventCount?: number;
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  userId,
  todoItems,
  selectedListId,
  onSyncComplete,
  compact
}) => {
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ isLinked: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncingTo, setIsSyncingTo] = useState(false);
  const [isSyncingFrom, setIsSyncingFrom] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calendarNameInput, setCalendarNameInput] = useState('');
  const [foundExistingCalendar, setFoundExistingCalendar] = useState(false);
  const [existingCalendarName, setExistingCalendarName] = useState('');

  // Fetch calendar status on component mount
  useEffect(() => {
    fetchCalendarStatus();
  }, [userId]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('/api/google-calendar/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarStatus(data);
      }
    } catch (error) {
      console.error('Error fetching calendar status:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setCalendarNameInput('All Wedding To-Do\'s - From Paige');
    setShowCreateModal(true);
  };

  const handleConfirmCreate = async () => {
    setIsCreating(true);
    setShowCreateModal(false);
    try {
      const response = await fetch('/api/google-calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          calendarName: calendarNameInput || 'All Wedding To-Do\'s - From Paige'
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Google Calendar linked successfully!');
        setCalendarStatus({
          isLinked: true,
          calendarId: data.calendarId,
          calendarName: data.calendarName,
          lastSyncAt: new Date().toISOString(),
        });
        onSyncComplete?.();
        // Reset the found existing calendar state
        setFoundExistingCalendar(false);
        setExistingCalendarName('');
      } else {
        toast.error(data.message || 'Failed to create Google Calendar');
      }
    } catch (error) {
      console.error('Error creating calendar:', error);
      toast.error('Failed to create Google Calendar');
    } finally {
      setIsCreating(false);
    }
  };

  const syncToCalendar = async () => {
    console.log('Syncing to Google...');
    if (todoItems.length === 0) {
      console.log('No to-do items to sync, aborting syncToCalendar');
      toast.error('No to-do items to sync');
      return;
    }

    setIsSyncingTo(true);
    try {
      const response = await fetch('/api/google-calendar/sync-to-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          todoItems
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchCalendarStatus();
        onSyncComplete?.();
      } else {
        toast.error(data.message || 'Failed to sync to Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error('Failed to sync to Google Calendar');
    } finally {
      setIsSyncingTo(false);
      console.log('syncToCalendar finished');
    }
  };

  const syncFromCalendar = async () => {
    console.log('Syncing from Google...');
    setIsSyncingFrom(true);
    try {
      const response = await fetch('/api/google-calendar/sync-from-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchCalendarStatus();
        onSyncComplete?.();
      } else {
        toast.error(data.message || 'Failed to sync from Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing from calendar:', error);
      toast.error('Failed to sync from Google Calendar');
    } finally {
      setIsSyncingFrom(false);
      console.log('syncFromCalendar finished');
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

  // Unified sync handler for compact mode
  const handleUnifiedSync = async () => {
    setIsSyncing(true);
    try {
      console.log('Unified sync started');
      await syncFromCalendar();
      await syncToCalendar();
      toast.success('Synced with Google successfully!');
    } catch (err) {
      console.error('Unified sync error:', err);
      toast.error('Failed to sync with Google.');
    } finally {
      setIsSyncing(false);
      console.log('Unified sync finished');
    }
  };

  if (compact) {
    // Compact bar UI
    return (
      <div className="flex items-center gap-3 bg-[#F8F6F4] border border-[#E0DBD7] rounded px-3 py-2">
        <img src="/Google__G__logo.svg" alt="Google" className="w-5 h-5" />
        <span className="text-sm font-medium text-[#332B42]">Google Calendar:</span>
        {calendarStatus.isLinked ? (
          <>
            <span className="text-xs text-green-700">Synced {formatLastSync(calendarStatus.lastSyncAt)}</span>
            <button
              onClick={async () => {
                if (todoItems.length === 0) {
                  toast.error('Add to-do items to sync with Google Calendar.');
                  return;
                }
                await handleUnifiedSync();
              }}
              disabled={isSyncing}
              className="ml-2 px-2 py-1 text-xs rounded bg-[#A85C36] text-white hover:bg-[#8B4513] flex items-center gap-1"
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Sync with Google
            </button>
            <button
              onClick={openGoogleCalendar}
              className="ml-2 text-[#A85C36] hover:text-[#8B4513] text-xs flex items-center gap-1"
              title="Open in Google Calendar"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-500">Not linked</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-playfair font-semibold text-[#332B42] flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar Sync
        </h3>
        <button
          onClick={fetchCalendarStatus}
          disabled={isLoading}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!calendarStatus.isLinked ? (
        <div className="text-center py-6">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            Create a dedicated Google Calendar to sync all your wedding to-dos
          </p>
          <button
            onClick={handleOpenCreateModal}
            disabled={isCreating}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            {isCreating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Create Google Calendar
              </>
            )}
          </button>
          {/* Modal for calendar name confirmation */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                  <h5 className="h5 mb-4">Create Google Calendar</h5>
                  <p className="text-sm text-[#364257] mb-4">
                    {foundExistingCalendar 
                      ? `We found an existing calendar: "${existingCalendarName}". You can reuse it or create a new one.`
                      : 'Confirm or edit the calendar name below. This calendar will sync all your wedding to-dos from all lists.'
                    }
                  </p>
                  {foundExistingCalendar && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-[5px]">
                      <p className="text-sm text-blue-800">
                        <strong>Existing Calendar Found:</strong> {existingCalendarName}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Reusing the existing calendar will preserve any events already synced there.
                      </p>
                    </div>
                  )}
                  <input
                    type="text"
                    className="w-full border border-[#AB9C95] rounded-[5px] px-3 py-2 mb-6 text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    value={calendarNameInput}
                    onChange={e => setCalendarNameInput(e.target.value)}
                    maxLength={100}
                    placeholder={foundExistingCalendar ? "Enter name for new calendar (optional)" : "Calendar name"}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium rounded-[5px] border border-[#AB9C95] text-[#332B42] hover:bg-[#F3F2F0] transition-colors"
                    >
                      Cancel
                    </button>
                    {foundExistingCalendar && (
                      <button
                        onClick={() => {
                          // Reuse existing calendar
                          handleConfirmCreate();
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-[5px] bg-green-600 text-white hover:bg-green-700 transition-colors"
                        disabled={isCreating}
                      >
                        Reuse Existing
                      </button>
                    )}
                    <button
                      onClick={handleConfirmCreate}
                      className="px-4 py-2 text-sm font-medium rounded-[5px] bg-[#A85C36] text-white hover:bg-[#8B4513] transition-colors"
                      disabled={(!calendarNameInput.trim() && !foundExistingCalendar) || isCreating}
                    >
                      {foundExistingCalendar ? 'Create New' : 'Create'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendar Info */}
          <div className="bg-gray-50 rounded-[5px] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-[#332B42]">{calendarStatus.calendarName}</h4>
              <button
                onClick={openGoogleCalendar}
                className="text-[#A85C36] hover:text-[#8B4513] text-sm flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </button>
            </div>
            <p className="text-xs text-gray-600">Calendar ID: {calendarStatus.calendarId}</p>
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last sync to Google:</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLastSync(calendarStatus.lastSyncAt)}
              </span>
            </div>
            {calendarStatus.lastSyncCount !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Items synced:</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  {calendarStatus.lastSyncCount}
                </span>
              </div>
            )}
            {calendarStatus.lastSyncErrors !== undefined && calendarStatus.lastSyncErrors > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Errors:</span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  {calendarStatus.lastSyncErrors}
                </span>
              </div>
            )}
          </div>

          {/* Sync Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={syncToCalendar}
              disabled={isSyncingTo || todoItems.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
            >
              {isSyncingTo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Sync All Items ({todoItems.length})
                </>
              )}
            </button>
            <button
              onClick={syncFromCalendar}
              disabled={isSyncingFrom}
              className="btn-primaryinverse flex-1 flex items-center justify-center gap-2 text-sm"
            >
              {isSyncingFrom ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync from Google Calendar
                </>
              )}
            </button>
          </div>

          {/* Real-time Sync Status */}
          {calendarStatus.lastWebhookSyncAt && (
            <div className="text-xs text-gray-500 bg-green-50 border border-green-200 rounded-[3px] p-2">
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
  );
};

export default GoogleCalendarSync; 