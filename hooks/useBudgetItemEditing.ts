import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { doc, setDoc } from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';

interface EditingState {
  field: string | null;
  value: string;
  isEditing: boolean;
}

interface UseBudgetItemEditingProps {
  itemId: string;
  initialValues: {
    name: string;
    amount: number;
    notes?: string | null;
  };
  onUpdate?: (updates: any) => Promise<void>;
}

export const useBudgetItemEditing = ({ 
  itemId, 
  initialValues, 
  onUpdate 
}: UseBudgetItemEditingProps) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [editingState, setEditingState] = useState<EditingState>({
    field: null,
    value: '',
    isEditing: false
  });

  const startEditing = useCallback((field: string, currentValue: string | number) => {
    setEditingState({
      field,
      value: currentValue.toString(),
      isEditing: true
    });
  }, []);

  const stopEditing = useCallback(() => {
    setEditingState({
      field: null,
      value: '',
      isEditing: false
    });
  }, []);

  const updateEditValue = useCallback((value: string) => {
    setEditingState(prev => ({ ...prev, value }));
  }, []);

  const saveEdit = useCallback(async (value?: string) => {
    if (!editingState.field || !user) return;

    try {
      const updates: any = { updatedAt: new Date() };
      const valueToUse = value || editingState.value;
      
      if (editingState.field === 'amount') {
        const numValue = parseFloat(valueToUse);
        if (isNaN(numValue)) {
          showErrorToast('Please enter a valid amount');
          return;
        }
        updates.amount = numValue;
      } else if (editingState.field === 'name') {
        if (!valueToUse.trim()) {
          showErrorToast('Name cannot be empty');
          return;
        }
        updates.name = valueToUse.trim();
      } else if (editingState.field === 'notes') {
        updates.notes = valueToUse.trim() || null;
      }

      if (onUpdate) {
        await onUpdate(updates);
      } else {
        const itemRef = doc(getUserCollectionRef('budgetItems', user.uid), itemId);
        await setDoc(itemRef, updates, { merge: true });
      }

      showSuccessToast(`${editingState.field.charAt(0).toUpperCase() + editingState.field.slice(1)} updated!`);
      stopEditing();
    } catch (error: any) {
      console.error(`Error updating ${editingState.field}:`, error);
      showErrorToast(`Failed to update ${editingState.field}: ${error.message}`);
    }
  }, [editingState, user, itemId, onUpdate, showSuccessToast, showErrorToast, stopEditing]);

  const cancelEdit = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    editingState,
    startEditing,
    stopEditing,
    updateEditValue,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    isEditing: editingState.isEditing,
    editingField: editingState.field,
    editValue: editingState.value
  };
}; 