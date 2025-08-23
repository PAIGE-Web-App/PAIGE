"use client";

import { Sparkles, Clock, Zap, FileText, MessageSquare, Calendar, DollarSign, Heart, Users, HelpCircle } from 'lucide-react';
import { useCredits } from '../../../hooks/useCredits';
import { useAuth } from '../../../contexts/AuthContext';
import { UserType } from '../../../types/credits';

export default function CreditsTab() {
  const { credits, getRemainingCredits, loading } = useCredits();
  const { userType } = useAuth();
  
  const remainingCredits = getRemainingCredits();
  const dailyCredits = credits?.dailyCredits || 0;
  const bonusCredits = credits?.bonusCredits || 0;

  const featureExamples = {
    couple: [
      { icon: MessageSquare, name: 'Draft Messaging', cost: 1, description: 'AI-powered message drafting with vendors' },
      { icon: FileText, name: 'Todo Generation', cost: 2, description: 'Generate comprehensive to-do lists' },
      { icon: Sparkles, name: 'File Analysis', cost: 3, description: 'Scan and analyze documents with Paige AI' },
      { icon: MessageSquare, name: 'Message Analysis', cost: 2, description: 'Analyze vendor messages and communications' },
      { icon: Calendar, name: 'Integrated Planning', cost: 5, description: 'Create comprehensive wedding plans' },
      { icon: DollarSign, name: 'Budget Generation', cost: 3, description: 'AI-powered budget planning and tracking' },
      { icon: Heart, name: 'Vibe Generation', cost: 2, description: 'Create mood boards and style inspiration' },
      { icon: Users, name: 'Vendor Suggestions', cost: 2, description: 'Get personalized vendor recommendations' },
      { icon: HelpCircle, name: 'Follow-up Questions', cost: 1, description: 'Ask Paige AI for clarifications and help' }
    ],
    planner: [
      { icon: MessageSquare, name: 'Client Communication', cost: 1, description: 'AI-assisted client messaging' },
      { icon: Users, name: 'Vendor Coordination', cost: 2, description: 'Coordinate with vendor networks' },
      { icon: Calendar, name: 'Client Planning', cost: 3, description: 'Create detailed client event plans' },
      { icon: Sparkles, name: 'Vendor Analysis', cost: 2, description: 'Analyze vendor proposals and contracts' },
      { icon: FileText, name: 'Client Portal Content', cost: 2, description: 'Generate client-facing content' },
      { icon: DollarSign, name: 'Business Analytics', cost: 3, description: 'Business insights and reporting' },
      { icon: Users, name: 'Client Onboarding', cost: 2, description: 'Streamlined client onboarding process' },
      { icon: FileText, name: 'Vendor Contract Review', cost: 3, description: 'AI-powered contract analysis' },
      { icon: Calendar, name: 'Client Timeline Creation', cost: 4, description: 'Detailed event timeline generation' },
      { icon: HelpCircle, name: 'Follow-up Questions', cost: 1, description: 'Ask Paige AI for business guidance' }
    ]
  };

  const currentFeatures = featureExamples[userType];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Credits Overview */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Your Paige Credits</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F8F6F4] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#332B42] mb-1">{remainingCredits}</div>
            <div className="text-sm text-[#666] mb-2">Total Credits</div>
            <div className="text-xs text-[#888]">Available Now</div>
          </div>
          
          <div className="bg-[#F8F6F4] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#332B42] mb-1">{dailyCredits}</div>
            <div className="text-sm text-[#666] mb-2">Daily Credits</div>
            <div className="text-xs text-[#888]">Refresh Daily</div>
          </div>
          
          <div className="bg-[#F8F6F4] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#805d93] mb-1">{bonusCredits}</div>
            <div className="text-sm text-[#666] mb-2">Bonus Credits</div>
            <div className="text-xs text-[#888]">Used First</div>
          </div>
        </div>

        <div className="bg-[#F3F2F0] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#A85C36] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-[#332B42] mb-2">How Credits Work</h3>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• <strong>Daily Credits:</strong> Refresh every day at midnight</li>
                <li>• <strong>Bonus Credits:</strong> Used first before daily credits</li>
                <li>• <strong>Credit Usage:</strong> Different AI features cost different amounts</li>
                <li>• <strong>No Rollover:</strong> Unused daily credits don't carry over</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features & Costs */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">AI Features & Credit Costs</h5>
        
        <p className="text-xs text-gray-600 mb-4">
          Credits are used for Paige AI functions like drafting messages, creating to-do lists, 
          scanning files, and more. Here's what each feature costs:
        </p>

        <div className="grid gap-3">
          {currentFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-[#F8F6F4] rounded-lg">
              <div className="flex-shrink-0">
                <feature.icon className="w-5 h-5 text-[#805d93]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-[#332B42]">{feature.name}</h3>
                  <span className="bg-[#805d93] text-white text-xs px-2 py-1 rounded">
                    {feature.cost} credit{feature.cost > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-[#666]">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Management Tips */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Credit Management Tips</h5>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#805d93] rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-[#332B42] mb-1">Plan Your AI Usage</h3>
              <p className="text-sm text-[#666]">
                Higher-cost features like Integrated Planning (5 credits) and File Analysis (3 credits) 
                provide more comprehensive results. Use them strategically for maximum value.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#805d93] rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-[#332B42] mb-1">Bonus Credits First</h3>
              <p className="text-sm text-[#666]">
                Any bonus credits you have will automatically be used before your daily credits, 
                so you never lose them.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#805d93] rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-[#332B42] mb-1">Daily Refresh</h3>
              <p className="text-sm text-[#666]">
                Your daily credits reset every day at midnight, so don't worry about saving them 
                for tomorrow - use them today!
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#805d93] rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-medium text-[#332B42] mb-1">Need More Credits?</h3>
              <p className="text-sm text-[#666]">
                Consider upgrading your plan for more daily credits, or contact support about 
                purchasing additional bonus credits for special projects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
