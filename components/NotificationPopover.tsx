import React from 'react';
import { NotificationCounts } from '../hooks/useNotifications';
import { MessageSquare, ClipboardList, DollarSign, Users, X, ThumbsUp } from 'lucide-react';

interface NotificationPopoverProps {
  isOpen: boolean;
  notificationCounts: NotificationCounts;
  onClose: () => void;
  onNotificationClick: (type: keyof NotificationCounts) => void;
  onMarkAsRead?: (type: keyof NotificationCounts) => void;
}

const notificationIcons = {
  messages: MessageSquare,
  todo: ClipboardList,
  todoAssigned: ClipboardList,
  budget: DollarSign,
  vendors: Users,
};

const notificationLabels = {
  messages: 'New messages',
  todo: 'Incomplete to-do items',
  todoAssigned: 'New to-do items assigned',
  budget: 'Budget alerts',
  vendors: 'Vendor updates',
};

const notificationColors = {
  messages: 'red',
  todo: 'blue',
  todoAssigned: 'red',
  budget: 'red',
  vendors: 'red',
} as const;

export default function NotificationPopover({
  isOpen,
  notificationCounts,
  onClose,
  onNotificationClick,
  onMarkAsRead
}: NotificationPopoverProps) {
  if (!isOpen) return null;

  const hasNotifications = notificationCounts.total > 0;

  return (
    <div className="absolute left-full ml-2 bottom-0 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-2 min-w-[280px] max-h-[400px] overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#AB9C95] flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#332B42]">Notifications</h4>
        <button
          onClick={onClose}
          className="text-[#AB9C95] hover:text-[#332B42] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {!hasNotifications ? (
        <>
          <div className="px-3 py-8 text-center text-sm text-[#AB9C95]">
            <div className="mb-2">
              <ThumbsUp className="w-8 h-8 mx-auto text-[#AB9C95]" />
            </div>
            <p>You're all caught up!</p>
            <p className="text-xs mt-1">Nothing new to review</p>
          </div>
          
          <div className="px-3 py-2 border-t border-[#AB9C95]">
            <button
              onClick={() => {
                // Navigate to settings notifications tab
                window.location.href = '/settings?tab=notifications';
              }}
              className="w-full text-center text-xs text-[#A85C36] hover:text-[#784528] font-medium transition-colors"
            >
              View notification settings
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="py-1">
            {Object.entries(notificationCounts).map(([key, count]) => {
              if (key === 'total' || count === 0) return null;
              
              // Skip the old 'todo' key since we now have 'todoAssigned' and 'todoSelf'
              if (key === 'todo') return null;
              
              const Icon = notificationIcons[key as keyof typeof notificationIcons] || notificationIcons.todo;
              const label = notificationLabels[key as keyof typeof notificationLabels];
              
              const color = notificationColors[key as keyof typeof notificationColors];
              const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
              
              return (
                <div
                  key={key}
                  className="w-full px-3 py-3 hover:bg-[#F8F6F4] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onNotificationClick(key as keyof NotificationCounts)}
                      className="flex-1 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EBE3DD] flex items-center justify-center">
                          <Icon className="w-4 h-4 text-[#A85C36]" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium text-[#332B42] block">
                            {label}
                          </span>
                          <span className="text-xs text-[#AB9C95]">
                            {count} {count === 1 ? 'item' : 'items'} requiring attention
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs ${bgColor} text-white px-2 py-1 rounded-full font-medium`}>
                        {count > 9 ? '9+' : count}
                      </span>
                    </button>
                    {onMarkAsRead && key !== 'todo' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(key as keyof NotificationCounts);
                        }}
                        className="ml-2 text-xs text-[#AB9C95] hover:text-[#A85C36] transition-colors"
                        title="Mark as read"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="px-3 py-2 border-t border-[#AB9C95]">
            <button
              onClick={() => {
                // Navigate to settings notifications tab
                window.location.href = '/settings?tab=notifications';
              }}
              className="w-full text-center text-xs text-[#A85C36] hover:text-[#784528] font-medium transition-colors"
            >
              View notification settings
            </button>
          </div>
        </>
      )}
    </div>
  );
} 