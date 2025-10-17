'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import TimelineCalendarSyncSkeleton from './TimelineCalendarSyncSkeleton';
import { WeddingTimeline } from '@/types/timeline';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useGmailAuth } from '@/contexts/GmailAuthContext';

interface TimelineCalendarSyncProps {
  timeline: WeddingTimeline;
  userId: string;
  onSyncComplete: () => void;
}

interface CalendarStatus {
  isLinked: boolean;
  calendarId?: string;
  lastSynced?: string;
  lastWebhookSyncAt?: string;
  lastWebhookEventCount?: number;
}

const TimelineCalendarSync: React.FC<TimelineCalendarSyncProps> = ({
  timeline,
  userId,
  onSyncComplete,
}) => {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { checkGmailAuth } = useGmailAuth();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ isLinked: false });
  const [isSyncing, setIsSyncing] = useState(false);

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

  const syncToCalendar = async () => {
    if (timeline.events.length === 0) {
      showErrorToast('No timeline events to sync');
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/timeline/sync-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          timelineId: timeline.id,
          events: timeline.events
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast(data.message);
        await fetchCalendarStatus();
        onSyncComplete?.();
      } else {
        // Check if this is a Google authentication error
        const errorMessage = data.message || '';
        if (errorMessage.includes('Google authentication expired') || 
            errorMessage.includes('Google authentication required') ||
            errorMessage.includes('invalid_grant')) {
          // Trigger Gmail auth check to show the global banner
          checkGmailAuth(true); // Force check
          showErrorToast('Google authentication expired. Please re-authenticate to sync with Google Calendar.');
        } else {
          showErrorToast(errorMessage || 'Failed to sync to Google Calendar');
        }
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      
      // Check if this is a Google authentication error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Google authentication expired') || 
          errorMessage.includes('Google authentication required') ||
          errorMessage.includes('invalid_grant')) {
        // Trigger Gmail auth check to show the global banner
        checkGmailAuth(true); // Force check
        showErrorToast('Google authentication expired. Please re-authenticate to sync with Google Calendar.');
      } else {
        showErrorToast('Failed to sync to Google Calendar');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const openGoogleCalendar = () => {
    if (calendarStatus.calendarId) {
      window.open(`https://calendar.google.com/calendar/embed?src=${calendarStatus.calendarId}`, '_blank');
    }
  };

  // Compact single-line UI with background and padding, right-aligned actions
  return (
    <div className="bg-[#F8F6F4] rounded px-3 py-2">
      <div className="flex items-center justify-between w-full">
        {/* Left: Google Calendar status */}
        <div className="flex items-center gap-2">
          <img src="/Google__G__logo.svg" alt="Google" className="w-3 h-3 flex-shrink-0" />
          {calendarStatus.isLinked ? (
            <span className="text-xs text-[#332B42]">
              Synced with GCal
            </span>
          ) : (
            <button
              onClick={() => window.location.href = '/settings?tab=integrations'}
              className="text-xs text-[#A85C36] hover:text-[#8B4513] underline cursor-pointer bg-transparent border-none p-0"
              title="Link Google Calendar in Settings"
            >
              Not linked to GCal
            </button>
          )}
        </div>
        
        {/* Right: Action links (only show if linked) */}
        {calendarStatus.isLinked && (
          <div className="flex items-center gap-2">
            {isSyncing ? (
              <TimelineCalendarSyncSkeleton />
            ) : (
              <button
                onClick={syncToCalendar}
                className="text-[#A85C36] hover:text-[#8B4513] text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Resync
              </button>
            )}
            <div className="w-1 h-1 bg-[#A85C36] rounded-full"></div>
            <button
              onClick={openGoogleCalendar}
              className="text-[#A85C36] hover:text-[#8B4513] text-xs flex items-center gap-1"
              title="Open in Google Calendar"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineCalendarSync;
