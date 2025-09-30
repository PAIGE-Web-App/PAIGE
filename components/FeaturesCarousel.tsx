'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, DollarSign, ClipboardList, Users, Heart, Calendar, Camera, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import FeatureCard from './FeatureCard';
import MessagingCard from './MessagingCard';
import TodoCard from './TodoCard';
import SeatingCard from './SeatingCard';
import BudgetCard from './BudgetCard';

const features = [
  {
    id: 'messaging',
    title: 'AI-Powered Messaging',
    description: 'Draft friendly, on-brand vendor emails in seconds.',
    color: '#a34d54',
    backgroundImage: undefined,
    bottomImage: '/photographers.png',
    generatedByPaige: true,
    mockupTitle: 'Email Draft'
  },
  {
    id: 'budget',
    title: 'Smart Budget Planning',
    description: 'Budgets built around your location, date, and guest count.',
    color: '#52862b',
    backgroundImage: undefined,
    bottomImage: '/wedbudget.png',
    generatedByPaige: true,
    mockupTitle: 'Budget'
  },
  {
    id: 'todos',
    title: 'Intelligent To-Dos',
    description: 'Connect Gmail once. Paige suggests new to-dos automatically!',
    color: '#654d74',
    backgroundImage: undefined,
    bottomImage: '/better.png',
    generatedByPaige: true,
    mockupTitle: 'Wedding To-Dos'
  },
  {
    id: 'seating',
    title: 'Seating Charts',
    description: 'Sketch your seating chart and save mood-board notes.',
    color: '#424d6b',
    backgroundImage: undefined,
    bottomImage: '/guests.png',
    generatedByPaige: true,
    mockupTitle: 'Seating Chart'
  },
  {
    id: 'moodboards',
    title: 'Mood Boards',
    description: 'Create beautiful visual inspiration boards to share.',
    color: '#3b82f6',
    backgroundImage: undefined,
    bottomImage: '/vibegen.png',
    generatedByPaige: true,
    mockupTitle: 'Wedding Vibes'
  },
  {
    id: 'calendar',
    title: 'Wedding Calendar',
    description: 'Sync with Google Calendar and get smart reminders.',
    color: '#00957d',
    backgroundImage: undefined,
    bottomImage: '/file manager.png',
    generatedByPaige: true,
    mockupTitle: 'Calendar Events'
  }
];

// Content components for each feature
const BudgetContent = () => {
  const budgetData = {
    venue: "$8,500",
    catering: "$12,000", 
    allocated: "$23,700",
    flexibility: "$1,300"
  };

  return (
    <div className="space-y-1 w-full">
      <div className="text-xs text-[#5A4A42]">Venue: {budgetData.venue}</div>
      <div className="text-xs text-[#5A4A42]">Catering: {budgetData.catering}</div>
      <div className="text-xs font-semibold text-[#5A4A42]">
        Tot. Allocated: {budgetData.allocated} | Flexibility: {budgetData.flexibility}
      </div>
    </div>
  );
};

const MessagingContent = () => (
  <div className="space-y-2 w-full">
    <div className="text-xs text-[#5A4A42] font-semibold">Wedding Photography Inquiry</div>
    <div className="text-xs text-[#5A4A42]">Hi Sarah! I hope this email finds you well...</div>
    <div className="text-xs text-[#8B5CF6]">Draft • Ready to send</div>
  </div>
);

const TodosContent = () => (
  <div className="space-y-2 w-full">
    <div className="text-xs text-[#5A4A42]">✓ Book photographer</div>
    <div className="text-xs text-[#5A4A42]">○ Order invitations</div>
    <div className="text-xs text-[#5A4A42]">○ Schedule hair trial</div>
    <div className="text-xs text-[#8B5CF6]">3 of 12 completed</div>
  </div>
);

const SeatingContent = () => (
  <div className="space-y-2 w-full">
    <div className="text-xs text-[#5A4A42] font-semibold">8 Tables • 120 Guests</div>
    <div className="text-xs text-[#5A4A42]">U-shaped layout</div>
  </div>
);

const MoodboardContent = () => (
  <div className="space-y-2 w-full">
    <div className="text-xs text-[#5A4A42]">5 vibes generated</div>
    <div className="flex flex-wrap gap-1">
      {['Outdoors', 'Minimal', 'Clean', 'Nature', 'Elegant'].map((vibe, i) => (
        <div key={i} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded-full">
          {vibe}
        </div>
      ))}
    </div>
  </div>
);

const CalendarContent = () => (
  <div className="space-y-2 w-full">
    <div className="text-xs text-[#5A4A42] font-semibold">15 Events This Month</div>
    <div className="text-xs text-[#5A4A42]">Next: Dress Fitting</div>
    <div className="text-xs text-[#5A4A42]">March 15th</div>
  </div>
);

export default function FeaturesGrid() {
  const getContent = (featureId: string) => {
    switch (featureId) {
      case 'budget':
        return <BudgetContent />;
      case 'messaging':
        return <MessagingContent />;
      case 'todos':
        return <TodosContent />;
      case 'seating':
        return <SeatingContent />;
      case 'moodboards':
        return <MoodboardContent />;
      case 'calendar':
        return <CalendarContent />;
      default:
        return <div>Coming Soon</div>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => {
        if (feature.id === 'messaging') {
          return (
            <MessagingCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              backgroundImage={feature.backgroundImage}
              bottomImage={feature.bottomImage}
              generatedByPaige={feature.generatedByPaige}
              mockupTitle={feature.mockupTitle}
            />
          );
        }
        
        if (feature.id === 'todos') {
          return (
            <TodoCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              backgroundImage={feature.backgroundImage}
              bottomImage={feature.bottomImage}
              generatedByPaige={feature.generatedByPaige}
              mockupTitle={feature.mockupTitle}
            />
          );
        }
        
        if (feature.id === 'budget') {
          return (
            <BudgetCard
              key={feature.id}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              backgroundImage={feature.backgroundImage}
              bottomImage={feature.bottomImage}
              generatedByPaige={feature.generatedByPaige}
              mockupTitle={feature.mockupTitle}
            />
          );
        }
        
        return (
          <FeatureCard
            key={feature.id}
            title={feature.title}
            description={feature.description}
            color={feature.color}
            backgroundImage={feature.backgroundImage}
            bottomImage={feature.bottomImage}
            generatedByPaige={feature.generatedByPaige}
            mockupTitle={feature.id === 'moodboards' ? 'Wedding Vibes' : feature.id === 'seating' ? 'Seating Chart' : feature.id === 'calendar' ? 'Calendar Events' : undefined}
            content={getContent(feature.id)}
          />
        );
      })}
    </div>
  );
}
