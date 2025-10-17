'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Clock, CheckCircle, Copy, Trash2 } from 'lucide-react';
import { WeddingTimeline } from '@/types/timeline';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineSidebarProps {
  timelines: WeddingTimeline[];
  selectedTimeline: WeddingTimeline | null;
  onSelectTimeline: (timeline: WeddingTimeline | null) => void;
  onCreateTimeline: () => void;
  onCloneTimeline: (timeline: WeddingTimeline) => void;
  onDeleteTimeline: (timeline: WeddingTimeline) => void;
  isGenerating: boolean;
}

export default function TimelineSidebar({
  timelines,
  selectedTimeline,
  onSelectTimeline,
  onCreateTimeline,
  onCloneTimeline,
  onDeleteTimeline,
  isGenerating
}: TimelineSidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Check if click is on any of the menu buttons
        const clickedButton = Array.from(buttonRefs.current.values()).find(
          button => button?.contains(event.target as Node)
        );
        if (!clickedButton) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="unified-sidebar">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#332B42]">Timelines</h2>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openTimelineTemplatesModal'))}
            disabled={isGenerating}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-2 flex items-center h-7 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Create new timeline"
          >
            + New
          </button>
        </div>

        {/* Timeline List */}
        <div className="space-y-1">
          {timelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <img 
                src="/Timeline.png" 
                alt="No timelines" 
                className="w-24 h-24 mb-4 opacity-60"
              />
              <p className="text-sm text-[#7A7A7A] text-center">
                No timelines yet. Create a New timeline to get started!
              </p>
            </div>
          ) : (
            timelines.map((timeline) => {
              const isSelected = selectedTimeline?.id === timeline.id;
              const completedCount = timeline.events.filter(e => e.status === 'completed').length;
              const totalCount = timeline.events.length;
              const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <motion.div
                  key={timeline.id}
                  layout
                  className={`
                    relative rounded-md p-3 cursor-pointer transition-all
                    ${isSelected 
                      ? 'bg-purple-50 border-2 border-purple-300' 
                      : 'bg-white border border-[#E0DBD7] hover:border-[#AB9C95]'
                    }
                  `}
                  onClick={() => onSelectTimeline(timeline)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-[#332B42] text-sm" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                        {timeline.name || 'Wedding Day Timeline'}
                      </h3>
                      <p className="text-xs text-[#7A7A7A] mt-1">
                        {totalCount} event{totalCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <button
                      ref={(el) => {
                        if (el) buttonRefs.current.set(timeline.id, el);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === timeline.id ? null : timeline.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-[#7A7A7A]" />
                    </button>
                    
                    {/* Popover Menu */}
                    {openMenuId === timeline.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-8 z-50 bg-white border border-[#E0DBD7] rounded-md shadow-lg py-1 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloneTimeline(timeline);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Clone
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTimeline(timeline);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-[#7A7A7A]">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {completedCount}/{totalCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(timeline.weddingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="selected-timeline-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-l-md"
                    />
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}