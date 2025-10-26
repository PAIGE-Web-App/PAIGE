/**
 * Contextual Insight Widget using Floating UI
 * Appears contextually near relevant content
 */

'use client';

import React, { useState, useRef } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  useTransitionStyles,
} from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, ArrowRight, Clock, AlertTriangle } from 'lucide-react';

interface ContextualInsight {
  type: 'urgent' | 'opportunity' | 'recommendation' | 'optimization';
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  priority: 'high' | 'medium' | 'low';
}

interface ContextualInsightWidgetProps {
  insights: ContextualInsight[];
  triggerElement: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  autoShow?: boolean;
  onActionClick?: (action: string) => void;
  onDismiss?: () => void;
}

export default function ContextualInsightWidget({
  insights,
  triggerElement,
  placement = 'bottom',
  autoShow = false,
  onActionClick,
  onDismiss,
}: ContextualInsightWidgetProps) {
  const [isOpen, setIsOpen] = useState(autoShow);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const { isMounted, styles } = useTransitionStyles(context, {
    duration: 200,
  });

  const currentInsight = insights[currentInsightIndex];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'opportunity':
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'optimization':
        return <ArrowRight className="w-4 h-4 text-green-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-purple-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'opportunity':
        return 'border-blue-200 bg-blue-50';
      case 'optimization':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-purple-200 bg-purple-50';
    }
  };

  const handleActionClick = (action: string) => {
    onActionClick?.(action);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    setIsOpen(false);
    onDismiss?.();
  };

  const nextInsight = () => {
    setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
  };

  const prevInsight = () => {
    setCurrentInsightIndex((prev) => (prev - 1 + insights.length) % insights.length);
  };

  if (insights.length === 0) return null;

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {triggerElement}
      </div>

      <FloatingPortal>
        {isMounted && (
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...styles }}
            {...getFloatingProps()}
            className="z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                max-w-sm rounded-lg border-2 shadow-lg backdrop-blur-sm
                ${getInsightColor(currentInsight.type)}
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center space-x-2">
                  {getInsightIcon(currentInsight.type)}
                  <span className="text-sm font-medium text-gray-900">
                    Paige noticed
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {insights.length > 1 && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={prevInsight}
                        className="p-1 hover:bg-white/50 rounded"
                        disabled={insights.length <= 1}
                      >
                        <ArrowRight className="w-3 h-3 rotate-180" />
                      </button>
                      <span className="text-xs text-gray-600">
                        {currentInsightIndex + 1}/{insights.length}
                      </span>
                      <button
                        onClick={nextInsight}
                        className="p-1 hover:bg-white/50 rounded"
                        disabled={insights.length <= 1}
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 pb-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {currentInsight.title}
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  {currentInsight.description}
                </p>

                {/* Actions */}
                {currentInsight.actions && currentInsight.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentInsight.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleActionClick(action.action)}
                        className={`
                          px-3 py-1 rounded-md text-xs font-medium transition-colors
                          ${action.primary
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-300'
                          }
                        `}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority indicator */}
              {currentInsight.priority === 'high' && (
                <div className="px-4 pb-2">
                  <div className="flex items-center space-x-1 text-xs text-red-600">
                    <Clock className="w-3 h-3" />
                    <span>High Priority</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

/**
 * Auto-appearing contextual widget for proactive insights
 */
export function ProactiveInsightWidget({
  insights,
  onActionClick,
  onDismiss,
}: {
  insights: ContextualInsight[];
  onActionClick?: (action: string) => void;
  onDismiss?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isVisible || insights.length === 0) return null;

  const currentInsight = insights[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <div className={`
        rounded-lg border-2 shadow-lg backdrop-blur-sm p-4
        ${getInsightColor(currentInsight.type)}
      `}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getInsightIcon(currentInsight.type)}
            <span className="text-sm font-medium text-gray-900">
              💜 Paige
            </span>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="p-1 hover:bg-white/50 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-medium text-gray-900 mb-2">
          {currentInsight.title}
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          {currentInsight.description}
        </p>

        {currentInsight.actions && (
          <div className="flex flex-wrap gap-2">
            {currentInsight.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  onActionClick?.(action.action);
                  setIsVisible(false);
                }}
                className={`
                  px-3 py-1 rounded-md text-xs font-medium transition-colors
                  ${action.primary
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-300'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getInsightColor(type: string) {
  switch (type) {
    case 'urgent':
      return 'border-red-200 bg-red-50';
    case 'opportunity':
      return 'border-blue-200 bg-blue-50';
    case 'optimization':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-purple-200 bg-purple-50';
  }
}

function getInsightIcon(type: string) {
  switch (type) {
    case 'urgent':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'opportunity':
      return <Lightbulb className="w-4 h-4 text-blue-500" />;
    case 'optimization':
      return <ArrowRight className="w-4 h-4 text-green-500" />;
    default:
      return <Lightbulb className="w-4 h-4 text-purple-500" />;
  }
}
