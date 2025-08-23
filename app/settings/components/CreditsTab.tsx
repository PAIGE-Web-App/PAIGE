"use client";

import { Sparkles, Zap, FileText, MessageSquare, Calendar, DollarSign, Heart, Users, HelpCircle } from 'lucide-react';
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
              <div className="flex-shrink-0 self-center">
                <feature.icon className="w-4 h-4 text-[#805d93]" />
              </div>
              <div className="flex-1">
                <h6 className="font-medium text-[#332B42] mb-1">{feature.name}</h6>
                <p className="text-sm text-[#666]">{feature.description}</p>
              </div>
              <div className="flex-shrink-0 self-center">
                <span className="bg-[#805d93] text-white text-xs px-2 py-1 rounded">
                  {feature.cost} credit{feature.cost > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Need More Credits */}
      <div className="bg-[#805d93] rounded-lg p-6 shadow-sm text-center">
        <h6 className="mb-4 text-white">Need More Credits?</h6>
        
        <p className="text-white mb-6 opacity-90">
          Consider upgrading your plan for more daily credits, or purchase additional bonus credits for special projects.
        </p>

        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('tab', 'plan');
            window.location.href = `/settings?${params.toString()}`;
          }}
          className="bg-white text-[#805d93] px-3 py-1 rounded font-work-sans font-semibold text-xs hover:bg-gray-100 transition-all duration-200"
        >
          Go to Plan & Billing
        </button>
      </div>
    </div>
  );
}
