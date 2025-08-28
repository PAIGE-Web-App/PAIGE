import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, Settings, SkipForward, Brain, Zap } from 'lucide-react';
import { Guest, TableType } from '../../types/seatingChart';

interface AIOrganizationStepProps {
  guests: Guest[];
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  organizationChoice: 'ai' | 'manual' | 'skip' | null;
  onUpdate: (choice: 'ai' | 'manual' | 'skip') => void;
  onChartCreated: () => void;
  isLoading?: boolean;
}

const ORGANIZATION_OPTIONS = [
  {
    id: 'ai',
    title: 'AI-Powered Seating',
    description: 'Let Paige intelligently arrange your guests based on relationships, preferences, and table dynamics',
    icon: Brain,
    features: [
      'Analyzes guest relationships and preferences',
      'Optimizes table dynamics and conversation flow',
      'Considers dietary restrictions and accessibility needs',
      'Creates balanced and engaging table groups'
    ],
    cost: '5 credits',
    color: 'border-purple-200 bg-purple-50',
    iconColor: 'text-purple-600'
  },
  {
    id: 'manual',
    title: 'Manual Organization',
    description: 'Take full control and arrange your guests manually with drag-and-drop functionality',
    icon: Users,
    features: [
      'Full control over guest placement',
      'Drag-and-drop table assignment',
      'Real-time visual feedback',
      'Custom grouping and arrangement'
    ],
    cost: 'Free',
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    id: 'skip',
    title: 'Skip for Now',
    description: 'Create the chart structure and organize seating later when you have more time',
    icon: SkipForward,
    features: [
      'Save current progress',
      'Create chart without seating assignments',
      'Return to organize later',
      'Perfect for planning stages'
    ],
    cost: 'Free',
    color: 'border-gray-200 bg-gray-50',
    iconColor: 'text-gray-600'
  }
];

