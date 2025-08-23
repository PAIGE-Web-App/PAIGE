import React from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Sparkles, AlertTriangle, Info } from 'lucide-react';

interface CreditDisplayProps {
  variant?: 'compact' | 'full' | 'banner';
  showUpgradePrompt?: boolean;
  className?: string;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  variant = 'compact',
  showUpgradePrompt = true,
  className = ''
}) => {
  const {
    credits,
    loading,
    error,
    getCreditUsagePercentage,
    isCreditsLow,
    isCreditsExhausted,
    getRemainingCredits,
    getSubscriptionInfo
  } = useCredits();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  if (error || !credits) {
    return null; // Don't show anything if there's an error
  }

  const subscriptionInfo = getSubscriptionInfo();
  const usagePercentage = getCreditUsagePercentage();
  const remainingCredits = getRemainingCredits();

  // Don't show if user has unlimited credits (enterprise tier)
  if (subscriptionInfo?.monthlyCredits === -1) {
    return null;
  }

  const getCreditStatusColor = () => {
    if (isCreditsExhausted()) return 'text-red-600';
    if (isCreditsLow()) return 'text-orange-600';
    return 'text-green-600';
  };

  const getCreditStatusIcon = () => {
    if (isCreditsExhausted()) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (isCreditsLow()) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <Sparkles className="h-4 w-4 text-green-600" />;
  };

  const getUpgradeMessage = () => {
    if (isCreditsExhausted()) {
      return 'Upgrade to continue using AI features';
    }
    if (isCreditsLow()) {
      return 'Consider upgrading for more AI credits';
    }
    return null;
  };

  // Compact variant (for headers/navigation)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getCreditStatusIcon()}
        <span className={`text-sm font-medium ${getCreditStatusColor()}`}>
          {remainingCredits} credits
        </span>
        {isCreditsLow() && (
          <span className="text-xs text-orange-600">Low</span>
        )}
      </div>
    );
  }

  // Banner variant (for prominent display)
  if (variant === 'banner') {
    return (
      <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getCreditStatusIcon()}
            <div>
              <h3 className="font-medium text-gray-900">
                AI Credits: {remainingCredits} remaining
              </h3>
              <p className="text-sm text-gray-600">
                {subscriptionInfo?.tier} plan • {subscriptionInfo?.userType}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {remainingCredits}
            </div>
            <div className="text-sm text-gray-500">
              of {subscriptionInfo?.monthlyCredits}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Usage</span>
            <span>{Math.round(usagePercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isCreditsExhausted() ? 'bg-red-500' :
                isCreditsLow() ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Upgrade prompt */}
        {showUpgradePrompt && getUpgradeMessage() && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {getUpgradeMessage()}
              </span>
            </div>
            <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              View Plans →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full variant (for detailed display)
  return (
    <div className={`bg-white border rounded-lg p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Credits</h3>
        <div className="flex items-center gap-2">
          {getCreditStatusIcon()}
          <span className={`text-sm font-medium ${getCreditStatusColor()}`}>
            {isCreditsExhausted() ? 'Exhausted' : 
             isCreditsLow() ? 'Low' : 'Available'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Status */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {remainingCredits}
          </div>
          <div className="text-sm text-gray-600">Credits Remaining</div>
          <div className="text-xs text-gray-500 mt-1">
            of {subscriptionInfo?.monthlyCredits} monthly
          </div>
        </div>

        {/* Usage Progress */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {Math.round(usagePercentage)}%
          </div>
          <div className="text-sm text-gray-600">Used This Month</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isCreditsExhausted() ? 'bg-red-500' :
                isCreditsLow() ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Plan Info */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 mb-1 capitalize">
            {subscriptionInfo?.tier}
          </div>
          <div className="text-sm text-gray-600 capitalize">
            {subscriptionInfo?.userType} Plan
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Refreshes monthly
          </div>
        </div>
      </div>

      {/* Credit Status Details */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              AI Feature Access
            </span>
          </div>
          <span className={`text-sm font-medium ${getCreditStatusColor()}`}>
            {isCreditsExhausted() ? 'Blocked' : 
             isCreditsLow() ? 'Limited' : 'Full Access'}
          </span>
        </div>
        
        {isCreditsExhausted() && (
          <p className="text-sm text-red-600 mt-2">
            You've used all your AI credits for this month. Upgrade your plan to continue using AI features.
          </p>
        )}
        
        {isCreditsLow() && (
          <p className="text-sm text-orange-600 mt-2">
            You're running low on AI credits. Consider upgrading for unlimited access.
          </p>
        )}
      </div>

      {/* Upgrade CTA */}
      {showUpgradePrompt && (isCreditsLow() || isCreditsExhausted()) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                Need More AI Credits?
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Upgrade your plan to get more credits and unlock advanced AI features.
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
              View Plans
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
