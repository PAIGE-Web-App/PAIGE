'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GmailTodoReviewModal from '@/components/GmailTodoReviewModal';
import { useCustomToast } from '@/hooks/useCustomToast';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TestSpecificMessageAnalysis() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const testSpecificMessage = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // Use analyze-messages-for-todos which stores suggestions for preview
      const response = await fetch('/api/analyze-messages-for-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          contactEmail: 'youngjedistudio@gmail.com' // The contact we just imported messages for
        }),
      });
      
      const data = await response.json();
      console.log('📊 Full API response:', data);
      console.log('📊 Analysis result:', data.analysisResult);
      console.log('📊 Analysis results (nested):', data.analysisResult?.analysisResults);
      console.log('📊 New todos:', data.analysisResult?.analysisResults?.newTodos);
      
      // Show the modal with the results
      if (data.success && data.analysisResult?.analysisResults) {
        const results = data.analysisResult.analysisResults;
        console.log('✅ Showing modal with results:', results);
        setAnalysisResults(results);
        setShowModal(true);
      } else {
        console.error('❌ No analysis results found. Full data structure:', JSON.stringify(data, null, 2));
        showErrorToast(`No analysis results found. Analyzed ${data.analysisResult?.messagesAnalyzed || 0} messages.`);
      }
    } catch (error: any) {
      console.error('Test error:', error);
      showErrorToast(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithMockMessage = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    
    // Simulate a delay for loading state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Create mock data showing all three states
      const mockResults = {
        newTodos: [
          {
            id: 'mock-new-1',
            name: 'Book Wedding Photographer',
            note: 'Contact recommended photographer Sarah Johnson for availability on June 15, 2025. Discussed budget range of $3,000-$4,000.',
            category: 'Photography',
            deadline: new Date('2025-03-15'),
            sourceMessage: 'Re: Wedding Photography Services',
            sourceContact: 'Sarah Johnson Photography',
            sourceEmail: 'sarah@photosjohnson.com',
            confidenceScore: 0.92
          },
          {
            id: 'mock-new-2',
            name: 'Finalize Catering Menu Selection',
            note: 'Choose between Italian or French-inspired menu. Vegetarian and gluten-free options required for 15 guests.',
            category: 'Catering',
            deadline: new Date('2025-02-28'),
            sourceMessage: 'Menu Options for Your Special Day',
            sourceContact: 'Elegant Events Catering',
            sourceEmail: 'events@elegantcatering.com',
            confidenceScore: 0.88
          }
        ],
        todoUpdates: [
          {
            todoId: 'existing-todo-1',
            existingTodoName: 'Send Save the Date Cards',
            updates: {
              note: 'Designer confirmed artwork will be ready by January 20th. Printing takes 5 business days.',
              deadline: '2025-01-30'
            },
            updateReason: 'New deadline information received from designer',
            confidenceScore: 0.85
          }
        ],
        completedTodos: [
          {
            todoId: 'existing-todo-2',
            existingTodoName: 'Book Wedding Venue',
            completionReason: 'Venue confirmed Rosewood Manor is officially reserved for June 15, 2025. Contract signed and deposit paid.',
            confidenceScore: 0.95
          }
        ],
        messagesAnalyzed: 3
      };
      
      console.log('📊 Mock analysis results with all three states:', mockResults);
      setAnalysisResults(mockResults);
      setShowModal(true);
    } catch (error: any) {
      console.error('Test error:', error);
      showErrorToast(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (selectedTodos: any) => {
    if (!user?.uid) return;
    
    try {
      // Create the selected todos in Firestore
      for (const todo of selectedTodos.newTodos) {
        await addDoc(collection(db, 'users', user.uid, 'todoItems'), {
          name: todo.name,
          note: todo.note || '',
          deadline: todo.deadline || null,
          category: todo.category || 'Planning',
          isCompleted: false,
          userId: user.uid,
          createdAt: new Date(),
          orderIndex: -1,
          listId: null, // Will be assigned by user
        });
      }
      
      // Update existing todos
      for (const update of selectedTodos.todoUpdates) {
        if (update.todoId) {
          await updateDoc(doc(db, 'users', user.uid, 'todoItems', update.todoId), {
            ...update.updates,
            updatedAt: Timestamp.now()
          });
        }
      }
      
      // Mark todos as completed
      for (const completed of selectedTodos.completedTodos) {
        if (completed.todoId) {
          await updateDoc(doc(db, 'users', user.uid, 'todoItems', completed.todoId), {
            isCompleted: true,
            completedAt: Timestamp.now()
          });
        }
      }
      
      showSuccessToast(`Applied ${selectedTodos.newTodos.length + selectedTodos.todoUpdates.length + selectedTodos.completedTodos.length} todo changes!`);
      setShowModal(false);
      setAnalysisResults(null);
    } catch (error: any) {
      console.error('Error applying todo changes:', error);
      showErrorToast('Failed to apply some todo changes');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Specific Message Analysis</h1>
      <p className="mb-4">Test the todo analysis with the actual imported messages and see the AI modal.</p>
      
      <div className="space-y-4">
        <button
          onClick={testSpecificMessage}
          disabled={isLoading || !user?.uid}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
        >
          {isLoading ? 'Testing...' : 'Test with Imported Messages'}
        </button>
        
        <button
          onClick={testWithMockMessage}
          disabled={isLoading || !user?.uid}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test with Mock Message'}
        </button>
      </div>
      
      {/* Gmail Todo Review Modal */}
      <GmailTodoReviewModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setAnalysisResults(null);
        }}
        onConfirm={handleConfirm}
        analysisResults={analysisResults}
        isAnalyzing={isLoading}
      />
    </div>
  );
}
