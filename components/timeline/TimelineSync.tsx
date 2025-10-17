'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { WeddingTimeline } from '@/types/timeline';
import { useAuth } from '@/contexts/AuthContext';

interface TimelineSyncProps {
  timeline: WeddingTimeline;
  onClose: () => void;
  onSyncComplete: () => void;
}

export default function TimelineSync({ timeline, onClose, onSyncComplete }: TimelineSyncProps) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    isLinked: boolean;
    calendarId?: string;
    lastSynced?: Date;
  } | null>(null);

  // Check sync status on mount
  React.useEffect(() => {
    const checkSyncStatus = async () => {
      if (!user?.uid) return;
      
      try {
        const response = await fetch('/api/timeline/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        });
        
        if (response.ok) {
          const data = await response.json();
          setSyncStatus(data);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };

    checkSyncStatus();
  }, [user?.uid]);

  const handleSyncToCalendar = async () => {
    if (!user?.uid) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/timeline/sync-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          timelineId: timeline.id,
          events: timeline.events
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSyncStatus(prev => ({
          ...prev!,
          isLinked: true,
          calendarId: data.calendarId,
          lastSynced: new Date()
        }));
        onSyncComplete();
      } else {
        console.error('Sync failed:', data.error);
      }
    } catch (error) {
      console.error('Error syncing timeline:', error);
    } finally {
      setIsSyncing(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full h-[70vh] flex flex-col relative mx-2 md:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 bg-opacity-10 rounded-full p-2">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h5 className="h5 text-left text-lg md:text-xl">Sync Timeline to Calendar</h5>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Timeline Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-normal text-purple-900 mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>Timeline Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-700">Wedding Date:</span>
                <div className="font-medium text-purple-900">
                  {timeline.weddingDate.toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-purple-700">Total Events:</span>
                <div className="font-medium text-purple-900">
                  {timeline.events.length} events
                </div>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className="mb-6">
              <h6 className="h6 mb-3">Current Sync Status</h6>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    syncStatus.isLinked ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {syncStatus.isLinked ? 'Connected to Google Calendar' : 'Not connected to calendar'}
                    </div>
                    {syncStatus.lastSynced && (
                      <div className="text-sm text-gray-600">
                        Last synced: {syncStatus.lastSynced.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {syncStatus.isLinked && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Sync Options */}
          <div className="space-y-4">
            <h6 className="h6">Sync Options</h6>
            
            {/* Google Calendar Sync */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-normal text-gray-900 mb-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>Google Calendar Integration</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Create a dedicated wedding day calendar and sync all timeline events. 
                    Share with wedding party and vendors for coordinated scheduling.
                  </p>
                  <button
                    onClick={handleSyncToCalendar}
                    disabled={isSyncing}
                    className="btn-primary flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isSyncing ? 'Syncing...' : 'Sync to Google Calendar'}
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Fixed Footer */}
        <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-primaryinverse"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
