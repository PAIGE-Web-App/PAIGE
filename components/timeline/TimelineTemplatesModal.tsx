'use client';

import React, { useState } from 'react';
import { X, Sparkles, Calendar, Clock, Users, Heart, Camera, Music, Utensils, MapPin, Car, Gift, ChevronRight, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import CategoryPill from '../CategoryPill';

interface TimelineTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TimelineTemplate) => void;
  onCreateWithAI: () => void;
}

interface TimelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  estimatedTime: string;
  eventCount: number;
  events: Array<{ 
    name: string; 
    time: string; 
    duration: string; 
    description?: string;
    category: 'ceremony' | 'reception' | 'photos' | 'preparation' | 'travel' | 'other';
  }>;
  isRecommended?: boolean;
  recommendedText?: string;
}

const TIMELINE_TEMPLATES: TimelineTemplate[] = [
  {
    id: 'traditional-wedding',
    name: 'Traditional Wedding Day',
    description: 'Classic wedding timeline with ceremony and reception',
    icon: <Heart className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-600',
    estimatedTime: '8-10 hours',
    eventCount: 12,
    isRecommended: true,
    events: [
      { name: 'Hair & Makeup', time: '8:00 AM', duration: '2 hours', description: 'Bridal party preparation', category: 'preparation' },
      { name: 'Getting Ready Photos', time: '10:00 AM', duration: '1 hour', description: 'Bridal suite photos', category: 'photos' },
      { name: 'First Look', time: '11:00 AM', duration: '30 minutes', description: 'Private moment before ceremony', category: 'photos' },
      { name: 'Wedding Party Photos', time: '11:30 AM', duration: '1 hour', description: 'Bridal party and family photos', category: 'photos' },
      { name: 'Ceremony Setup', time: '12:30 PM', duration: '30 minutes', description: 'Final ceremony preparations', category: 'ceremony' },
      { name: 'Ceremony', time: '1:00 PM', duration: '30 minutes', description: 'Wedding ceremony', category: 'ceremony' },
      { name: 'Cocktail Hour', time: '1:30 PM', duration: '1 hour', description: 'Guests enjoy cocktails while photos are taken', category: 'reception' },
      { name: 'Couple Photos', time: '2:00 PM', duration: '45 minutes', description: 'Golden hour couple photos', category: 'photos' },
      { name: 'Reception Setup', time: '2:45 PM', duration: '15 minutes', description: 'Transition to reception', category: 'reception' },
      { name: 'Reception', time: '3:00 PM', duration: '4 hours', description: 'Dinner, dancing, and celebration', category: 'reception' },
      { name: 'Send-off', time: '7:00 PM', duration: '30 minutes', description: 'Grand exit and departure', category: 'other' },
      { name: 'After Party', time: '8:00 PM', duration: '2 hours', description: 'Optional after party celebration', category: 'other' }
    ]
  },
  {
    id: 'intimate-wedding',
    name: 'Intimate Wedding',
    description: 'Smaller, more personal celebration',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-600',
    estimatedTime: '6-8 hours',
    eventCount: 8,
    events: [
      { name: 'Getting Ready', time: '10:00 AM', duration: '2 hours', description: 'Relaxed preparation time', category: 'preparation' },
      { name: 'First Look', time: '12:00 PM', duration: '30 minutes', description: 'Private moment together', category: 'photos' },
      { name: 'Ceremony', time: '12:30 PM', duration: '30 minutes', description: 'Intimate ceremony', category: 'ceremony' },
      { name: 'Cocktail Hour', time: '1:00 PM', duration: '1 hour', description: 'Socializing with close friends and family', category: 'reception' },
      { name: 'Photos', time: '2:00 PM', duration: '1 hour', description: 'Couple and group photos', category: 'photos' },
      { name: 'Reception', time: '3:00 PM', duration: '3 hours', description: 'Dinner and celebration', category: 'reception' },
      { name: 'Send-off', time: '6:00 PM', duration: '30 minutes', description: 'Departure', category: 'other' },
      { name: 'After Party', time: '7:00 PM', duration: '2 hours', description: 'Extended celebration', category: 'other' }
    ]
  },
  {
    id: 'destination-wedding',
    name: 'Destination Wedding',
    description: 'Wedding away from home with extended timeline',
    icon: <MapPin className="w-4 h-4" />,
    color: 'bg-green-100 text-green-600',
    estimatedTime: '3 days',
    eventCount: 15,
    events: [
      { name: 'Welcome Dinner', time: 'Day 1 - 6:00 PM', duration: '3 hours', description: 'Welcome guests to destination', category: 'reception' },
      { name: 'Rehearsal Dinner', time: 'Day 2 - 5:00 PM', duration: '3 hours', description: 'Rehearsal and dinner', category: 'reception' },
      { name: 'Getting Ready', time: 'Day 3 - 9:00 AM', duration: '3 hours', description: 'Bridal party preparation', category: 'preparation' },
      { name: 'Ceremony', time: 'Day 3 - 12:00 PM', duration: '1 hour', description: 'Destination ceremony', category: 'ceremony' },
      { name: 'Cocktail Hour', time: 'Day 3 - 1:00 PM', duration: '1 hour', description: 'Post-ceremony celebration', category: 'reception' },
      { name: 'Photos', time: 'Day 3 - 2:00 PM', duration: '2 hours', description: 'Scenic destination photos', category: 'photos' },
      { name: 'Reception', time: 'Day 3 - 4:00 PM', duration: '4 hours', description: 'Main celebration', category: 'reception' },
      { name: 'Send-off', time: 'Day 3 - 8:00 PM', duration: '1 hour', description: 'Grand exit', category: 'other' },
      { name: 'After Party', time: 'Day 3 - 9:00 PM', duration: '3 hours', description: 'Extended celebration', category: 'other' }
    ]
  },
  {
    id: 'elopement',
    name: 'Elopement',
    description: 'Simple, intimate ceremony for two',
    icon: <Heart className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-600',
    estimatedTime: '2-4 hours',
    eventCount: 5,
    events: [
      { name: 'Getting Ready', time: '10:00 AM', duration: '1 hour', description: 'Simple preparation', category: 'preparation' },
      { name: 'Travel to Location', time: '11:00 AM', duration: '30 minutes', description: 'Travel to ceremony spot', category: 'travel' },
      { name: 'Ceremony', time: '11:30 AM', duration: '30 minutes', description: 'Intimate ceremony', category: 'ceremony' },
      { name: 'Photos', time: '12:00 PM', duration: '2 hours', description: 'Couple photos at scenic location', category: 'photos' },
      { name: 'Celebration Dinner', time: '2:00 PM', duration: '2 hours', description: 'Private celebration meal', category: 'reception' }
    ]
  }
];