export default function AIOrganizationStep({
  guests,
  tableLayout,
  organizationChoice,
  onUpdate,
  onChartCreated,
  isLoading = false
}: AIOrganizationStepProps) {
  const [selectedOption, setSelectedOption] = useState<'ai' | 'manual' | 'skip' | null>(organizationChoice);
  const [showAIPreview, setShowAIPreview] = useState(false);

  const handleOptionSelect = (option: 'ai' | 'manual' | 'skip') => {
    setSelectedOption(option);
    onUpdate(option);
  };

  const handleCreateChart = () => {
    if (selectedOption) {
      onChartCreated();
    }
  };

  const canProceed = selectedOption !== null && 
    tableLayout.tables.length > 0 &&
    (guests.length === 0 || tableLayout.totalCapacity >= guests.length);

  const getGuestSummary = () => {
    const totalGuests = guests.length;
    const totalSeats = tableLayout.totalCapacity;
    const overCapacity = totalGuests > totalSeats;
    
    return {
      totalGuests,
      totalSeats,
      overCapacity,
      difference: Math.abs(totalGuests - totalSeats)
    };
  };

  const guestSummary = getGuestSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-2">
          Organize Your Seating
        </h3>
        <p className="text-sm text-[#AB9C95]">
          Choose how you'd like to arrange your guests at the tables
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#F8F6F4] rounded-[5px] p-4 text-center">
          <div className="text-2xl font-bold text-[#332B42]">{guestSummary.totalGuests}</div>
          <div className="text-sm text-[#AB9C95]">Total Guests</div>
        </div>
        <div className="bg-[#F8F6F4] rounded-[5px] p-4 text-center">
          <div className="text-2xl font-bold text-[#332B42]">{guestSummary.totalSeats}</div>
          <div className="text-sm text-[#AB9C95]">Total Seats</div>
        </div>
        <div className={`rounded-[5px] p-4 text-center ${
          guestSummary.overCapacity ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className={`text-2xl font-bold ${guestSummary.overCapacity ? 'text-red-600' : 'text-green-600'}`}>
            {guestSummary.overCapacity ? '⚠️' : '✅'}
          </div>
          <div className={`text-sm ${guestSummary.overCapacity ? 'text-red-700' : 'text-green-700'}`}>
            {guestSummary.overCapacity ? `${guestSummary.difference} Over` : 'Perfect Fit'}
          </div>
        </div>
      </div>

      {/* Organization Options */}
      <div className="space-y-4">
        {ORGANIZATION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption === option.id;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 rounded-[5px] p-6 cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? `${option.color} border-[#A85C36] shadow-md` 
                  : `${option.color} hover:border-[#AB9C95] hover:shadow-sm`
              }`}
              onClick={() => handleOptionSelect(option.id as any)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white ${option.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[#332B42] text-lg">{option.title}</h4>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      option.cost === 'Free' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {option.cost}
                    </span>
                  </div>
                  
                  <p className="text-[#7A7A7A] mb-4">{option.description}</p>
                  
                  <ul className="space-y-2">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-[#332B42]">
                        <div className="w-1.5 h-1.5 bg-[#A85C36] rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {isSelected && (
                  <div className="w-6 h-6 bg-[#A85C36] rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Preview (when AI option is selected) */}
      {selectedOption === 'ai' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-purple-50 border border-purple-200 rounded-[5px] p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-purple-800">AI Seating Preview</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-purple-700 mb-2">The AI will consider:</p>
              <ul className="space-y-1 text-purple-600">
                <li>• Family relationships and groups</li>
                <li>• Dietary restrictions</li>
                <li>• Age and conversation dynamics</li>
                <li>• Accessibility needs</li>
              </ul>
            </div>
            <div>
              <p className="text-purple-700 mb-2">Estimated result:</p>
              <ul className="space-y-1 text-purple-600">
                <li>• Balanced table conversations</li>
                <li>• Optimized guest comfort</li>
                <li>• Efficient use of space</li>
                <li>• Personalized arrangements</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Manual Organization Preview */}
      {selectedOption === 'manual' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-blue-50 border border-blue-200 rounded-[5px] p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-800">Manual Organization Tools</h4>
          </div>
          
          <p className="text-blue-700 text-sm mb-3">
            You'll have access to a visual seating chart editor with:
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <ul className="space-y-1 text-blue-600">
              <li>• Drag-and-drop guest placement</li>
              <li>• Table capacity indicators</li>
              <li>• Guest relationship tags</li>
            </ul>
            <ul className="space-y-1 text-blue-600">
              <li>• Real-time validation</li>
              <li>• Undo/redo functionality</li>
              <li>• Export and sharing options</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Skip Preview */}
      {selectedOption === 'skip' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 border border-gray-200 rounded-[5px] p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <SkipForward className="w-5 h-5 text-gray-600" />
            <h4 className="font-medium text-gray-800">Skip Organization</h4>
          </div>
          
          <p className="text-gray-700 text-sm">
            Your seating chart will be created with the current structure. You can return later to:
          </p>
          
          <ul className="mt-3 space-y-1 text-sm text-gray-600">
            <li>• Organize guest seating</li>
            <li>• Make adjustments</li>
            <li>• Add more guests or tables</li>
            <li>• Use AI organization features</li>
          </ul>
        </motion.div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleCreateChart}
          disabled={!canProceed || isLoading}
          className={`btn-primary flex items-center gap-2 px-8 py-3 text-lg ${
            !canProceed ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Chart...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Create Seating Chart
            </>
          )}
        </button>
      </div>

      {/* Validation Messages */}
      {!canProceed && (
        <div className="text-center">
          {tableLayout.tables.length === 0 && (
            <p className="text-red-600 text-sm">Please configure tables in the Table Layout step</p>
          )}
          {guests.length > 0 && guestSummary.overCapacity && (
            <p className="text-red-600 text-sm">
              You need {guestSummary.difference} more seats. Please add tables or increase capacities.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
