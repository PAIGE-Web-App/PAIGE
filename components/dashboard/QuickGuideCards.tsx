import React, { useState, useMemo } from 'react';
import { User, Palette, MessageSquare, DollarSign, ClipboardList } from 'lucide-react';
import QuickGuideCard from './QuickGuideCard';
import WhyImportantModal from './WhyImportantModal';
import { SkeletonBase, SkeletonText, SkeletonTitle, SkeletonProgressBar } from '../skeletons/SkeletonBase';

interface QuickGuideCardsProps {
  userData: any;
  progressData: any;
  onOpenWelcomeModal?: () => void;
}

export default function QuickGuideCards({ userData, progressData, onOpenWelcomeModal }: QuickGuideCardsProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

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
      actionText: progressData?.hasContacts ? 'Set up Unified Inbox' : 'Set up Unified Inbox',
      whyImportant: {
        title: 'Why is setting up your unified inbox important?',
        content: 'Managing vendor communications can be overwhelming with emails scattered across different accounts. Paige\'s unified inbox centralizes all your wedding-related messages, uses AI to draft professional responses, and helps you stay organized throughout the planning process.'
      }
    },
    {
      id: 'budget',
      title: 'Set up your budget',
      description: 'Use AI to create smart budgets',
      completed: !!(progressData?.hasBudget),
      icon: <DollarSign className="w-5 h-5" />,
      link: '/budget',
      actionText: progressData?.hasBudget ? 'Create Budget' : 'Create Budget',
      whyImportant: {
        title: 'Why is setting up your budget important?',
        content: 'A realistic budget is the foundation of successful wedding planning. Paige\'s AI-powered budget tool helps you allocate funds appropriately, tracks expenses in real-time, and prevents overspending by providing smart recommendations based on your total budget.'
      }
    },
    {
      id: 'todos',
      title: 'Create your first planning todo list',
      description: 'Get started with your personalized wedding planning checklist',
      completed: !!(progressData?.hasTodos),
      icon: <ClipboardList className="w-5 h-5" />,
      link: progressData?.hasTodos ? '/todo' : '/todo?new-list=true',
      actionText: progressData?.hasTodos ? 'Create Wedding Checklist' : 'Create Wedding Checklist',
      whyImportant: {
        title: 'Why is creating a wedding checklist important?',
        content: 'Wedding planning involves hundreds of tasks with different deadlines. Paige\'s intelligent todo system creates personalized checklists based on your wedding date and preferences, helps you stay on track, and ensures nothing important gets forgotten in the planning process.'
      }
    }
  ], [userData?.partnerName, progressData?.hasMoodboards, progressData?.hasContacts, progressData?.hasBudget, progressData?.hasTodos]);

  // Calculate progress based on the 5 guide cards only
  const completedCount = guideCards.filter(card => card.completed).length;
  const totalCount = guideCards.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);


  // Show loading state if data isn't available yet
  if (!userData || !progressData) {
    return (
      <>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {/* Header Section - Loading State */}
          <div className="p-6">
            <SkeletonBase>
              <div className="flex items-center justify-between">
                <div className="w-full lg:w-3/4 lg:pr-8">
                  <SkeletonTitle width="w-48" className="mb-2" />
                  <SkeletonText width="w-2/3" lines={2} className="mb-4" />
                  <SkeletonText width="w-32" lines={1} />
                </div>
              </div>
            </SkeletonBase>
          </div>
        </div>

        {/* Cards Section with Progress Bar Skeleton */}
        <div className="p-4 bg-white">
          {/* Progress Bar Skeleton - Above the cards */}
          <div className="mb-6">
            <SkeletonBase>
              <div className="flex items-center justify-between mb-2">
                <SkeletonText width="w-3/4" lines={1} />
                <SkeletonText width="w-20" lines={1} />
              </div>
              <SkeletonProgressBar className="w-full" />
            </SkeletonBase>
          </div>
        </div>
      </>
    );
  }

  const handleWhyImportantClick = (cardId: string) => {
    setActiveModal(cardId);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

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
                    onWhyImportantClick={handleWhyImportantClick}
                  />
                ))}
        </div>
      </div>

      {/* Modal */}
      <WhyImportantModal
        isOpen={!!activeModal}
        onClose={handleCloseModal}
        card={activeModal ? guideCards.find(card => card.id === activeModal) || null : null}
      />
    </div>
  );
}
