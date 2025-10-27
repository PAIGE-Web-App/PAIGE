/**
 * Paige Chat Message
 * Displays a single chat message with formatting and optional action buttons
 */

"use client";

import React, { useMemo } from 'react';
import { PaigeChatMessage as ChatMessageType } from '@/types/paige';

interface PaigeChatMessageProps {
  message: ChatMessageType;
  index: number;
  formatMessage: (content: string) => string;
}

const PaigeChatMessage: React.FC<PaigeChatMessageProps> = React.memo(({
  message,
  index,
  formatMessage
}) => {
  // Memoize formatted content to prevent re-formatting on every render
  const formattedContent = useMemo(
    () => formatMessage(message.content),
    [message.content, formatMessage]
  );

  return (
    <div
      key={index}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
          message.role === 'user'
            ? 'bg-purple-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: formattedContent
          }}
        />
        
        {/* Action buttons for assistant messages */}
        {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions.map((action, actionIndex) => (
              <button
                key={actionIndex}
                onClick={action.onClick}
                className="px-3 py-1 bg-purple-500 text-white text-[13px] rounded hover:bg-purple-600 transition-colors"
                aria-label={action.label}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

PaigeChatMessage.displayName = 'PaigeChatMessage';

export default PaigeChatMessage;