export default function TimelineTemplatesModal({ isOpen, onClose, onSelectTemplate, onCreateWithAI }: TimelineTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TimelineTemplate | null>(null);
  const [openEvents, setOpenEvents] = useState<{ [key: string]: boolean }>({});
  
  const { weddingDate } = useUserProfileData();

  const handleTemplateSelect = (template: TimelineTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  const toggleEvents = (templateId: string) => {
    setOpenEvents(prev => ({
      ...prev,
      [templateId]: !prev[templateId]
    }));
  };

  const handleCreateWithAI = () => {
    onCreateWithAI();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full h-[80vh] md:h-[85vh] flex flex-col relative mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-[#A85C36] bg-opacity-10 rounded-full p-2">
                  <CheckCircle className="w-6 h-6 text-[#A85C36]" />
                </div>
                <h5 className="h5">Quick Start with Timeline Templates</h5>
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
            <div className="flex-1 overflow-y-auto p-6 modal-content-scrollable">
              {!selectedTemplate ? (
                <>
                  <div className="mb-4">
                    {/* Purple AI Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                        <div className="flex-1">
                          <p className="text-sm text-purple-800 font-medium mb-1">
                            Want a hyper-personalized timeline?
                          </p>
                          <p className="text-xs text-purple-600">
                            Generate a custom timeline tailored to your specific wedding needs and preferences
                          </p>
                        </div>
                        <button
                          onClick={handleCreateWithAI}
                          className="btn-gradient-purple flex items-center gap-2 w-full md:w-auto md:ml-4 flex-shrink-0 justify-center md:justify-start"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate with Paige (4 Credits)
                        </button>
                      </div>
                    </div>

                    {/* Separator Line */}
                    <div className="border-b border-gray-300 mb-4"></div>

                    <p className="text-sm text-gray-600 text-left mb-4">
                      Select timeline templates below to get started quickly. You can customize events later.
                    </p>
                    
                  </div>

                  {/* Template Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {TIMELINE_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className="p-3 md:p-4 rounded-lg border-2 transition-colors duration-200 text-left relative cursor-pointer border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col h-full"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {template.icon}
                            <span className="font-semibold text-xs">{template.name}</span>
                          </div>
                          {/* Recommended pill on same line, right aligned */}
                          {template.isRecommended && (
                            <CategoryPill category={template.recommendedText || "Recommended"} />
                          )}
                        </div>
                        <div className="text-sm opacity-75 mb-4 flex-grow">
                          {template.description}
                        </div>
                        
                        <div className="mt-auto flex flex-col">
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{template.estimatedTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{template.eventCount} events</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Selected Template Details */
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {selectedTemplate.icon}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{selectedTemplate.name}</h3>
                      <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                    </div>
                  </div>

                  {/* Blue info banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      We'll use your wedding day to determine the date of the timeline!
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-0">
                      {/* Header Row */}
                      <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide py-2 border-b border-gray-300 mb-2">
                        <div>Event</div>
                        <div className="text-center">Time</div>
                        <div className="text-right">Duration</div>
                      </div>
                      
                      {/* Event Rows */}
                      {selectedTemplate.events.map((event, index) => (
                        <div key={index}>
                          <div className="grid grid-cols-3 gap-4 text-sm py-3">
                            <div className="font-medium text-gray-900">{event.name}</div>
                            <div className="text-gray-500 text-center">{event.time}</div>
                            <div className="text-gray-400 text-right">({event.duration})</div>
                          </div>
                          {event.description && (
                            <div className="text-gray-600 text-xs mb-2 ml-0">{event.description}</div>
                          )}
                          {index < selectedTemplate.events.length - 1 && (
                            <div className="border-b border-gray-200"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-between p-4 md:p-6 border-t border-[#E0DBD7] bg-gray-50 flex-shrink-0">
              <div className="text-sm text-gray-500">
                {selectedTemplate ? `Selected: ${selectedTemplate.name}` : 'Choose a template to continue'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={selectedTemplate ? () => setSelectedTemplate(null) : onClose}
                  className="btn-primaryinverse"
                >
                  {selectedTemplate ? 'Back' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmSelection}
                  disabled={!selectedTemplate}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use Template
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
