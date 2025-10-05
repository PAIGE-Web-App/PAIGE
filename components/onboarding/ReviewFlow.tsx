'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Calendar, DollarSign, Users, ArrowRight, Edit3 } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  vicinity?: string;
  formatted_address?: string;
}

interface ReviewFlowProps {
  todos: Todo[];
  budget: {
    total: number;
    categories: BudgetCategory[];
  };
  likedVendors: Vendor[];
  onComplete: () => void;
  onBack: () => void;
  onEdit: (section: 'todos' | 'budget' | 'vendors') => void;
}

const ReviewFlow: React.FC<ReviewFlowProps> = ({
  todos,
  budget,
  likedVendors,
  onComplete,
  onBack,
  onEdit
}) => {
  const [currentSection, setCurrentSection] = useState<'todos' | 'budget' | 'vendors'>('todos');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const { showSuccessToast } = useCustomToast();

  const handleSectionComplete = (section: string) => {
    setCompletedSections(prev => new Set([...prev, section]));
    showSuccessToast(`${section} reviewed!`);
  };

  const handleNext = () => {
    if (currentSection === 'todos') {
      handleSectionComplete('todos');
      setCurrentSection('budget');
    } else if (currentSection === 'budget') {
      handleSectionComplete('budget');
      setCurrentSection('vendors');
    } else {
      handleSectionComplete('vendors');
      onComplete();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderTodos = () => (
    <motion.div
      key="todos"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">
              Your Wedding Timeline
            </h2>
            <p className="text-[#364257]">
              {todos.length} tasks to help you stay on track
            </p>
          </div>
        </div>
        <button
          onClick={() => onEdit('todos')}
          className="flex items-center gap-2 text-[#A85C36] hover:text-[#8B4513] transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-3">
        {todos.map((todo, index) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#AB9C95]"
          >
            <div className={`w-6 h-6 rounded-full border-2 border-[#A85C36] flex items-center justify-center ${
              todo.completed ? 'bg-[#A85C36]' : 'bg-white'
            }`}>
              {todo.completed && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#332B42]">{todo.title}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
              {todo.priority}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderBudget = () => (
    <motion.div
      key="budget"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">
              Your Wedding Budget
            </h2>
            <p className="text-[#364257]">
              Total budget: {formatCurrency(budget.total)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onEdit('budget')}
          className="flex items-center gap-2 text-[#A85C36] hover:text-[#8B4513] transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-4">
        {budget.categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg border border-[#AB9C95] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-[#332B42]">{category.name}</h3>
              <span className="text-lg font-semibold text-[#332B42]">
                {formatCurrency(category.amount)}
              </span>
            </div>
            <div className="w-full bg-[#E0D6D0] rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-[#A85C36] to-[#8B4513] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${category.percentage}%` }}
                transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
              />
            </div>
            <p className="text-sm text-[#364257] mt-1">
              {category.percentage}% of total budget
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderVendors = () => (
    <motion.div
      key="vendors"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-playfair font-semibold text-[#332B42]">
              Your Liked Vendors
            </h2>
            <p className="text-[#364257]">
              {likedVendors.length} vendors you're interested in
            </p>
          </div>
        </div>
        <button
          onClick={() => onEdit('vendors')}
          className="flex items-center gap-2 text-[#A85C36] hover:text-[#8B4513] transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      {likedVendors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {likedVendors.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-[#AB9C95] p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#332B42]">{vendor.name}</h3>
                  <p className="text-sm text-[#364257]">{vendor.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-medium">{vendor.rating}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[#A85C36]">
                  {vendor.price}
                </span>
                <span className="text-sm text-[#364257]">
                  {vendor.vicinity || vendor.formatted_address || 'Local vendor'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-[#364257] mb-4">
            No vendors selected yet. No worries - you can always browse our vendor catalog for better results!
          </p>
        </div>
      )}
    </motion.div>
  );

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'todos': return 'Review Your Timeline';
      case 'budget': return 'Review Your Budget';
      case 'vendors': return 'Review Your Vendors';
      default: return 'Review Your Plan';
    }
  };

  const getNextButtonText = () => {
    switch (currentSection) {
      case 'todos': return 'Review Budget';
      case 'budget': return 'Review Vendors';
      case 'vendors': return 'Complete Setup';
      default: return 'Next';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-playfair font-semibold text-[#332B42] mb-4">
          {getSectionTitle()}
        </h1>
        <p className="text-[#364257] text-lg">
          Take a look at what Paige has prepared for you. You can edit anything you'd like to change.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2">
          {['todos', 'budget', 'vendors'].map((section, index) => {
            const isCompleted = completedSections.has(section);
            const isCurrent = currentSection === section;
            const isPast = ['todos', 'budget', 'vendors'].indexOf(currentSection) > index;
            
            return (
              <React.Fragment key={section}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted || isPast
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-[#A85C36] text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}>
                  {isCompleted || isPast ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 ${
                    isPast ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <AnimatePresence mode="wait">
          {currentSection === 'todos' && renderTodos()}
          {currentSection === 'budget' && renderBudget()}
          {currentSection === 'vendors' && renderVendors()}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onBack}
          className="btn-primaryinverse px-8 py-3 rounded-lg font-semibold text-base"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="btn-primary px-8 py-3 rounded-lg font-semibold text-base flex items-center gap-2"
        >
          {getNextButtonText()}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ReviewFlow;
