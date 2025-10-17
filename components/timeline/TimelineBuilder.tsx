'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users, Phone, Mail, AlertTriangle, CheckCircle, Play, Pause, Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { WeddingTimeline, WeddingTimelineEvent } from '@/types/timeline';
import TimelineEvent from './TimelineEvent';
import BadgeCount from '@/components/BadgeCount';

interface TimelineBuilderProps {
  timeline: WeddingTimeline;
  onEventUpdate: (eventId: string, updates: Partial<WeddingTimelineEvent>) => void;
  onEventDelete: (eventId: string) => void;
  onTimelineUpdate: (timeline: WeddingTimeline) => void;
  isUpdating?: boolean;
  searchQuery?: string;
}

export default function TimelineBuilder({ timeline, onEventUpdate, onEventDelete, onTimelineUpdate, isUpdating = false, searchQuery = '' }: TimelineBuilderProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Sort events by start time
  const sortedEvents = useMemo(() => {
    return [...timeline.events]
      .map(event => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [timeline.events]);

  // Group events by time periods
  const timeGroups = useMemo(() => {
    const groups: { [key: string]: WeddingTimelineEvent[] } = {
      'Early Morning (6-9 AM)': [],
      'Morning (9 AM-12 PM)': [],
      'Afternoon (12-5 PM)': [],
      'Evening (5-9 PM)': [],
      'Night (9 PM+)': []
    };

    // Filter events by search query if provided
    const filteredEvents = searchQuery.trim() 
      ? sortedEvents.filter(event => 
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.vendorContact.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sortedEvents;

    filteredEvents.forEach(event => {
      const hour = event.startTime.getHours();
      if (hour >= 6 && hour < 9) {
        groups['Early Morning (6-9 AM)'].push(event);
      } else if (hour >= 9 && hour < 12) {
        groups['Morning (9 AM-12 PM)'].push(event);
      } else if (hour >= 12 && hour < 17) {
        groups['Afternoon (12-5 PM)'].push(event);
      } else if (hour >= 17 && hour < 21) {
        groups['Evening (5-9 PM)'].push(event);
      } else {
        groups['Night (9 PM+)'].push(event);
      }
    });

    return groups;
  }, [sortedEvents, searchQuery]);


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTimePeriodIcon = (period: string) => {
    switch (period) {
      case 'Early Morning (6-9 AM)': return <Sunrise className="w-4 h-4 text-orange-500" />;
      case 'Morning (9 AM-12 PM)': return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'Afternoon (12-5 PM)': return <Sun className="w-4 h-4 text-orange-400" />;
      case 'Evening (5-9 PM)': return <Sunset className="w-4 h-4 text-red-400" />;
      case 'Night (9 PM+)': return <Moon className="w-4 h-4 text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-lg border">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#A85C36] border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-700">Updating timeline...</span>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="space-y-6">
        {Object.entries(timeGroups).map(([timeGroup, events]) => {
          if (events.length === 0) return null;
          
          return (
            <div key={timeGroup} className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {getTimePeriodIcon(timeGroup)}
                  <h3 className="text-lg font-medium text-gray-900">{timeGroup}</h3>
                  <BadgeCount count={events.length} />
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  {events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <TimelineEvent
                        event={event}
                        isSelected={selectedEvent === event.id}
                        onSelect={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                        onUpdate={(updates) => onEventUpdate(event.id, updates)}
                        onDelete={() => onEventDelete(event.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline Footer */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Timeline created on {new Date(timeline.createdAt).toLocaleDateString()}
            {timeline.lastSynced && (
              <span className="ml-4">
                Last synced: {new Date(timeline.lastSynced).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Total duration: {Math.round(timeline.events.reduce((sum, event) => sum + event.duration, 0) / 60)} hours
          </div>
        </div>
      </div>
    </div>
  );
}
