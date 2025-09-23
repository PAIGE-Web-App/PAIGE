import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export const useGlobalCompletionToasts = () => {
  const router = useRouter();

  const showCompletionToast = useCallback((itemId: string) => {
    const completionMessages: { [key: string]: string } = {
      'wedding-date': '🎉 Amazing! Your wedding date is set!',
      'wedding-destination': '🌍 Perfect! Your wedding destination is chosen!',
      'venue': '🏰 Fantastic! Your dream venue is selected!',
      'vibes': '✨ Beautiful! Your wedding vibes are defined!',
      'vendors': '🤝 Excellent! You\'ve started exploring vendors!',
      'moodboard': '🎨 Stunning! Your first moodboard is ready!',
      'seating-chart': '🪑 Perfect! Your seating chart is created!',
      'files': '📁 Excellent! Your first file is uploaded!',
      'paige-ai': '🤖 Incredible! You\'ve discovered Paige\'s AI magic!',
      'credits': '💡 Great! You now understand how credits work!',
      // Quick Start Guide cards
      'profile': '👤 Perfect! Your profile is complete!',
      'style': '🎨 Beautiful! Your wedding style is defined!',
      'contacts': '📧 Excellent! Your unified inbox is set up!',
      'budget': '💰 Smart! Your wedding budget is planned!',
      'todos': '✅ Wonderful! Your first todo list is created!',
      'quick-start-complete': '🎊 INCREDIBLE! You\'ve completed your entire Quick Start Guide! You\'re ready to plan the perfect wedding!'
    };

    const message = completionMessages[itemId] || '🎉 Congratulations! Another item completed!';
    
    // Show custom toast with clickable link
    toast((t) => (
      <div className="flex items-center justify-between w-full">
        <span>{message}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            router.push('/');
          }}
          className="ml-2 text-white hover:text-gray-200 font-medium underline whitespace-nowrap"
        >
          See what's next
        </button>
      </div>
    ), {
      duration: 6000,
      position: 'bottom-center'
    });
  }, [router]);

  return { showCompletionToast };
};
