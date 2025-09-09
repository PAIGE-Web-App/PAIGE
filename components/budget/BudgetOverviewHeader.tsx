import React from 'react';
import { Sparkles } from 'lucide-react';

interface BudgetOverviewHeaderProps {
  title: string;
  subtitle: string;
  onShowAIAssistant?: () => void;
  onAddCategory?: () => void;
}

const BudgetOverviewHeader: React.FC<BudgetOverviewHeaderProps> = React.memo(({ 
  title, 
  subtitle, 
  onShowAIAssistant, 
  onAddCategory 
}) => (
  <div className="p-4 border-b border-[#E0DBD7] bg-white">
    <div className="flex items-center justify-between">
      <div>
        <h6 className="mb-2">{title}</h6>
        <p className="text-[#6B7280]">{subtitle}</p>
      </div>
      {(onShowAIAssistant || onAddCategory) && (
        <div className="flex gap-3">
          {onAddCategory && (
            <button
              onClick={onAddCategory}
              className="btn-primaryinverse"
            >
              Add New Category
            </button>
          )}
          {onShowAIAssistant && (
            <button
              onClick={onShowAIAssistant}
              className="btn-gradient-purple flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Budget with Paige (5 Credits)
            </button>
          )}
        </div>
      )}
    </div>
  </div>
));

BudgetOverviewHeader.displayName = 'BudgetOverviewHeader';

export default BudgetOverviewHeader;
