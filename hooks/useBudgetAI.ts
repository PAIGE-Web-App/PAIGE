import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCustomToast } from './useCustomToast';
import { getCategoryColor } from '@/utils/categoryIcons';
import { useRAGTodoGeneration } from './useRAGTodoGeneration';
import type { AIGeneratedBudget, AIGeneratedTodoList, IntegratedPlan } from '@/types/budget';

export function useBudgetAI() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { generateTodos } = useRAGTodoGeneration();

  const handleGenerateBudget = useCallback(async (
    description: string, 
    totalBudget: number, 
    aiBudget?: AIGeneratedBudget
  ) => {
    try {
      let data: AIGeneratedBudget;
      
      if (aiBudget) {
        // Use the provided RAG response directly
        data = aiBudget;
      } else {
        // Use RAG system as default (no fallback to old API)
        const response = await fetch('/api/generate-budget-rag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            description, 
            totalBudget,
            weddingDate: new Date().toISOString(),
            userId: user?.uid,
            userEmail: user?.email
          }),
        });

        if (!response.ok) throw new Error('Failed to generate budget');
        const ragResponse = await response.json();
        
        if (ragResponse.success && ragResponse.budget) {
          // Transform RAG response to match expected format
          data = {
            categories: ragResponse.budget.categories.map((category: any) => ({
              name: category.name,
              allocatedAmount: category.amount || 0,
              color: getCategoryColor(category.name),
              items: (category.subcategories || []).map((sub: any) => ({
                name: sub.name,
                amount: 0, // Set to 0 as per user requirement (amount = spent, not allocated)
                allocatedAmount: sub.amount || 0,
                priority: sub.priority || 'Medium',
                notes: sub.notes || ''
              }))
            })),
            totalAllocated: totalBudget
          };
        } else {
          throw new Error('Invalid RAG response format');
        }
      }
      
      showSuccessToast('AI budget generated successfully!');
      return data;
    } catch (error: any) {
      console.error('Error generating budget:', error);
      showErrorToast(`Failed to generate budget: ${error.message}`);
      throw error;
    }
  }, [user?.uid, user?.email, showSuccessToast, showErrorToast]);

  const handleGenerateTodoList = useCallback(async (description: string) => {
    try {
      // Use RAG system for todo generation
      const ragResponse = await generateTodos({
        description,
        weddingDate: new Date().toISOString(),
        todoType: 'comprehensive',
        focusCategories: [],
        existingTodos: [],
        vendorData: []
      });

      if (ragResponse.success && ragResponse.todos) {
        // Transform RAG response to match expected format
        const transformedData: AIGeneratedTodoList = {
          name: ragResponse.todos.listName,
          tasks: ragResponse.todos.todos.map((task: any) => ({
            name: task.name,
            note: task.note || '',
            deadline: task.deadline || '',
            category: task.category || 'Planning'
          }))
        };
        
        showSuccessToast('AI todo list generated successfully!');
        return transformedData;
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (error: any) {
      console.error('Error generating todo list:', error);
      showErrorToast(`Failed to generate todo list: ${error.message}`);
      throw error;
    }
  }, [generateTodos, showSuccessToast, showErrorToast]);

  const handleGenerateIntegratedPlan = useCallback(async (description: string) => {
    try {
      const response = await fetch('/api/generate-integrated-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description,
          userId: user?.uid
        }),
      });

      if (!response.ok) throw new Error('Failed to generate integrated plan');
      const data: IntegratedPlan = await response.json();
      
      showSuccessToast('AI integrated plan generated successfully!');
      return data;
    } catch (error: any) {
      console.error('Error generating integrated plan:', error);
      showErrorToast(`Failed to generate integrated plan: ${error.message}`);
      throw error;
    }
  }, [user?.uid, showSuccessToast, showErrorToast]);

  return {
    handleGenerateBudget,
    handleGenerateTodoList,
    handleGenerateIntegratedPlan,
  };
}
