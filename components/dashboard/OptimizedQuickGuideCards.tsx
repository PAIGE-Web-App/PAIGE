import React, { useState, useMemo } from 'react';
import { User, Palette, MessageSquare, DollarSign, ClipboardList } from 'lucide-react';
import QuickGuideCard from './QuickGuideCard';
import WhyImportantModal from './WhyImportantModal';
import { SkeletonBase, SkeletonText, SkeletonTitle, SkeletonProgressBar } from '../skeletons/SkeletonBase';
import { useDashboardData } from '@/hooks/useDashboardData';

interface OptimizedQuickGuideCardsProps {
  onOpenWelcomeModal?: () => void;
}

export default function OptimizedQuickGuideCards({ onOpenWelcomeModal }: OptimizedQuickGuideCardsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const { userData, progressData, loading } = useDashboardData();

  // Define guide cards data with useMemo to prevent recreation on every render
  const guideCards = useMemo(() => [
    {
      id: 'profile',
      title: 'Finish Your Profile',
      description: 'Complete the rest of your account information for Paige to work optimally',
      completed: !!(userData?.partnerName),
      icon: <User className="w-5 h-5" />,
      link: '/settings?tab=profile',
      actionText: userData?.partnerName ? 'Update Profile' : 'Complete Profile',
      whyImportant: {
        title: 'Why is completing your profile important?',
        content: 'Paige uses your profile information to provide personalized recommendations, accurate timelines, and tailored vendor suggestions. Without your partner\'s name and wedding details, Paige can\'t give you the most relevant advice for your specific wedding.'
      }
    },
    {
      id: 'style',
      title: 'Define your wedding style',
      description: 'Find the perfect vibe for your big day',
      completed: !!(progressData?.hasMoodboards),
      icon: <Palette className="w-5 h-5" />,
      link: '/moodboards',
      actionText: progressData?.hasMoodboards ? 'Set Wedding Vibes' : 'Set Wedding Vibes',
      whyImportant: {
        title: 'Why is defining your wedding style important?',
        content: 'Your wedding style guides every decision from venue selection to vendor choices. Paige uses your style preferences to generate personalized content drafts when messaging vendors in your unified inbox, ensuring your communications reflect your unique aesthetic and vision.'
      }
    },
    {
      id: 'contacts',
      title: 'Explore your unified inbox',
      description: 'Have all vendor communications in one place and use AI to draft your messages',
      completed: !!(progressData?.hasContacts),
      icon: <MessageSquare className="w-5 h-5" />,
      link: '/messages',
      actionText: progressData?.hasContacts ? 'Manage Contacts' : 'Add Contacts',
      whyImportant: {
        title: 'Why is setting up your unified inbox important?',
        content: 'The unified inbox centralizes all your vendor communications, making it easy to track conversations, deadlines, and important details. Paige\'s AI can help draft professional messages, ensuring you never miss important communications and maintain consistent, polished correspondence with all your vendors.'
      }
    },
    {
      id: 'budget',
      title: 'Set up your budget',
      description: 'Create and manage your wedding budget with AI-powered insights',
      completed: !!(progressData?.hasBudget),
      icon: <DollarSign className="w-5 h-5" />,
      link: '/budget',
      actionText: progressData?.hasBudget ? 'Manage Budget' : 'Create Budget',
      whyImportant: {
        title: 'Why is setting up your budget important?',
        content: 'A well-structured budget helps you make informed decisions and avoid overspending. Paige can provide AI-powered insights on realistic costs, help you allocate funds effectively, and suggest cost-saving alternatives based on your priorities and local market rates.'
      }
    },
    {
      id: 'todos',
      title: 'Start your to-do list',
      description: 'Get organized with personalized wedding planning tasks',
      completed: !!(progressData?.hasTodos),
      icon: <ClipboardList className="w-5 h-5" />,
      link: '/todo',
      actionText: progressData?.hasTodos ? 'Manage Tasks' : 'Create Tasks',
      whyImportant: {
        title: 'Why is starting your to-do list important?',
        content: 'A structured to-do list keeps you organized and on track throughout your wedding planning journey. Paige creates personalized tasks based on your timeline, preferences, and wedding details, ensuring you don\'t miss important milestones or deadlines.'
      }
    }
  ], [userData, progressData]);

  // Calculate progress percentage
  const progressPercentage = guideCards.length > 0 ? Math.round((guideCards.filter(card => card.completed).length / guideCards.length) * 100) : 0;
  const completedCount = guideCards.filter(card => card.completed).length;
  const totalCount = guideCards.length;

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
        {/* Header Section Skeleton */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <SkeletonTitle width="w-48" />
            </div>
            
            {/* Condensed Progress Bar Skeleton */}
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-2">
                <SkeletonText width="w-8" lines={1} />
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div className="w-8 bg-gray-300 h-1.5 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="w-full lg:w-3/4 lg:pr-8">
              <SkeletonText width="w-full" lines={2} />
              <SkeletonText width="w-32" lines={1} />
            </div>
          </div>
        </div>

        {/* Cards Section Skeleton */}
        <div className="p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <SkeletonBase key={index}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 bg-gray-300 rounded"></div>
                    <SkeletonTitle width="w-24" />
                  </div>
                  <SkeletonText width="w-full" lines={2} />
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <SkeletonText width="w-20" lines={1} />
                  </div>
                </div>
              </SkeletonBase>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header Section with Inline Progress */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h5 className="text-[#332B42] mb-2">
              Quick Start Guide
            </h5>
          </div>
          
          {/* Condensed Progress Bar - Right Aligned */}
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${
                progressPercentage === 100 ? 'text-green-600' : 'text-[#5A4A42]'
              }`}>
                {completedCount}/{totalCount}
              </span>
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                    progressPercentage === 100 ? 'bg-green-500' : 'bg-[#A85C36]'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="w-full lg:w-3/4 lg:pr-8">
            <p className="text-sm text-[#5A4A42] font-work mb-4">
              Get set up with Paige and establish the foundation for your wedding planning
            </p>
            {onOpenWelcomeModal && (
              <button
                onClick={onOpenWelcomeModal}
                className="text-[#A85C36] hover:text-[#8B4A2A] font-medium text-sm underline"
              >
                View Welcome Guide →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guide Cards Grid */}
      <div className="p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guideCards.map((card) => (
            <QuickGuideCard
              key={card.id}
              card={card}
              onWhyImportantClick={() => setActiveModal(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Why Important Modal */}
      {activeModal && (
        <WhyImportantModal
          isOpen={!!activeModal}
          onClose={handleCloseModal}
          card={guideCards.find(card => card.id === activeModal) || null}
        />
      )}
    </div>
  );
}
