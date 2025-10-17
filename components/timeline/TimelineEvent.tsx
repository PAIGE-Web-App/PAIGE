'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomToast } from '@/hooks/useCustomToast';
import PlacesAutocompleteInput from '@/components/PlacesAutocompleteInput';
import ContactAutocompleteInput from '@/components/ContactAutocompleteInput';
import AddContactModal from '@/components/AddContactModal';
import { 
  Clock, 
  MapPin, 
  Users, 
  Phone, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { WeddingTimelineEvent } from '@/types/timeline';

interface TimelineEventProps {
  event: WeddingTimelineEvent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WeddingTimelineEvent>) => void;
  onDelete: () => void;
}

export default function TimelineEvent({ event, isSelected, onSelect, onUpdate, onDelete }: TimelineEventProps) {
  const { showSuccessToast } = useCustomToast();
  const [shouldAnimate, setShouldAnimate] = useState(event.isNew || false);

  // Watch for changes to event.isNew and trigger animation
  useEffect(() => {
    if (event.isNew) {
      setShouldAnimate(true);
    }
  }, [event.isNew]);

  // Clear animation after it completes
  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        setShouldAnimate(false);
        // Remove the isNew flag from the event
        if (event.isNew) {
          onUpdate({ isNew: false });
        }
      }, 1200); // Flash for 1.2s (same as todo items)
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate, event.isNew, onUpdate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEndTime = () => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(startTime.getTime() + (event.duration * 60 * 1000));
    return endTime;
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(event.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState(event.description);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationValue, setEditingLocationValue] = useState(event.location);
  const [selectedVenueMetadata, setSelectedVenueMetadata] = useState<any>(null);
  const [selectedLocationType, setSelectedLocationType] = useState<string | null>(null);
  const [isEditingVendorContact, setIsEditingVendorContact] = useState(false);
  const [editingVendorContactValue, setEditingVendorContactValue] = useState(event.vendorContact || '');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const justSelectedLocation = useRef(false);
  const justSelectedContact = useRef(false);
  const locationSaveInProgress = useRef(false);
  const componentId = useRef(`timeline-event-${event.id}-${Math.random().toString(36).substr(2, 9)}`);

  // Listen for autocomplete selection events
  useEffect(() => {
    const handlePlacesAutocompleteSelected = (event: CustomEvent) => {
      console.log('🟢 [TimelineEvent] Received placesAutocompleteSelected event:', event.detail);
      
      // Only respond to events for this specific component
      if (event.detail.componentId !== componentId.current) {
        console.log('🟢 [TimelineEvent] Event not for this component, ignoring');
        return;
      }
      
      justSelectedLocation.current = true;
      
      // Prevent duplicate saves
      if (locationSaveInProgress.current) {
        console.log('🟢 [TimelineEvent] Location save already in progress, skipping');
        return;
      }
      
      locationSaveInProgress.current = true;
      
      // Save immediately with the selected description
      const selectedDescription = event.detail.description;
      console.log('🟢 [TimelineEvent] Auto-saving location immediately with:', selectedDescription);
      onUpdate({ location: selectedDescription });
      setIsEditingLocation(false);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
      showSuccessToast('Event location updated!');
      
      // Reset the flag after a delay to allow for formatted address updates
      setTimeout(() => {
        locationSaveInProgress.current = false;
      }, 1000);
    };

    window.addEventListener('placesAutocompleteSelected', handlePlacesAutocompleteSelected as EventListener);
    
    return () => {
      window.removeEventListener('placesAutocompleteSelected', handlePlacesAutocompleteSelected as EventListener);
    };
  }, [onUpdate, showSuccessToast]);
  const [isEditingBufferTime, setIsEditingBufferTime] = useState(false);
  const [editingBufferTimeValue, setEditingBufferTimeValue] = useState(event.bufferTime.toString());
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [editingStartTimeValue, setEditingStartTimeValue] = useState(() => {
    const date = new Date(event.startTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editingDurationValue, setEditingDurationValue] = useState(() => {
    const endTime = getEndTime();
    return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
  });
  const [justUpdated, setJustUpdated] = useState(false);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const statusPopoverRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in-progress': return <Play className="w-4 h-4" />;
      case 'delayed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Inline editing handlers
  const handleTitleClick = () => {
    setIsEditingTitle(true);
    setEditingTitleValue(event.title);
  };

  const handleTitleSave = () => {
    onUpdate({ title: editingTitleValue });
    setIsEditingTitle(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Event title updated!');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditingTitleValue(event.title);
      setIsEditingTitle(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event selection
    onDelete();
  };

  const handleDescriptionClick = () => {
    setIsEditingDescription(true);
    setEditingDescriptionValue(event.description);
  };

  const handleDescriptionSave = () => {
    onUpdate({ description: editingDescriptionValue });
    setIsEditingDescription(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Event description updated!');
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditingDescriptionValue(event.description);
      setIsEditingDescription(false);
    }
  };

  const handleLocationClick = () => {
    setIsEditingLocation(true);
    setEditingLocationValue(event.location);
  };

  const handleLocationSave = () => {
    console.log('🔴 [TimelineEvent] handleLocationSave called');
    console.log('🔴 [TimelineEvent] editingLocationValue:', editingLocationValue);
    console.log('🔴 [TimelineEvent] selectedVenueMetadata:', selectedVenueMetadata);
    console.log('🔴 [TimelineEvent] selectedVenueMetadata?.formatted_address:', selectedVenueMetadata?.formatted_address);
    
    // If we have venue metadata, use the formatted address, otherwise use the input value
    const locationValue = selectedVenueMetadata?.formatted_address || editingLocationValue;
    console.log('🔴 [TimelineEvent] Final locationValue to save:', locationValue);
    
    onUpdate({ location: locationValue });
    setIsEditingLocation(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Event location updated!');
  };

  const handleLocationBlur = () => {
    console.log('🟣 [TimelineEvent] handleLocationBlur called');
    console.log('🟣 [TimelineEvent] justSelectedLocation.current:', justSelectedLocation.current);
    console.log('🟣 [TimelineEvent] Current editingLocationValue:', editingLocationValue);
    console.log('🟣 [TimelineEvent] Current selectedVenueMetadata:', selectedVenueMetadata);
    
    // If we just selected a location, skip the blur handler
    if (justSelectedLocation.current) {
      console.log('🟣 [TimelineEvent] Skipping blur - just selected location');
      justSelectedLocation.current = false;
      return;
    }
    
    // Add a small delay to allow for suggestion selection
    setTimeout(() => {
      handleLocationSave();
    }, 150);
  };

  const handleVendorContactClick = () => {
    setIsEditingVendorContact(true);
  };

  const handleVendorContactSave = () => {
    console.log('🔴 [TimelineEvent] handleVendorContactSave called');
    console.log('🔴 [TimelineEvent] editingVendorContactValue:', editingVendorContactValue);
    console.log('🔴 [TimelineEvent] selectedContact:', selectedContact);
    
    onUpdate({ vendorContact: editingVendorContactValue });
    setIsEditingVendorContact(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Vendor contact updated!');
  };

  const handleVendorContactKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVendorContactSave();
    } else if (e.key === 'Escape') {
      setEditingVendorContactValue(event.vendorContact || '');
      setIsEditingVendorContact(false);
    }
  };

  const handleVendorContactBlur = () => {
    console.log('🟣 [TimelineEvent] handleVendorContactBlur called');
    console.log('🟣 [TimelineEvent] justSelectedContact.current:', justSelectedContact.current);
    console.log('🟣 [TimelineEvent] Current editingVendorContactValue:', editingVendorContactValue);
    console.log('🟣 [TimelineEvent] Current selectedContact:', selectedContact);
    
    // If we just selected a contact, skip the blur handler
    if (justSelectedContact.current) {
      console.log('🟣 [TimelineEvent] Skipping blur - just selected contact');
      justSelectedContact.current = false;
      return;
    }
    
    // Add a small delay to allow for suggestion selection
    setTimeout(() => {
      handleVendorContactSave();
    }, 150);
  };

  const handleAddNewContact = () => {
    setShowAddContactModal(true);
  };

  const handleAddContactSuccess = (newContact: any) => {
    const contactInfo = `${newContact.name}${newContact.email ? ` - ${newContact.email}` : ''}${newContact.phone ? ` - ${newContact.phone}` : ''}`;
    setEditingVendorContactValue(contactInfo);
    setShowAddContactModal(false);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLocationSave();
    } else if (e.key === 'Escape') {
      setEditingLocationValue(event.location);
      setIsEditingLocation(false);
    }
  };


  const handleBufferTimeClick = () => {
    setIsEditingBufferTime(true);
    setEditingBufferTimeValue(event.bufferTime.toString());
  };

  const handleBufferTimeSave = () => {
    const bufferTime = parseInt(editingBufferTimeValue) || 0;
    onUpdate({ bufferTime });
    setIsEditingBufferTime(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Buffer time updated!');
  };

  const handleBufferTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBufferTimeSave();
    } else if (e.key === 'Escape') {
      setEditingBufferTimeValue(event.bufferTime.toString());
      setIsEditingBufferTime(false);
    }
  };

  const handleStartTimeClick = () => {
    setIsEditingStartTime(true);
    const date = new Date(event.startTime);
    setEditingStartTimeValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
  };

  const handleStartTimeSave = () => {
    const [hours, minutes] = editingStartTimeValue.split(':').map(Number);
    const newStartTime = new Date(event.startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    const newEndTime = new Date(newStartTime.getTime() + (event.duration * 60 * 1000));
    
    console.log('Updating start time:', { newStartTime, newEndTime, duration: event.duration });
    onUpdate({ 
      startTime: newStartTime,
      endTime: newEndTime
    });
    setIsEditingStartTime(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Start time updated!');
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleStartTimeSave();
    } else if (e.key === 'Escape') {
      const date = new Date(event.startTime);
      setEditingStartTimeValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
      setIsEditingStartTime(false);
    }
  };

  const handleDurationClick = () => {
    setIsEditingDuration(true);
    const endTime = getEndTime();
    setEditingDurationValue(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`);
  };

  const handleDurationSave = () => {
    const [hours, minutes] = editingDurationValue.split(':').map(Number);
    const newEndTime = new Date(event.startTime);
    newEndTime.setHours(hours, minutes, 0, 0);
    const duration = Math.round((newEndTime.getTime() - event.startTime.getTime()) / (1000 * 60));
    
    console.log('Updating duration:', { duration, newEndTime, startTime: event.startTime });
    onUpdate({ 
      duration,
      endTime: newEndTime
    });
    setIsEditingDuration(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('End time updated!');
  };

  const handleDurationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDurationSave();
    } else if (e.key === 'Escape') {
      const endTime = getEndTime();
      setEditingDurationValue(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`);
      setIsEditingDuration(false);
    }
  };

  const handleStatusChange = (newStatus: WeddingTimelineEvent['status']) => {
    onUpdate({ status: newStatus });
    setShowStatusPopover(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    showSuccessToast('Event status updated!');
  };

  // Click outside handler for status popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(event.target as Node)) {
        setShowStatusPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <motion.div
      id={`timeline-event-${event.id}`}
      layout
      className={`border border-gray-200 rounded-lg transition-all duration-200 ${
        isSelected 
          ? 'border-purple-300 bg-purple-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      } ${shouldAnimate ? 'bg-green-100' : ''}`}
      onClick={onSelect}
    >
      {/* Event Header - Always Visible */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Time and Status */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Clock className="w-4 h-4" />
                {isEditingStartTime ? (
                  <input
                    type="time"
                    value={editingStartTimeValue}
                    onChange={(e) => setEditingStartTimeValue(e.target.value)}
                    onBlur={handleStartTimeSave}
                    onKeyDown={handleStartTimeKeyDown}
                    className="border border-[#AB9C95] px-2 py-1 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                    onClick={handleStartTimeClick}
                    title="Click to edit start time"
                  >
                    {formatTime(event.startTime)}
                  </span>
                )}
                <span className="text-gray-500">-</span>
                {isEditingDuration ? (
                  <input
                    type="time"
                    value={editingDurationValue}
                    onChange={(e) => setEditingDurationValue(e.target.value)}
                    onBlur={handleDurationSave}
                    onKeyDown={handleDurationKeyDown}
                    className="border border-[#AB9C95] px-2 py-1 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                    onClick={handleDurationClick}
                    title="Click to edit end time"
                  >
                    {formatTime(getEndTime())} ({event.duration} min)
                  </span>
                )}
              </div>
              
              <div className="relative" ref={statusPopoverRef}>
                <button
                  onClick={() => setShowStatusPopover(!showStatusPopover)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                >
                  {getStatusIcon(event.status)}
                  {event.status.replace('-', ' ')}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                
                <AnimatePresence>
                  {showStatusPopover && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleStatusChange('pending')}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Pending
                        </button>
                        <button
                          onClick={() => handleStatusChange('in-progress')}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          In Progress
                        </button>
                        <button
                          onClick={() => handleStatusChange('completed')}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </button>
                        <button
                          onClick={() => handleStatusChange('delayed')}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Delayed
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Event Title - Inline Editable */}
            {isEditingTitle ? (
              <input
                type="text"
                value={editingTitleValue}
                onChange={(e) => setEditingTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="text-base font-medium text-gray-900 mb-2 border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] w-full"
                style={{ fontFamily: 'Work Sans, sans-serif' }}
                autoFocus
              />
            ) : (
              <h3 
                className="text-base font-medium text-gray-900 mb-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                style={{ fontFamily: 'Work Sans, sans-serif' }}
                onClick={handleTitleClick}
                title="Click to edit"
              >
                {event.title}
              </h3>
            )}
            
            {/* Event Description - Inline Editable */}
            {isEditingDescription ? (
              <textarea
                value={editingDescriptionValue}
                onChange={(e) => setEditingDescriptionValue(e.target.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={handleDescriptionKeyDown}
                className="text-gray-600 text-sm mb-3 border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] w-full resize-none"
                rows={2}
                autoFocus
              />
            ) : (
              <p 
                className="text-gray-600 text-sm mb-3 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                onClick={handleDescriptionClick}
                title="Click to edit"
              >
                {event.description}
              </p>
            )}

            {/* Event Details - Inline Editable Location */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {isEditingLocation ? (
                  <div className="w-80">
                    <PlacesAutocompleteInput
                      value={editingLocationValue}
                      onChange={(newValue) => {
                        console.log('🟢 [TimelineEvent] PlacesAutocomplete onChange called with:', newValue);
                        console.log('🟢 [TimelineEvent] Current editingLocationValue:', editingLocationValue);
                        setEditingLocationValue(newValue);
                        console.log('🟢 [TimelineEvent] Set editingLocationValue to:', newValue);
                        if (!newValue) {
                          setSelectedVenueMetadata(null);
                        }
                      }}
                      setVenueMetadata={(metadata) => {
                        console.log('🟢 [TimelineEvent] setVenueMetadata called with:', metadata);
                        console.log('🟢 [TimelineEvent] Metadata name:', metadata?.name);
                        console.log('🟢 [TimelineEvent] Metadata formatted_address:', metadata?.formatted_address);
                        
                        setSelectedVenueMetadata(metadata);
                        if (metadata) {
                          // Update the input value directly, following signup flow pattern
                          console.log('🟢 [TimelineEvent] Updating editingLocationValue to metadata.name:', metadata.name);
                          setEditingLocationValue(metadata.name);
                          
                          // If we have a formatted address, update the saved location with the better formatted version
                          // Only do this if we're not in the middle of saving from the selection
                          if (metadata.formatted_address && metadata.formatted_address !== metadata.name && !locationSaveInProgress.current) {
                            setTimeout(() => {
                              console.log('🟢 [TimelineEvent] Updating location with formatted address:', metadata.formatted_address);
                              onUpdate({ location: metadata.formatted_address });
                            }, 100);
                          }
                        } else {
                          console.log('🟢 [TimelineEvent] No metadata received');
                        }
                      }}
                      setSelectedLocationType={setSelectedLocationType}
                      placeholder="Search for a location"
                      types={['geocode', 'establishment']}
                      onBlur={handleLocationBlur}
                      componentId={componentId.current}
                    />
                  </div>
                ) : (
                  <span 
                    className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                    onClick={handleLocationClick}
                    title="Click to edit"
                  >
                    {event.location}
                  </span>
                )}
              </div>
              
            </div>
          </div>

          {/* No action buttons needed - everything is inline editable */}
        </div>
      </div>

      {/* Always Visible Details */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-lg">

        {/* Buffer Time and Vendor Contact - Side by Side */}
        <div className="flex items-center justify-between">
          {/* Buffer Time - Inline Editable */}
          <div className="text-sm text-gray-600 flex items-center">
            <span className="font-medium">Buffer time:</span> 
            {isEditingBufferTime ? (
              <input
                type="number"
                value={editingBufferTimeValue}
                onChange={(e) => setEditingBufferTimeValue(e.target.value)}
                onBlur={handleBufferTimeSave}
                onKeyDown={handleBufferTimeKeyDown}
                className="border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] ml-1 w-20"
                autoFocus
              />
            ) : (
              <span 
                className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 ml-1"
                onClick={handleBufferTimeClick}
                title="Click to edit"
              >
                {event.bufferTime} minutes
              </span>
            )}
          </div>

          {/* Vendor Contact - Inline Editable */}
          <div className="text-sm text-gray-600 flex items-center">
            <Phone className="w-4 h-4 text-gray-400 mr-1" />
            <span className="font-medium mr-1">Vendor Contact:</span>
            {isEditingVendorContact ? (
              <div className="w-60">
                <ContactAutocompleteInput
                  value={editingVendorContactValue}
                  onChange={(newValue) => {
                    console.log('🟢 [TimelineEvent] ContactAutocomplete onChange called with:', newValue);
                    console.log('🟢 [TimelineEvent] Current editingVendorContactValue:', editingVendorContactValue);
                    setEditingVendorContactValue(newValue);
                    console.log('🟢 [TimelineEvent] Set editingVendorContactValue to:', newValue);
                  }}
                  onContactSelect={(contact) => {
                    console.log('🟢 [TimelineEvent] onContactSelect called with:', contact);
                    
                    // Set the flag to prevent blur from firing
                    justSelectedContact.current = true;
                    
                    setSelectedContact(contact);
                    if (contact) {
                      const contactInfo = `${contact.name}${contact.email ? ` - ${contact.email}` : ''}${contact.phone ? ` - ${contact.phone}` : ''}`;
                      console.log('🟢 [TimelineEvent] Updating editingVendorContactValue to:', contactInfo);
                      setEditingVendorContactValue(contactInfo);
                      
                      // Save immediately
                      setTimeout(() => {
                        console.log('🟢 [TimelineEvent] Auto-saving vendor contact after selection');
                        onUpdate({ vendorContact: contactInfo });
                        setIsEditingVendorContact(false);
                        setJustUpdated(true);
                        setTimeout(() => setJustUpdated(false), 1000);
                        showSuccessToast('Vendor contact updated!');
                      }, 100);
                    }
                  }}
                  placeholder="Search contacts..."
                  onAddNewContact={handleAddNewContact}
                  onBlur={handleVendorContactBlur}
                />
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                onClick={handleVendorContactClick}
                title="Click to edit"
              >
                {event.vendorContact || 'Click to add vendor contact'}
              </span>
            )}
          </div>
        </div>



        {/* Dependencies */}
        {event.dependencies && event.dependencies.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Depends On</h4>
            <div className="flex flex-wrap gap-2">
              {event.dependencies.map((depId, index) => (
                <span 
                  key={depId}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  Event {index + 1}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <AddContactModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          onSave={handleAddContactSuccess}
          initialName={editingVendorContactValue}
        />
      )}
    </motion.div>
  );
}
