// components/RightDashboardPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList } from 'lucide-react';
import CategoryPill from './CategoryPill';

// Define necessary interfaces (can be moved to a types file if preferred)
interface TodoItem {
  id: string;
  name: string;
  deadline?: Date;
  note?: string;
  category?: string;
  contactId?: string;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  website?: string;
  avatarColor?: string;
  userId: string;
  orderIndex?: number;
}

interface RightDashboardPanelProps {
  currentUser: User;
  contacts: Contact[]; // Pass contacts down for linking todo items
}

const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts }) => {
  const todoItemsCollection = collection(db, 'todoItems');

  const [rightPanelSelection, setRightPanelSelection] = useState<'todo' | 'messages' | 'favorites'>('todo');
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [selectedTodoSubCategory, setSelectedTodoSubCategory] = useState<'all' | 'shared' | 'my'>('all');

  // Effect to fetch To-Do items
  useEffect(() => {
    let unsubscribeTodoItems: () => void;
    if (currentUser && rightPanelSelection === 'todo') {
      const q = query(
        todoItemsCollection,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      unsubscribeTodoItems = onSnapshot(q, (snapshot) => {
        const fetchedTodoItems: TodoItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            deadline: data.deadline?.toDate(), // Convert Firestore Timestamp to Date
            note: data.note,
            category: data.category,
            contactId: data.contactId,
            isCompleted: data.isCompleted,
            userId: data.userId,
            createdAt: data.createdAt.toDate(),
          };
        });
        setTodoItems(fetchedTodoItems);
      }, (error) => {
        console.error('Error fetching To-Do items:', error);
        toast.error('Failed to load To-Do items.');
      });
    } else {
      setTodoItems([]);
    }
    return () => {
      if (unsubscribeTodoItems) {
        unsubscribeTodoItems();
      }
    };
  }, [currentUser, rightPanelSelection]);

  // Function to handle adding a new To-Do item
  const handleAddNewTodo = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to add a To-Do item.');
      return;
    }
    const newTodo: TodoItem = {
      id: uuidv4(),
      name: 'New To-do Item (Click to Edit)',
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: new Date(),
    };

    try {
      await addDoc(todoItemsCollection, {
        ...newTodo,
        createdAt: newTodo.createdAt, // Store as Firestore Timestamp
      });
      toast.success('New To-do item added!');
    } catch (error: any) {
      console.error('Error adding To-do item:', error);
      toast.error(`Failed to add To-do item: ${error.message}`);
    }
  };

  // Function to toggle To-Do item completion
  const handleToggleTodoComplete = async (todo: TodoItem) => {
    try {
      const todoRef = doc(db, 'todoItems', todo.id);
      await setDoc(todoRef, { isCompleted: !todo.isCompleted }, { merge: true });
      toast.success(`To-do item marked as ${todo.isCompleted ? 'incomplete' : 'complete'}!`);
    } catch (error: any) {
      console.error('Error toggling To-Do item completion:', error);
      toast.error(`Failed to update To-Do item: ${error.message}`);
    }
  };

  // Filtered To-Do items based on selectedTodoSubCategory
  const filteredTodoItems = useMemo(() => {
    if (selectedTodoSubCategory === 'all') {
      return todoItems;
    }
    // Placeholder for 'shared' and 'my' logic - currently returns empty for simplicity
    // You would implement actual filtering based on 'shared' or 'my' properties on TodoItem
    return [];
  }, [todoItems, selectedTodoSubCategory]);

  return (
    <div
      className="hidden md:flex flex-row w-1/4 rounded-[5px] border border-[#AB9C95] overflow-hidden"
      style={{ maxHeight: '100%' }}
    >
      {/* Vertical Navigation (Icons) - Main Panel Switcher - Left Column of Right Panel */}
      <div className="flex flex-col bg-[#F3F2F0] p-2 border-r border-[#AB9C95] space-y-2">
        <button
          onClick={() => setRightPanelSelection('todo')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'todo' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7]'}
          `}
          title="To-do Items"
        >
          <ClipboardList className="w-5 h-5" />
        </button>
        <button
          onClick={() => setRightPanelSelection('messages')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'messages' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7]'}
          `}
          title="Messages (Wedding Planner)"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button
          onClick={() => setRightPanelSelection('favorites')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'favorites' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7'}
          `}
          title="Favorites (Vendors)"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area for Right Panel - Right Column of Right Panel */}
      <aside
        className="flex-1 bg-[#DEDBDB] p-4 overflow-y-auto"
        style={{ maxHeight: '100%' }}
      >
        {/* Conditional Content based on rightPanelSelection */}
        {rightPanelSelection === 'todo' && (
          <div className="flex flex-col h-full">
            {/* Wrapper div for the header and tabs with the desired background color */}
            <div className="bg-[#F3F2F0] rounded-t-[5px] -mx-4 -mt-4">
              <h3 className="font-playfair text-lg font-semibold px-4 pt-4 mb-2 text-[#332B42]">To-do Items</h3>
              {/* Tabs container - removed border-b from here as it's now on active button */}
              <div className="flex border-b border-[#AB9C95] px-4"> {/* Added px-4 for horizontal alignment */}
                <button
                  onClick={() => setSelectedTodoSubCategory('all')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'all'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs' // Active tab styling: 12px, medium, no background
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal' // Inactive tab styling: 12px, regular
                    }`}
                >
                  All To-do
                </button>
                <button
                  onClick={() => setSelectedTodoSubCategory('shared')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'shared'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs' // Active tab styling
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal' // Inactive tab styling
                    }`}
                >
                  Shared To-do
                </button>
                <button
                  onClick={() => setSelectedTodoSubCategory('my')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'my'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs' // Active tab styling
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal' // Inactive tab styling
                    }`}
                >
                  My To-do
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredTodoItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
                  <img src="/To_Do_Items.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
                  <p>Add a To-do item</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTodoItems.map((todo) => (
                    <div key={todo.id} className="flex items-start gap-2 p-2 border border-[#AB9C95] rounded-[5px] bg-white">
                      <button
                        onClick={() => handleToggleTodoComplete(todo)}
                        className="flex-shrink-0 p-1 text-[#A85C36] hover:text-[#784528]"
                      >
                        {todo.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-medium text-[#332B42] ${todo.isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {todo.name}
                        </p>
                        {todo.deadline && (
                          <p className="text-xs text-gray-500">
                            Deadline: {todo.deadline.toLocaleDateString()}
                          </p>
                        )}
                        {todo.note && (
                          <p className="text-xs text-gray-500 italic">
                            Note: {todo.note}
                          </p>
                        )}
                        {todo.category && (
                          <CategoryPill category={todo.category} />
                        )}
                        {todo.contactId && (
                          <p className="text-xs text-gray-500">
                            Contact: {contacts.find(c => c.id === todo.contactId)?.name || 'N/A'}
                          </p>
                        )}
                      </div>
                      <button className="flex-shrink-0 p-1 text-[#7A7A7A] hover:text-[#332B42]">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handleAddNewTodo}
                  className="text-xs text-[#A85C36] hover:text-[#784528] font-medium flex items-center gap-1"
                >
                  + New To-do Item
                </button>
                <Link href="/todo" className="text-xs text-[#364257] hover:text-[#A85C36] font-medium no-underline">
                  View all
                </Link>
              </div>
            </div>
          </div>
        )}

        {rightPanelSelection === 'messages' && (
          <div className="text-sm text-gray-500 text-center py-8">
            Messages with Wedding Planner (Coming Soon!)
          </div>
        )}

        {rightPanelSelection === 'favorites' && (
          <div className="text-sm text-gray-500 text-center py-8">
            Favorited Vendors (Coming Soon!)
          </div>
        )}
      </aside>
    </div>
  );
};

export default RightDashboardPanel;
