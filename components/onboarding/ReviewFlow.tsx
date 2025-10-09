'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, Users, Sparkles } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';
import ToDoListEditor from '@/components/ToDoListEditor';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Todo {
  id: string;
  title?: string;
  name?: string; // Support optimized API format
  description?: string;
  note?: string; // Support optimized API format
  completed?: boolean;
  isCompleted?: boolean; // Support optimized API format
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  deadline?: string;
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
  templateName?: string;
  templateDescription?: string;
  usedFallbackTodos?: boolean;
}

const ReviewFlow: React.FC<ReviewFlowProps> = ({
  todos: initialTodos,
  budget,
  likedVendors,
  onComplete,
  onBack,
  templateName = "Full Wedding Checklist",
  templateDescription = "tasks to help you stay on track",
  usedFallbackTodos = false
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Save todos to Firestore
  const saveTodosToFirestore = async (todosToSave: Todo[]) => {
    if (!user) return;
    
    try {
      // For now, we'll save the todos to localStorage since this is part of the onboarding flow
      // The todos will be properly saved when the user completes the onboarding
      const savedData = localStorage.getItem('paige_generated_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        parsedData.todos = todosToSave;
        localStorage.setItem('paige_generated_data', JSON.stringify(parsedData));
      }
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  };

  const handleTaskUpdate = (updatedTasks: any) => {
    // Handle both array and object formats
    const tasksArray = Array.isArray(updatedTasks) ? updatedTasks : [updatedTasks];
    
    // Convert back to Todo format
    const updatedTodos = tasksArray.map(task => ({
      id: task.id,
      name: task.name,
      title: task.name, // Keep both for compatibility
      note: task.note,
      description: task.note, // Keep both for compatibility
      category: task.category,
      deadline: task.deadline,
      priority: task.priority,
      completed: task.isCompleted,
      isCompleted: task.isCompleted
    }));
    
    // Update the todos state by merging the updated tasks with existing todos
    setTodos(prevTodos => {
      let newTodos;
      
      // If we received the full array, use it directly
      if (Array.isArray(updatedTasks)) {
        newTodos = updatedTodos;
      } else {
        // If we received a single task update, merge it with existing todos
        newTodos = prevTodos.map(todo => {
          const updatedTask = updatedTodos.find(updated => updated.id === todo.id);
          return updatedTask || todo;
        });
      }
      
      // Save the updated todos
      saveTodosToFirestore(newTodos);
      
      return newTodos;
    });
  };


  const renderTodos = () => (
    <motion.div
      key="todos"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="bg-white rounded-lg border border-[#AB9C95] max-h-[600px] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#AB9C95] p-4 mb-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#332B42] mb-1">{templateName}</h3>
                <p className="text-xs text-[#6B7280]">
                  {templateDescription === "This is the first step to successful wedding prep!" 
                    ? templateDescription 
                    : `${todos.length} ${templateDescription}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 pt-0">
        <ToDoListEditor
          tasks={todos.map(todo => ({
            id: todo.id,
            _id: todo.id,
            name: todo.name || todo.title, // Support both formats
            note: todo.note || todo.description || '',
            category: todo.category || '',
            deadline: todo.deadline || null,
            isCompleted: todo.isCompleted || todo.completed || false,
            priority: todo.priority || 'Medium'
          }))}
          setTasks={handleTaskUpdate} // ✅ Now editable!
          customCategoryValue=""
          setCustomCategoryValue={() => {}}
          allCategories={['Planning', 'Vendor', 'Venue', 'Attire', 'Beauty', 'Transportation', 'Photography', 'Music', 'Food', 'Decor', 'Stationery', 'Guest', 'Honeymoon', 'Legal']}
          contacts={[]}
          currentUser={user}
          onAssign={undefined}
        />
        </div>
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
      </div>

      {likedVendors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {likedVendors.map((vendor, index) => (
            <motion.div
              key={vendor.id || `vendor-${index}-${vendor.name}`}
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



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-left mb-6">
        <h1 className="h6 text-[#332B42] mb-2">
          Review Your To-dos
        </h1>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          Take a look at what Paige has prepared for you. You can edit anything you'd like to change.
        </p>
      </div>

      {/* Fallback Banner - shown when AI deadline generation failed */}
      {usedFallbackTodos && (
        <div className="mb-6 bg-[#EDE7F6] border border-[#B39DDB] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#7E57C2] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#332B42]">
                We had trouble generating intelligent deadlines for your tasks, but don't worry! 
                All your tasks are ready to go and you can add deadlines manually later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mb-8">
        {renderTodos()}
      </div>

    </motion.div>
  );
};

export default ReviewFlow;
