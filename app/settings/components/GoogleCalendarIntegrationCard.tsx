import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface GoogleCalendarIntegrationCardProps {
  user: any;
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

const GoogleCalendarIntegrationCard: React.FC<GoogleCalendarIntegrationCardProps> = ({ user }) => {
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ isLinked: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchCalendarStatus();
  }, [user?.uid]);

  const fetchCalendarStatus = async () => {
    setIsLoading(true);
    try {
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
      console.error('Error fetching calendar status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCalendar = async () => {
    setIsCreating(true);
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
      console.error('Error creating calendar:', error);
      toast.error('Failed to create Google Calendar');
    } finally {
      setIsCreating(false);
    }
  };

  const disconnectCalendar = async () => {
    setIsDisconnecting(true);
    try {
      // Remove googleCalendar from Firestore
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Google Calendar disconnected.');
        setCalendarStatus({ isLinked: false });
      } else {
        toast.error(data.message || 'Failed to disconnect Google Calendar');
      }
    } catch (error) {
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsDisconnecting(false);
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

  return (
    <div className="border border-[#AB9C95] rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#A85C36]" />
          <div>
            <h6 className="font-playfair font-medium text-[#332B42]">Google Calendar Integration</h6>
            {calendarStatus.isLinked && calendarStatus.calendarName && (
              <p className="text-sm text-[#7A7A7A]">{calendarStatus.calendarName}</p>
            )}
            {!calendarStatus.isLinked && (
              <p className="text-sm text-[#7A7A7A]">Create and sync a dedicated Google Calendar for your wedding to-dos</p>
            )}
          </div>
        </div>
        {calendarStatus.isLinked ? (
          <button
            onClick={disconnectCalendar}
            disabled={isDisconnecting}
            className="px-4 py-2 rounded font-work-sans text-sm font-medium transition-colors duration-150 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={createCalendar}
            disabled={isCreating}
            className="btn-primary px-4 py-2 rounded font-work-sans text-sm font-medium"
          >
            {isCreating ? 'Creating...' : 'Create Calendar'}
          </button>
        )}
      </div>
      {calendarStatus.isLinked && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Calendar ID:</span>
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3 cursor-pointer" onClick={openGoogleCalendar} />
              <span className="truncate max-w-[180px]">{calendarStatus.calendarId}</span>
            </span>
          </div>
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
  );
};

export default GoogleCalendarIntegrationCard; 