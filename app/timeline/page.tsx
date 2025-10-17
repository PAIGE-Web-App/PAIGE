'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useTodoItems } from '@/hooks/useTodoItems';
import { useCredits } from '@/hooks/useCredits';
import { useCustomToast } from '@/hooks/useCustomToast';
import { WeddingTimeline, WeddingTimelineEvent } from '@/types/timeline';
import TimelineSidebar from '@/components/timeline/TimelineSidebar';
import TimelineTopBar from '@/components/timeline/TimelineTopBar';
import TimelineBuilder from '@/components/timeline/TimelineBuilder';
import TimelineSync from '@/components/timeline/TimelineSync';
import TimelinePageSkeleton from '@/components/timeline/TimelinePageSkeleton';
import AILoadingIndicator from '@/components/AILoadingIndicator';
import WeddingBanner from '@/components/WeddingBanner';
import DeleteTimelineConfirmationModal from '@/components/timeline/DeleteTimelineConfirmationModal';
import TimelineTemplatesModal from '@/components/timeline/TimelineTemplatesModal';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';

// Helper function to safely parse dates
const parseDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  if (date._seconds) return new Date(date._seconds * 1000);
  return new Date();
};

export default function TimelinePage() {
  const { user } = useAuth();
  const { weddingDate, weddingLocation, guestCount } = useUserProfileData();
  const { allTodoItems } = useTodoItems(null);
  const { credits, useCredits: deductCredits, getRemainingCredits } = useCredits();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // Timeline state
  const [timelines, setTimelines] = useState<WeddingTimeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<WeddingTimeline | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<WeddingTimeline | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);

  // Get wedding day todos
  const weddingDayTodos = allTodoItems.filter(todo => 
    todo.planningPhase === 'Wedding Day' || 
    (todo.deadline && todo.deadline.toDateString() === weddingDate?.toDateString())
  );

  // Listen for custom events from buttons
  useEffect(() => {
    const handleOpenTemplatesModal = () => {
      setShowTemplatesModal(true);
    };

    window.addEventListener('openTimelineTemplatesModal', handleOpenTemplatesModal);
    
    return () => {
      window.removeEventListener('openTimelineTemplatesModal', handleOpenTemplatesModal);
    };
  }, []);

  // Auto-show templates modal when no timelines exist (like todo page)
  useEffect(() => {
    if (!isLoading && timelines.length === 0 && !showTemplatesModal && !isGenerating) {
      const timer = setTimeout(() => {
        setShowTemplatesModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, timelines.length, showTemplatesModal, isGenerating]);

  // Debug: Log when selectedTimeline changes
  useEffect(() => {
    console.log('Selected timeline changed:', selectedTimeline);
    if (selectedTimeline) {
      console.log('Selected timeline events:', selectedTimeline.events.map(e => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        duration: e.duration
      })));
    }
  }, [selectedTimeline]);

  // Load all timelines on mount
  useEffect(() => {
    const loadTimelines = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      try {
        console.log('Loading timelines for user:', user.uid);
        const response = await fetch(`/api/timeline/get-all?userId=${user.uid}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log('Timeline response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Timeline data:', data);
          if (data.success && data.timelines) {
            // Convert date strings to Date objects using safe parsing
            const timelinesWithDates = data.timelines.map((timeline: any) => ({
              ...timeline,
              weddingDate: parseDate(timeline.weddingDate),
              createdAt: parseDate(timeline.createdAt),
              updatedAt: parseDate(timeline.updatedAt),
              lastSynced: timeline.lastSynced ? parseDate(timeline.lastSynced) : undefined,
              events: (timeline.events || []).map((event: any) => ({
                ...event,
                startTime: parseDate(event.startTime),
                endTime: parseDate(event.endTime),
                createdAt: parseDate(event.createdAt),
                updatedAt: parseDate(event.updatedAt)
              }))
            }));
            setTimelines(timelinesWithDates);
            
            // Auto-select the first/most recent timeline
            if (timelinesWithDates.length > 0) {
              setSelectedTimeline(timelinesWithDates[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading timelines:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimelines();
  }, [user?.uid]);

  // Generate timeline from AI
  const handleGenerateTimeline = async () => {
    if (!user?.uid || !weddingDate || !weddingLocation) {
      showErrorToast('Please set your wedding date and location first');
      return;
    }

    if (getRemainingCredits() < 4) {
      showErrorToast('Insufficient credits. Timeline generation costs 4 credits.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 3000);
    
    try {
      const response = await fetch('/api/timeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          weddingDate: weddingDate.toISOString(),
          weddingLocation,
          guestCount,
          weddingDayTodos: weddingDayTodos.map(todo => ({
            id: todo.id,
            name: todo.name,
            note: todo.note,
            category: todo.category
          }))
        }),
      });

      const data = await response.json();
      console.log('Timeline generation response:', data);
      
      if (!response.ok) {
        // Handle HTTP errors (403, 402, etc.)
        showErrorToast(data.error || data.message || 'Failed to generate timeline');
        return;
      }
      
      if (data.success && data.timeline) {
        // Handle credit deduction
        if (data.credits) {
          const creditsRequired = data.credits.required || 4;
          const creditsRemaining = data.credits.remaining || 0;
          
          // Emit credit deduction event for UI updates using the same pattern as other components
          localStorage.setItem('creditUpdateEvent', Date.now().toString());
          const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
          creditEventEmitter.emit();
        }

        // Convert date strings to Date objects using safe parsing
        const timelineWithDates = {
          ...data.timeline,
          weddingDate: parseDate(data.timeline.weddingDate),
          createdAt: parseDate(data.timeline.createdAt),
          updatedAt: parseDate(data.timeline.updatedAt),
          lastSynced: data.timeline.lastSynced ? parseDate(data.timeline.lastSynced) : undefined,
          events: (data.timeline.events || []).map((event: any) => ({
            ...event,
            startTime: parseDate(event.startTime),
            endTime: parseDate(event.endTime),
            createdAt: parseDate(event.createdAt),
            updatedAt: parseDate(event.updatedAt)
          }))
        };
        
        // Add to timelines list and select it
        setTimelines(prev => [timelineWithDates, ...prev]);
        setSelectedTimeline(timelineWithDates);
        showSuccessToast('Timeline generated successfully!');
      } else {
        showErrorToast(data.error || 'Failed to generate timeline');
      }
    } catch (error) {
      console.error('Error generating timeline:', error);
      showErrorToast('Failed to generate timeline');
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 500);
    }
  };

  // Handle template selection
  const handleTemplateSelection = async (template: any) => {
    if (!user?.uid || !weddingDate || !weddingLocation) {
      showErrorToast('Please set your wedding date and location first');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await fetch('/api/timeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          weddingDate: weddingDate,
          weddingLocation: weddingLocation,
          templateId: template.id,
          templateEvents: template.events
        }),
      });

      const data = await response.json();
      
      if (data.success && data.timeline) {
        const timelineWithDates = {
          ...data.timeline,
          weddingDate: parseDate(data.timeline.weddingDate),
          createdAt: parseDate(data.timeline.createdAt),
          updatedAt: parseDate(data.timeline.updatedAt),
          lastSynced: data.timeline.lastSynced ? parseDate(data.timeline.lastSynced) : undefined,
          events: (data.timeline.events || []).map((event: any) => ({
            ...event,
            startTime: parseDate(event.startTime),
            endTime: parseDate(event.endTime),
            createdAt: parseDate(event.createdAt),
            updatedAt: parseDate(event.updatedAt)
          }))
        };

        setTimelines(prev => [timelineWithDates, ...prev]);
        setSelectedTimeline(timelineWithDates);
        showSuccessToast('Timeline created from template!');
        
        // Deduct credits
        await deductCredits('timeline_generation');
      } else {
        showErrorToast(data.error || 'Failed to create timeline from template');
      }
    } catch (error) {
      console.error('Error creating timeline from template:', error);
      showErrorToast('Failed to create timeline from template');
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setShowTemplatesModal(false);
      }, 500);
    }
  };

  // Update timeline name
  const handleUpdateTimelineName = async (timelineId: string, newName: string) => {
    if (!user?.uid) return;

    try {
      const response = await fetch('/api/timeline/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timelineId,
          name: newName,
          userId: user.uid
        }),
      });

      if (response.ok) {
        // Update local state
        setTimelines(prev => prev.map(timeline => 
          timeline.id === timelineId 
            ? { ...timeline, name: newName }
            : timeline
        ));
        
        // Update selected timeline if it's the one being edited
        if (selectedTimeline?.id === timelineId) {
          setSelectedTimeline(prev => prev ? { ...prev, name: newName } : null);
        }
        
        showSuccessToast('Timeline name updated!');
      } else {
        showErrorToast('Failed to update timeline name');
      }
    } catch (error) {
      console.error('Error updating timeline name:', error);
      showErrorToast('Failed to update timeline name');
    }
  };

  // Clone timeline
  const handleCloneTimeline = async (timelineToClone: WeddingTimeline) => {
    if (!user?.uid) return;

    try {
      const response = await fetch('/api/timeline/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          timelineId: timelineToClone.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.timeline) {
          const clonedTimeline = {
            ...data.timeline,
            weddingDate: parseDate(data.timeline.weddingDate),
            createdAt: parseDate(data.timeline.createdAt),
            updatedAt: parseDate(data.timeline.updatedAt),
            lastSynced: data.timeline.lastSynced ? parseDate(data.timeline.lastSynced) : undefined,
            events: (data.timeline.events || []).map((event: any) => ({
              ...event,
              startTime: parseDate(event.startTime),
              endTime: parseDate(event.endTime),
              createdAt: parseDate(event.createdAt),
              updatedAt: parseDate(event.updatedAt)
            }))
          };
          setTimelines(prev => [clonedTimeline, ...prev]);
          setSelectedTimeline(clonedTimeline);
          showSuccessToast('Timeline cloned successfully!');
        }
      }
    } catch (error) {
      console.error('Error cloning timeline:', error);
      showErrorToast('Failed to clone timeline');
    }
  };

  // Delete timeline
  const handleDeleteTimeline = async (timelineToDelete: WeddingTimeline) => {
    if (!user?.uid) return;

    // Show confirmation modal instead of browser confirm
    setTimelineToDelete(timelineToDelete);
    setShowDeleteModal(true);
  };

  // Handle deleting a timeline event
  const handleEventDelete = async (eventId: string) => {
    if (!selectedTimeline || !user?.uid) return;

    // Remove the event from the timeline
    const updatedEvents = selectedTimeline.events.filter(event => event.id !== eventId);
    const updatedTimeline = { ...selectedTimeline, events: updatedEvents };

    // Update local state
    setSelectedTimeline(updatedTimeline);
    setTimelines(prev => prev.map(t => t.id === selectedTimeline.id ? updatedTimeline : t));

    // Save to database
    try {
      const response = await fetch('/api/timeline/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          timelineId: selectedTimeline.id,
          updates: { events: updatedEvents }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        showErrorToast('Failed to delete timeline event');
        
        // Revert optimistic update on API failure
        setSelectedTimeline(selectedTimeline);
        setTimelines(prev => prev.map(t => t.id === selectedTimeline.id ? selectedTimeline : t));
      } else {
        showSuccessToast('Event deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting timeline event:', error);
      showErrorToast('Failed to delete timeline event');
      
      // Revert optimistic update on API failure
      setSelectedTimeline(selectedTimeline);
      setTimelines(prev => prev.map(t => t.id === selectedTimeline.id ? selectedTimeline : t));
    }
  };

  // Handle adding a new timeline item
  const handleAddTimelineItem = async () => {
    if (!selectedTimeline || !user?.uid) return;

    // Create a new timeline event with default values
    const newEvent = {
      id: `event-${Date.now()}`,
      title: 'New Event',
      description: '',
      startTime: new Date(selectedTimeline.weddingDate.getTime() + 6 * 60 * 60 * 1000), // Default to 6 AM on wedding day (top of timeline)
      endTime: new Date(selectedTimeline.weddingDate.getTime() + 7 * 60 * 60 * 1000), // Default to 7 AM (1 hour duration)
      duration: 60,
      location: '',
      vendorContact: '',
      bufferTime: 15,
      status: 'pending' as const,
      isCritical: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isNew: true // Flag to trigger animation
    };

    // Update the timeline with the new event at the beginning
    const updatedEvents = [newEvent, ...selectedTimeline.events];
    const updatedTimeline = { ...selectedTimeline, events: updatedEvents };

    // Update local state
    setSelectedTimeline(updatedTimeline);
    setTimelines(prev => prev.map(t => t.id === selectedTimeline.id ? updatedTimeline : t));

    // Scroll to the new event after a short delay to allow for DOM update
    setTimeout(() => {
      const newEventElement = document.getElementById(`timeline-event-${newEvent.id}`);
      if (newEventElement) {
        newEventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Save to database by updating the entire timeline with the new event
    try {
      const response = await fetch('/api/timeline/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          timelineId: selectedTimeline.id,
          updates: { events: updatedEvents }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        showErrorToast('Failed to add timeline event');
      }
    } catch (error) {
      console.error('Error adding timeline event:', error);
      showErrorToast('Failed to add timeline event');
    }
  };

  // Execute timeline deletion
  const executeDeleteTimeline = async () => {
    if (!user?.uid || !timelineToDelete) return;

    try {
      console.log('Deleting timeline:', timelineToDelete.id, 'for user:', user.uid);
      const response = await fetch('/api/timeline/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          timelineId: timelineToDelete.id
        }),
      });
      console.log('Delete response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Timeline deleted successfully, updating UI state');
          setTimelines(prev => prev.filter(t => t.id !== timelineToDelete.id));
          if (selectedTimeline?.id === timelineToDelete.id) {
            setSelectedTimeline(timelines.length > 1 ? timelines.find(t => t.id !== timelineToDelete.id) || null : null);
          }
          showSuccessToast('Timeline deleted');
          
          // Force reload timelines from server to ensure consistency
          setTimeout(async () => {
            try {
      const refreshResponse = await fetch(`/api/timeline/get-all?userId=${user.uid}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                if (refreshData.success && refreshData.timelines) {
                  const timelinesWithDates = refreshData.timelines.map((timeline: any) => ({
                    ...timeline,
                    weddingDate: parseDate(timeline.weddingDate),
                    createdAt: parseDate(timeline.createdAt),
                    updatedAt: parseDate(timeline.updatedAt),
                    lastSynced: timeline.lastSynced ? parseDate(timeline.lastSynced) : undefined,
                    events: (timeline.events || []).map((event: any) => ({
                      ...event,
                      startTime: parseDate(event.startTime),
                      endTime: parseDate(event.endTime),
                      createdAt: parseDate(event.createdAt),
                      updatedAt: parseDate(event.updatedAt)
                    }))
                  }));
                  console.log('Timelines refreshed from server:', timelinesWithDates);
                  setTimelines(timelinesWithDates);
                }
              }
            } catch (error) {
              console.error('Error refreshing timelines:', error);
            }
          }, 1000);
        } else {
          console.error('Delete failed:', data.error);
          showErrorToast(data.error || 'Failed to delete timeline');
        }
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData.error);
        showErrorToast(errorData.error || 'Failed to delete timeline');
      }
    } catch (error) {
      console.error('Error deleting timeline:', error);
      showErrorToast('Failed to delete timeline');
    } finally {
      setShowDeleteModal(false);
      setTimelineToDelete(null);
    }
  };

  // Update event status
  const handleEventUpdate = async (eventId: string, updates: Partial<WeddingTimelineEvent>) => {
    if (!selectedTimeline) return;

    console.log('Updating event:', { eventId, updates, userId: user?.uid, timelineId: selectedTimeline.id });

    // Optimistic update - update UI immediately
    const optimisticTimeline = {
      ...selectedTimeline,
      events: selectedTimeline.events.map(event => 
        event.id === eventId ? { ...event, ...updates, updatedAt: new Date() } : event
      ),
      updatedAt: new Date()
    };
    
    setSelectedTimeline(optimisticTimeline);
    setTimelines(prev => prev.map(t => 
      t.id === selectedTimeline.id ? optimisticTimeline : t
    ));

    try {
      const response = await fetch('/api/timeline/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          timelineId: selectedTimeline.id,
          eventId,
          updates
        }),
      });

      console.log('API response:', response.status, response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('API result:', result);
        
        // If buffer time, start time, or duration was updated, fetch the full updated timeline
        // to get all recalculated events
        if (updates.bufferTime !== undefined || updates.startTime !== undefined || updates.duration !== undefined) {
          console.log('Time-related update detected, fetching updated timeline...');
          setIsUpdatingTimeline(true);
          
          try {
            // Add a small delay to ensure the server has processed the update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Fetch the updated timeline to get all recalculated events
            console.log('Fetching updated timeline from:', `/api/timeline/${selectedTimeline.id}?userId=${user?.uid}`);
            const timelineResponse = await fetch(`/api/timeline/${selectedTimeline.id}?userId=${user?.uid}`);
            console.log('Timeline fetch response:', timelineResponse.status, timelineResponse.ok);
            
            if (timelineResponse.ok) {
              const updatedTimelineData = await timelineResponse.json();
              console.log('Fetched updated timeline:', updatedTimelineData);
              console.log('Updated timeline events:', updatedTimelineData.events?.map(e => ({ 
                title: e.title, 
                startTime: e.startTime, 
                endTime: e.endTime,
                bufferTime: e.bufferTime 
              })));
              
              // Update both selected timeline and timelines array with the fresh data
              console.log('Setting selected timeline to:', updatedTimelineData);
              // Force new object reference to ensure React detects the change
              const newTimelineData = { ...updatedTimelineData };
              setSelectedTimeline(newTimelineData);
              setTimelines(prev => {
                const updated = prev.map(t => 
                  t.id === selectedTimeline.id ? newTimelineData : t
                );
                console.log('Updated timelines array:', updated);
                return updated;
              });
            } else {
              console.error('Failed to fetch updated timeline');
              // Keep the optimistic update since API failed
            }
          } catch (error) {
            console.error('Error fetching updated timeline:', error);
            // Keep the optimistic update since API failed
          } finally {
            setIsUpdatingTimeline(false);
          }
        }
        
        showSuccessToast('Timeline updated');
      } else {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        showErrorToast('Failed to update timeline');
        
        // Revert optimistic update on API failure
        setSelectedTimeline(selectedTimeline);
        setTimelines(prev => prev.map(t => 
          t.id === selectedTimeline.id ? selectedTimeline : t
        ));
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showErrorToast('Failed to update timeline');
      
      // Revert optimistic update on error
      setSelectedTimeline(selectedTimeline);
      setTimelines(prev => prev.map(t => 
        t.id === selectedTimeline.id ? selectedTimeline : t
      ));
    }
  };

  if (isLoading) {
    return <TimelinePageSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <GoogleMapsLoader />
      <WeddingBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Timeline Sidebar */}
            <TimelineSidebar
              timelines={timelines}
              selectedTimeline={selectedTimeline}
              onSelectTimeline={setSelectedTimeline}
              onCreateTimeline={handleGenerateTimeline}
              onCloneTimeline={handleCloneTimeline}
              onDeleteTimeline={handleDeleteTimeline}
              isGenerating={isGenerating}
            />

            {/* Main Content Area */}
            <div className="unified-main-content">
              {selectedTimeline && (
                <TimelineTopBar
                  timeline={selectedTimeline}
                  onAddItem={handleAddTimelineItem}
                  isGenerating={isGenerating}
                  onUpdateTimelineName={handleUpdateTimelineName}
                  onCloneTimeline={handleCloneTimeline}
                  onDeleteTimeline={handleDeleteTimeline}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}

              {/* Wedding Date Bar */}
              {selectedTimeline && (
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Date:</span>
                    <span className="text-gray-900">
                      {parseDate(selectedTimeline.weddingDate).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}


              <div className="flex-1 overflow-y-auto p-4">
                {!selectedTimeline ? (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] py-8">
                    <img src="/Timeline.png" alt="Empty Timeline" className="w-24 h-24 mb-6 opacity-70" />
                    <div className="max-w-md">
                      <h3 className="text-base font-medium text-gray-800 mb-3">Start organizing your wedding day timeline</h3>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        Paige helps you organize your wedding day with smart timelines that coordinate vendors and events for a stress-free celebration.
                      </p>
                      <p className="text-sm text-gray-500 font-medium mb-4">Create your timeline to get started!</p>
                      <div className="flex justify-center">
                        <button
                          onClick={() => setShowTemplatesModal(true)}
                          disabled={isGenerating}
                          className="btn-primary"
                        >
                          Create Timeline
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Timeline Builder */
                  <TimelineBuilder
                    timeline={selectedTimeline}
                    onEventUpdate={handleEventUpdate}
                    onEventDelete={handleEventDelete}
                    onTimelineUpdate={(updatedTimeline) => {
                      setSelectedTimeline(updatedTimeline);
                      setTimelines(prev => prev.map(t =>
                        t.id === updatedTimeline.id ? updatedTimeline : t
                      ));
                    }}
                    isUpdating={isUpdatingTimeline}
                    searchQuery={searchQuery}
                  />
                )}
              </div>

              {/* Fixed Footer */}
              {selectedTimeline && (
                <div className="border-t border-gray-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                      Total duration: {Math.round(selectedTimeline.events.reduce((total, event) => total + event.duration, 0) / 60)} hours
                    </div>
                    {selectedTimeline.lastSynced && (
                      <div>
                        Last synced: {new Date(selectedTimeline.lastSynced).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Sync Modal */}
      <AnimatePresence>
        {showSyncModal && selectedTimeline && (
          <TimelineSync
            timeline={selectedTimeline}
            onClose={() => setShowSyncModal(false)}
            onSyncComplete={() => {
              setShowSyncModal(false);
              showSuccessToast('Timeline synced to calendar!');
            }}
          />
        )}
      </AnimatePresence>

      {/* AI Generation Loading Modal */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <AILoadingIndicator 
              operation="timeline_generation"
              progress={generationProgress}
              showProgress={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && timelineToDelete && (
        <DeleteTimelineConfirmationModal
          timeline={timelineToDelete}
          onConfirm={executeDeleteTimeline}
          onClose={() => {
            setShowDeleteModal(false);
            setTimelineToDelete(null);
          }}
        />
      )}

      {/* Timeline Templates Modal */}
      <TimelineTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleTemplateSelection}
        onCreateWithAI={handleGenerateTimeline}
      />
    </div>
  );
}