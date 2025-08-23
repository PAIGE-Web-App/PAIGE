import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Plus, 
  Minus, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Crown,
  Sparkles,
  AlertTriangle,
  Gift,
  Zap
} from 'lucide-react';
import { creditService } from '@/lib/creditService';
import { 
  UserCredits, 
  SubscriptionTier, 
  UserType,
  COUPLE_SUBSCRIPTION_CREDITS,
  PLANNER_SUBSCRIPTION_CREDITS
} from '@/types/credits';

interface AdminCreditManagementProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

interface CreditAction {
  type: 'add' | 'subtract' | 'set' | 'change_tier';
  amount?: number;
  newTier?: SubscriptionTier;
  newUserType?: UserType;
  reason: string;
}

export default function AdminCreditManagement({ 
  userId, 
  userEmail, 
  onClose 
}: AdminCreditManagementProps) {
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CreditAction | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);
  const [actionReason, setActionReason] = useState('');
  const [newTier, setNewTier] = useState<SubscriptionTier>('free');
  const [newUserType, setNewUserType] = useState<UserType>('couple');

  // Load user credits
  useEffect(() => {
    loadUserCredits();
  }, [userId]);

  const loadUserCredits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/credits`);
      
      if (response.ok) {
        const credits = await response.json();
        setUserCredits(credits);
      } else if (response.status === 404) {
        // User doesn't have credits yet
        setUserCredits(null);
      } else {
        throw new Error('Failed to load user credits');
      }
    } catch (error) {
      console.error('Failed to load user credits:', error);
      setUserCredits(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreditAction = async (action: CreditAction) => {
    try {
      setActionLoading(true);
      
      let apiAction = '';
      let amount = 0;
      let reason = action.reason || 'Admin action';
      
      switch (action.type) {
        case 'add':
          apiAction = 'add';
          amount = action.amount || 0;
          break;
          
        case 'subtract':
          apiAction = 'subtract';
          amount = action.amount || 0;
          break;
          
        case 'set':
          apiAction = 'set';
          amount = action.amount || 0;
          break;
          
        case 'change_tier':
          // For tier changes, we'll calculate the difference and use 'set'
          if (action.newTier && action.newUserType && userCredits) {
            const newTierCredits = action.newUserType === 'couple' 
              ? COUPLE_SUBSCRIPTION_CREDITS[action.newTier as keyof typeof COUPLE_SUBSCRIPTION_CREDITS]?.monthlyCredits || 15
              : PLANNER_SUBSCRIPTION_CREDITS[action.newTier as keyof typeof PLANNER_SUBSCRIPTION_CREDITS]?.monthlyCredits || 25;
            
            apiAction = 'set';
            amount = newTierCredits;
            reason = `Tier upgrade to ${action.newTier} - ${action.reason}`;
          }
          break;
      }
      
      if (apiAction) {
        const response = await fetch(`/api/admin/users/${userId}/credits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: apiAction,
            amount,
            reason,
            newTier: action.newTier,
            newUserType: action.newUserType
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Reload credits
            await loadUserCredits();
            setShowActionModal(false);
            setSelectedAction(null);
          }
        } else {
          throw new Error('Failed to perform credit action');
        }
      }
    } catch (error) {
      console.error('Failed to perform credit action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getSubscriptionInfo = (credits: UserCredits) => {
    if (credits.userType === 'couple') {
      return COUPLE_SUBSCRIPTION_CREDITS[credits.subscriptionTier as keyof typeof COUPLE_SUBSCRIPTION_CREDITS];
    } else {
      return PLANNER_SUBSCRIPTION_CREDITS[credits.subscriptionTier as keyof typeof PLANNER_SUBSCRIPTION_CREDITS];
    }
  };

  const getTierOptions = (userType: UserType) => {
    if (userType === 'couple') {
      return Object.keys(COUPLE_SUBSCRIPTION_CREDITS) as SubscriptionTier[];
    } else {
      return Object.keys(PLANNER_SUBSCRIPTION_CREDITS) as SubscriptionTier[];
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userCredits) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credits Found</h3>
            <p className="text-gray-600 mb-4">
              This user doesn't have a credit account yet. Would you like to initialize one?
            </p>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/admin/users/${userId}/credits`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'initialize',
                      newUserType: 'couple',
                      newTier: 'free'
                    })
                  });
                  
                  if (response.ok) {
                    await loadUserCredits();
                  }
                } catch (error) {
                  console.error('Failed to initialize credits:', error);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Initialize Credits
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subscriptionInfo = getSubscriptionInfo(userCredits);
  const tierOptions = getTierOptions(userCredits.userType);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Credit Management
                </h3>
                <p className="text-sm text-gray-600">
                  Managing credits for {userEmail}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Credit Overview */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Current Credits */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Daily Credits</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {userCredits.dailyCredits}
                </div>
                <div className="text-xs text-blue-700">
                  of {subscriptionInfo?.monthlyCredits} daily
                </div>
              </div>

              {/* Bonus Credits */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Gift className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Bonus Credits</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {userCredits.bonusCredits}
                </div>
                <div className="text-xs text-yellow-700">
                  never expire
                </div>
              </div>

              {/* Total Available Credits */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">Total Available</span>
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {userCredits.dailyCredits + userCredits.bonusCredits}
                </div>
                <div className="text-xs text-indigo-700">
                  daily + bonus
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Subscription</span>
                </div>
                <div className="text-lg font-semibold text-green-900 capitalize">
                  {userCredits.subscriptionTier}
                </div>
                <div className="text-xs text-green-700 capitalize">
                  {userCredits.userType} Plan
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Total Used</span>
                </div>
                <div className="text-lg font-semibold text-purple-900">
                  {userCredits.totalCreditsUsed}
                </div>
                <div className="text-xs text-purple-700">
                  credits this month
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button
                onClick={() => {
                  setSelectedAction({ type: 'add', amount: 10, reason: '' });
                  setShowActionModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add 10
              </button>
              
              <button
                onClick={() => {
                  setSelectedAction({ type: 'add', amount: 25, reason: '' });
                  setShowActionModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add 25
              </button>
              
              <button
                onClick={() => {
                  setSelectedAction({ type: 'set', amount: 50, reason: '' });
                  setShowActionModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Set to 50
              </button>
              
              <button
                onClick={() => {
                  setSelectedAction({ type: 'change_tier', reason: '' });
                  setShowActionModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
              >
                <Crown className="h-4 w-4" />
                Change Tier
              </button>
            </div>

            {/* Custom Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="1"
                    max="1000"
                  />
                  <button
                    onClick={() => {
                      setSelectedAction({ type: 'add', amount: creditAmount, reason: '' });
                      setShowActionModal(true);
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtract Credits
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="1"
                    max="1000"
                  />
                  <button
                    onClick={() => {
                      setSelectedAction({ type: 'subtract', amount: creditAmount, reason: '' });
                      setShowActionModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Subtract
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Set Exact Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                    max="1000"
                  />
                  <button
                    onClick={() => {
                      setSelectedAction({ type: 'set', amount: creditAmount, reason: '' });
                      setShowActionModal(true);
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Last updated: {userCredits.updatedAt.toLocaleString()}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {showActionModal && selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-[60]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Credit Action
              </h4>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Action: <strong>{selectedAction.type.replace('_', ' ')}</strong>
                </p>
                {selectedAction.amount !== undefined && (
                  <p className="text-sm text-gray-600">
                    Amount: <strong>{selectedAction.amount > 0 ? '+' : ''}{selectedAction.amount}</strong>
                  </p>
                )}
                {selectedAction.type === 'change_tier' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Type
                      </label>
                      <select
                        value={newUserType}
                        onChange={(e) => setNewUserType(e.target.value as UserType)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="couple">Couple</option>
                        <option value="planner">Planner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Tier
                      </label>
                      <select
                        value={newTier}
                        onChange={(e) => setNewTier(e.target.value as SubscriptionTier)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {getTierOptions(newUserType).map(tier => (
                          <option key={tier} value={tier}>
                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g., Customer support, bonus, etc."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreditAction({
                    ...selectedAction,
                    reason: actionReason || 'Admin action',
                    newTier: selectedAction.type === 'change_tier' ? newTier : undefined,
                    newUserType: selectedAction.type === 'change_tier' ? newUserType : undefined,
                  })}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
