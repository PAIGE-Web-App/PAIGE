import React, { useState } from 'react';
import { PenTool, Upload, Sparkles } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
import ToDoFields from './ToDoFields';
import ToDoListEditor from './ToDoListEditor';
import { useAuth } from '../hooks/useAuth';
import { getAllCategories } from '../lib/firebaseCategories';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Banner from './Banner';
import TodoItemSkeleton from './TodoItemSkeleton';
import { useCredits } from '../hooks/useCredits';
import { creditEventEmitter } from '@/utils/creditEventEmitter';
import CreditToast from './CreditToast';
import { useRouter } from 'next/navigation';
import { useRAGTodoGeneration } from '../hooks/useRAGTodoGeneration';

interface ToDoBuilderFormProps {
  mode?: 'list' | 'todo';
  onSubmit?: (data: any) => void;
}

const TABS = [
  {
    key: 'ai',
    label: 'Create with Paige',
    icon: <Sparkles className="w-5 h-5 mr-1" />,
    description: 'Describe what you need, and let PAIGE generate a smart to-do list for you in seconds.'
  },
  {
    key: 'manual',
    label: 'Start from scratch',
    icon: <PenTool className="w-5 h-5 mr-1" />,
    description: 'Start with a blank slate and build your to-do list manually—just the way you like it.'
  },
  {
    key: 'import',
    label: 'Import via CSV',
    icon: <Upload className="w-5 h-5 mr-1" />,
    description: 'Already have tasks in a spreadsheet? Upload your CSV to generate your list instantly.'
  },
];

let tempIdCounter = 0;
function getStableId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `temp-id-${tempIdCounter++}`;
}

const ToDoBuilderForm: React.FC<ToDoBuilderFormProps> = ({ mode = 'list', onSubmit }) => {
  const { user } = useAuth();
  const { credits, loadCredits } = useCredits();
  const router = useRouter();
  const { generateTodos, isLoading: ragLoading, error: ragError } = useRAGTodoGeneration();
  const [selectedTab, setSelectedTab] = useState<'manual' | 'import' | 'ai'>('ai');
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState([{ _id: getStableId(), name: '', note: '', category: '', deadline: '', endDate: '' }]);
  const [customCategoryValue, setCustomCategoryValue] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [aiListResult, setAiListResult] = React.useState(null);
  const [allCategories, setAllCategories] = React.useState<string[]>([]);
  const [weddingDate, setWeddingDate] = React.useState<string | null>(null);
  
  // Credit toast state
  const [showCreditToast, setShowCreditToast] = useState(false);
  const [creditToastData, setCreditToastData] = useState({ creditsSpent: 0, creditsRemaining: 0 });
  const [previousCredits, setPreviousCredits] = useState(0);

  React.useEffect(() => {
    if (user?.uid) {
      getAllCategories(user.uid).then(setAllCategories);
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        const data = snap.data();
        if (data?.weddingDate?.seconds) {
          const date = new Date(data.weddingDate.seconds * 1000);
          setWeddingDate(date.toISOString().split('T')[0]);
        }
      });
    }
  }, [user]);

  // Monitor credits for toast notifications
  React.useEffect(() => {
    if (credits) {
      const currentTotal = (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
      
      // Check if credits decreased (indicating usage) and we have a valid previous value
      if (previousCredits > 0 && currentTotal > 0 && currentTotal < previousCredits) {
        const creditsSpent = previousCredits - currentTotal;
        setCreditToastData({ creditsSpent, creditsRemaining: currentTotal });
        setShowCreditToast(true);
      }
      
      // Always update previous credits when we get new data
      setPreviousCredits(currentTotal);
    }
  }, [credits]);

  // Listen for credit updates
  React.useEffect(() => {
    const handleCreditUpdate = () => {
      setTimeout(async () => {
        await loadCredits();
      }, 500);
    };

    const unsubscribe = creditEventEmitter.subscribe(handleCreditUpdate);
    
    return () => unsubscribe();
  }, [loadCredits]);

  const handleAddTask = () => setTasks([...tasks, { _id: getStableId(), name: '', note: '', category: '', deadline: '', endDate: '' }]);
  const handleRemoveTask = (idx: number) => setTasks(tasks.filter((_, i) => i !== idx));
  const updateTask = (index: number, field: string, value: string) => setTasks(tasks.map((task, i) => {
    if (i !== index) return task;
    let updated = { ...task, [field]: value };
    if (field === 'deadline' && value) {
      // Normalize to string
      if (typeof value === 'object' && value !== null && (value as Date) instanceof Date) {
        updated.deadline = (value as Date).toISOString().slice(0, 16);
      } else if (typeof value === 'string' && value.length > 0) {
        // Already string, keep as is
      }
    }
    if (field === 'endDate' && value) {
      if (typeof value === 'object' && value !== null && (value as Date) instanceof Date) {
        updated.endDate = (value as Date).toISOString().slice(0, 16);
      } else if (typeof value === 'string' && value.length > 0) {
        // Already string, keep as is
      }
    }
    // Add debug log in updateTask for deadline changes
    if (field === 'deadline') {
      console.log('[ToDoBuilderForm] updateTask deadline', { index, value, tasks: tasks.map(t => ({ _id: t._id, deadline: t.deadline })) });
    }
    return updated;
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTab === 'ai') {
      const aiResult: any = aiListResult;
      if (!aiResult || !aiResult.name || !Array.isArray(aiResult.tasks)) return;

      const tasksWithDates = aiResult.tasks.map((task: any) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : null,
        endDate: task.endDate ? new Date(task.endDate) : null,
      }));

      onSubmit && onSubmit({
        name: aiResult.name.trim(),
        tasks: tasksWithDates.filter((task: any) => task.name && task.name.trim())
      });
    } else if (selectedTab === 'manual') {
      if (!listName.trim()) return;
      const validTasks: any[] = tasks
        .filter((task: any) => task.name && task.name.trim())
        .map(task => ({
          ...task,
          deadline: task.deadline ? new Date(task.deadline) : null,
          endDate: task.endDate ? new Date(task.endDate) : null,
        }));
      onSubmit && onSubmit({ name: listName.trim(), tasks: validTasks });
    } else if (selectedTab === 'import') {
      // TODO: Add logic to submit imported CSV list
      // onSubmit && onSubmit({ name: csvListName, tasks: csvTasks });
    }
  };

  // Only set aiListResult when the AI generates a new list
  const handleBuildWithAI = async (description: string) => {
    // This function should be called by AIListCreationForm when generating a new list
    // Example fetch (replace with your actual API call):
    // const res = await fetch('/api/generate-list', { ... });
    // const data = await res.json();
    // setAiListResult(data);
    // For now, just clear it to simulate a new list
    setAiListResult(null);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Tabs always visible */}
      <div className="flex gap-2 mb-8">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as 'manual' | 'import' | 'ai')}
            className={`flex items-center px-6 py-2 transition-all duration-150 focus:outline-none border-b-2 ${selectedTab === tab.key ? 'text-[#a85c36] border-[#a85c36]' : 'text-[#332B42] border-transparent hover:text-[#a85c36]'}`}
            style={{ borderRadius: 0, background: 'none' }}
          >
            {tab.icon}
            <span className="text-sm ml-1">{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Only this area scrolls */}
      <div className="w-full flex-1 flex items-start justify-center max-h-[75vh] overflow-y-auto">
        {selectedTab === 'manual' && (
          <ManualListCreationForm
            allCategories={[]}
            onSubmit={onSubmit}
            listName={listName}
            setListName={setListName}
            canSubmit={canSubmit}
            tasks={tasks}
            setTasks={setTasks}
            customCategoryValue={customCategoryValue}
            setCustomCategoryValue={setCustomCategoryValue}
          />
        )}
        {selectedTab === 'import' && (
          <ImportListCreationForm />
        )}
        {selectedTab === 'ai' && (
          <AIListCreationForm
            isGenerating={false}
            handleBuildWithAI={handleBuildWithAI}
            setAiListResult={setAiListResult}
            aiListResult={aiListResult}
            allCategories={allCategories}
            weddingDate={weddingDate}
            user={user}
            credits={credits}
            loadCredits={loadCredits}
            router={router}
          />
        )}
      </div>
      
      {/* Credit Toast */}
      <CreditToast
        isVisible={showCreditToast}
        creditsSpent={creditToastData.creditsSpent}
        creditsRemaining={creditToastData.creditsRemaining}
        onClose={() => setShowCreditToast(false)}
      />
    </div>
  );
};

const ManualListCreationForm = ({ allCategories = [], onSubmit, listName, setListName, canSubmit, tasks, setTasks, customCategoryValue, setCustomCategoryValue }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [listNameError, setListNameError] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Fetch AI-powered suggestions from the API
  const fetchAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/generate-list-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'General Wedding Tasks' }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setSuggestions([
        'Wedding Planning Checklist',
        'Reception Setup',
        'Bridal Party Tasks',
        'Vendor Contacts',
        'Day-Of Timeline',
        'Decor & Design',
        'Guest List Management',
      ]);
    }
    setIsLoadingSuggestions(false);
    setHasFetchedSuggestions(true);
  };

  // Function to check if list name already exists
  const checkListNameExists = async (name: string) => {
    if (!name.trim()) {
      setListNameError('List name is required');
      return true;
    }

    setIsCheckingName(true);
    setListNameError(null);

    try {
      // For now, we'll just check if the name is empty or too short
      // In a real implementation, you'd call the API to check for duplicates
      if (name.trim().length < 2) {
        setListNameError('List name must be at least 2 characters long');
        return true;
      }
      
      setListNameError(null);
      return false;
    } catch (error) {
      console.error('Error checking list name:', error);
      setListNameError('Error checking list name availability');
      return false;
    } finally {
      setIsCheckingName(false);
    }
  };

  // Fetch suggestions automatically on mount
  React.useEffect(() => {
    if (!hasFetchedSuggestions) {
      fetchAISuggestions();
    }
    // eslint-disable-next-line
  }, []);

  // Only fetch suggestions once, on first focus
  const handleListNameFocus = () => {
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setListName(suggestion);
    setShowSuggestions(false);
  };

  return (
    <form className="w-full max-w-3xl mx-auto flex flex-col space-y-6" onSubmit={e => e.preventDefault()}>
      <div>
        <label className="block text-xs font-medium text-[#332B42] mb-1">List Name</label>
        <input
          className={`w-full border px-3 py-2 rounded-[5px] text-sm ${
            listNameError ? 'border-red-500' : 'border-[#AB9C95]'
          }`}
          value={listName}
          onChange={e => { 
            setListName(e.target.value); 
            setShowSuggestions(true);
            // Clear error when user starts typing
            if (listNameError) {
              setListNameError(null);
            }
          }}
          onBlur={(e) => {
            // Check for duplicate name when user leaves the input
            if (e.target.value.trim()) {
              checkListNameExists(e.target.value);
            }
          }}
          placeholder="Enter list name"
          required
          onFocus={handleListNameFocus}
        />
        {isCheckingName && (
          <div className="text-xs text-gray-500 mt-1">Checking name availability...</div>
        )}
        {listNameError && (
          <div className="text-xs text-red-500 mt-1">{listNameError}</div>
        )}
        {showSuggestions && !listName.trim() && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2 text-[#332B42]">Suggestions for you</div>
            {isLoadingSuggestions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse bg-gray-200 rounded my-1 w-3/4" style={{ lineHeight: '1.5rem' }} />
              ))
            ) : (
              <div className="flex flex-col gap-1">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className="flex items-center text-left px-0 py-1.5 hover:bg-[#F3F2F0] text-sm rounded"
                    onClick={() => handleSuggestionClick(s.replace(/^"|"$/g, ''))}
                    tabIndex={-1}
                  >
                    <Sparkles className="w-4 h-4 text-[#a85c36] mr-2" />
                    <span className="truncate">{s.replace(/^"|"$/g, '')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {listName.trim() && (
        <div>
          <label className="block text-xs font-medium text-[#332B42] mb-1">Initial To-Dos</label>
          <ToDoListEditor
            tasks={tasks}
            setTasks={(maybeFn: any) => {
              let updated;
              if (typeof maybeFn === 'function') {
                updated = maybeFn(Array.isArray(tasks) ? tasks : []);
              } else {
                updated = maybeFn;
              }
              setTasks(updated);
            }}
            customCategoryValue={customCategoryValue}
            setCustomCategoryValue={setCustomCategoryValue}
            allCategories={allCategories}
          />
        </div>
      )}
    </form>
  );
};

const ImportListCreationForm = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCsvFile(file);
  };
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div>
        <label className="block text-xs font-medium text-[#332B42] mb-1">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
        />
      </div>
      {csvFile && (
        <div className="text-sm text-[#332B42]">
          Selected file: {csvFile.name}
        </div>
      )}
      <div className="text-xs text-gray-500">
        <p>CSV should have the following columns:</p>
        <ul className="list-disc list-inside mt-1">
          <li>Task Name (required)</li>
          <li>Note (optional)</li>
          <li>Category (optional)</li>
          <li>Deadline (optional, format: YYYY-MM-DD HH:mm)</li>
          <li>End Date (optional, format: YYYY-MM-DD HH:mm)</li>
        </ul>
      </div>
    </div>
  );
};

const AIListCreationForm = ({ isGenerating, handleBuildWithAI, setAiListResult, aiListResult, allCategories, weddingDate, user, credits, loadCredits, router }: { isGenerating: boolean, handleBuildWithAI: (template: string) => void, setAiListResult: (result: any) => void, aiListResult: any, allCategories: string[], weddingDate: string | null, user?: any, credits?: any, loadCredits: () => Promise<void>, router?: any }) => {
  const [description, setDescription] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { generateTodos, isLoading: ragLoading, error: ragError } = useRAGTodoGeneration();
  const [showSlowGenerationBanner, setShowSlowGenerationBanner] = React.useState(false);
  const slowGenerationTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [listNameError, setListNameError] = React.useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = React.useState(false);

  // Utility to format a Date as yyyy-MM-ddTHH:mm for input type="datetime-local"
  function formatDateForInputWithTime(date: Date | string | undefined): string | undefined {
    if (!date) return undefined;
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Utility to generate a unique id
  function getStableId() {
    return Math.random().toString(36).substr(2, 9) + Date.now();
  }

  function getTodayAtFivePM() {
    const now = new Date();
    now.setHours(17, 0, 0, 0); // 5:00 PM local time
    return now;
  }

  function isBeforeToday(dateString: string | undefined) {
    if (!dateString) return true;
    const d = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    return d < now;
  }

  function looksLikeId(str: string | undefined) {
    // Only match actual ID patterns (random string + digits, typically 10+ characters)
    // This should NOT match normal category names
    return typeof str === 'string' && /^[a-zA-Z0-9]{15,}$/.test(str) && /\d/.test(str);
  }

  // Function to check if list name already exists
  const checkListNameExists = async (name: string) => {
    if (!name.trim() || !user?.uid) {
      setListNameError(null);
      return false;
    }

    setIsCheckingName(true);
    setListNameError(null);

    try {
      const res = await fetch('/api/check-list-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: name.trim(), userId: user.uid }),
      });

      if (!res.ok) throw new Error('Failed to check list name');
      
      const data = await res.json();
      
      if (data.exists) {
        setListNameError('A list with this name already exists');
        return true;
      } else {
        setListNameError(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking list name:', error);
      setListNameError('Error checking list name availability');
      return false;
    } finally {
      setIsCheckingName(false);
    }
  };

  const handleTasksUpdate = React.useCallback((updatedTasksOrFn: any[] | ((prev: any[]) => any[])) => {
    setAiListResult((prev: any) => {
      const prevTasks = Array.isArray(prev?.tasks) ? prev.tasks : [];
      const updated = typeof updatedTasksOrFn === 'function' ? updatedTasksOrFn(prevTasks) : updatedTasksOrFn;
      // Normalize dates to string format for input and assign ids
      const normalized = updated.map((t: any) => {
        const id = t.id || t._id || getStableId();
        let deadline = t.deadline ? formatDateForInputWithTime(t.deadline) : undefined;
        if (!deadline || isBeforeToday(deadline)) {
          deadline = formatDateForInputWithTime(getTodayAtFivePM());
        }
        // Don't replace categories unless they're actually IDs
        let category = t.category;
        if (looksLikeId(category)) {
          category = 'Uncategorized (New)';
        }
        return {
          ...t,
          id,
          _id: id,
          deadline,
          endDate: t.endDate ? formatDateForInputWithTime(t.endDate) : undefined,
          category,
        };
      });
      console.log('[AIListCreationForm] handleTasksUpdate - normalized:', normalized);
      return {
        ...prev,
        tasks: normalized
      };
    });
  }, [setAiListResult]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setAiListResult(null);
    setShowSlowGenerationBanner(false);

    if (slowGenerationTimer.current) {
      clearTimeout(slowGenerationTimer.current);
    }

    slowGenerationTimer.current = setTimeout(() => {
      setShowSlowGenerationBanner(true);
    }, 5000);

    try {
      // Use RAG system for todo generation
      const ragResponse = await generateTodos({
        description,
        weddingDate: weddingDate || new Date().toISOString(),
        todoType: 'comprehensive',
        focusCategories: allCategories,
        existingTodos: [],
        vendorData: []
      });

      if (ragResponse.success && ragResponse.todos) {
        // Transform RAG response to match expected format
        const transformedData = {
          listName: ragResponse.todos.listName,
          tasks: ragResponse.todos.todos.map((task: any) => {
            const id = getStableId();
            let deadline = task.deadline ? formatDateForInputWithTime(task.deadline) : undefined;
            if (!deadline || isBeforeToday(deadline)) {
              deadline = formatDateForInputWithTime(getTodayAtFivePM());
            }
            return {
              ...task,
              id,
              _id: id,
              deadline,
              category: task.category || 'Planning',
              note: task.note || '',
              priority: task.priority || 'Medium'
            };
          })
        };
        
        setAiListResult(transformedData);
        
        // Trigger credit refresh for useCredits hook
        if (ragResponse.credits && ragResponse.credits.required > 0) {
          console.log('🎯 Todo generation complete, triggering credit refresh:', ragResponse.credits);
          if (typeof window !== 'undefined') {
            localStorage.setItem('creditUpdateEvent', Date.now().toString());
            setTimeout(async () => {
              const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
              creditEventEmitter.emit();
            }, 1000);
          }
        }
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (e: any) {
      console.error('Error generating todo list:', e);
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
      if (slowGenerationTimer.current) {
        clearTimeout(slowGenerationTimer.current);
      }
    }
  };

  // Wedding planning suggestions
  const suggestions = [
    {
      title: "Full Wedding Planning Checklist",
      description: "From engagement to the honeymoon, covering all major milestones."
    },
    {
      title: "Day-Of Wedding Timeline",
      description: "Hour-by-hour tasks for your wedding day to keep everything running smoothly."
    },
    {
      title: "Vendor Booking Checklist",
      description: "Step-by-step tasks for finding, vetting, and securing vendors."
    },
    {
      title: "Budget & Payment Tracker",
      description: "To-dos for setting your budget, tracking payments, and staying on top of deadlines."
    },
    {
      title: "Guest List & RSVP Tracker",
      description: "Tasks for creating your guest list, sending invites, and managing responses."
    },
    {
      title: "Decor & Design Checklist",
      description: "Everything related to color schemes, table setups, flowers, and rentals."
    },
    {
      title: "Bridal Party Duties List",
      description: "A tailored set of tasks for bridesmaids, groomsmen, and other attendants."
    },
    {
      title: "Honeymoon Planning Checklist",
      description: "From booking flights to packing essentials."
    },
    {
      title: "Pre-Wedding Beauty & Wellness Plan",
      description: "Self-care, skincare, and fitness timelines."
    },
    {
      title: "Emergency Kit Prep List",
      description: "All the small items you'll want to have on hand for unexpected moments."
    }
  ];

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestionSelect = (suggestion: typeof suggestions[0]) => {
    setDescription(suggestion.description);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSuggestions && !(event.target as Element).closest('.suggestions-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#F8F6F4] border border-[#E0DBD7] rounded-lg p-6 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2">
        <label className="block text-xs font-medium text-[#332B42]">Describe the type of list you would like to create</label>
        <div className="relative suggestions-container">
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-[#A85C36] hover:text-[#8B4513] font-medium flex items-center gap-1"
          >
            Suggestions
            <svg className={`w-3 h-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showSuggestions && (
            <div className="absolute right-0 top-6 w-80 bg-white border border-[#E0DBD7] rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F8F6F4] border-b border-[#E0DBD7] last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-[#332B42] text-sm">{suggestion.title}</div>
                  <div className="text-xs text-[#6B7280] mt-1">{suggestion.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <textarea
        className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm mb-4 min-h-[80px]"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="e.g. Wedding planning checklist, Day of Checklist, Reception setup, etc."
        rows={4}
      />
      <div className="w-full flex justify-between items-center mb-4">
        {/* Credit Display */}
                 {credits && (
           <div className="text-xs text-gray-600">
             <div className="font-medium text-gray-700 mb-1">Will take 2 Credits</div>
             <div className="text-[10px] text-gray-500 flex items-center gap-2">
               <span>{credits.dailyCredits + credits.bonusCredits} Credits available</span>
               <span className="text-gray-400">•</span>
                                <button
                   onClick={() => window.open('/settings?tab=plan', '_blank', 'noopener,noreferrer')}
                   className="text-[#A85C36] hover:text-[#784528] underline transition-colors"
                 >
                   Get More Credits
                 </button>
             </div>
           </div>
         )}
        
        {/* Generate Button */}
        <button
          className="btn-gradient-purple flex items-center gap-2"
          onClick={handleGenerate}
          disabled={!description.trim() || isLoading || ragLoading}
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate with Paige (2 Credits)</span>
        </button>
      
      </div>
      {(isLoading || ragLoading) && showSlowGenerationBanner && (
        <div className="w-full my-4 -mx-6">
          <Banner
            message="Looks like this is taking a little longer than usual... Don't worry! Your list is being generated. Please don't refresh."
            type="warning"
          />
        </div>
      )}
      {(isLoading || ragLoading) && !aiListResult && (
        <div className="w-full mt-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <TodoItemSkeleton key={i} />
          ))}
        </div>
      )}
      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
      {aiListResult && (
        <form className="w-full flex flex-col space-y-6 mt-4" onSubmit={e => e.preventDefault()}>
          <div>
            <label className="block text-xs font-medium text-[#332B42] mb-1">List Name</label>
            <input
              className={`w-full border px-3 py-2 rounded-[5px] text-sm ${
                listNameError ? 'border-red-500' : 'border-[#AB9C95]'
              }`}
              value={aiListResult.name}
              onChange={e => {
                setAiListResult({ ...aiListResult, name: e.target.value });
                // Clear error when user starts typing
                if (listNameError) {
                  setListNameError(null);
                }
              }}
              onBlur={(e) => {
                // Check for duplicate name when user leaves the input
                if (e.target.value.trim()) {
                  checkListNameExists(e.target.value);
                }
              }}
              placeholder="Enter list name"
              required
            />
            {isCheckingName && (
              <div className="text-xs text-gray-500 mt-1">Checking name availability...</div>
            )}
            {listNameError && (
              <div className="text-xs text-red-500 mt-1">{listNameError}</div>
            )}
          </div>
          {/* Show warning banner if present in aiListResult */}
          {aiListResult && aiListResult.warning && aiListResult.warning.length > 0 && (
            <div className="w-full mb-4">
              <Banner message={<span className="flex items-center"><span className="mr-2">⚠️</span>{aiListResult.warning}</span>} type="warning" />
            </div>
          )}
          {(!weddingDate) && (
            <div className="w-full mb-4">
              <Banner
                message={<span className="flex items-center"><span className="mr-2">⚠️</span>Looks like you haven't set your wedding date yet. Paige bases the end date of non post-wedding to-do items around your wedding date. For best results, please provide your wedding date <a href="/settings" className="underline text-yellow-900 hover:text-yellow-700 font-semibold">here</a>.</span>}
                type="warning"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#332B42] mb-1">Initial To-Dos</label>
            <ToDoListEditor
              tasks={Array.isArray(aiListResult.tasks) ? aiListResult.tasks : []}
              setTasks={handleTasksUpdate}
              customCategoryValue={''}
              setCustomCategoryValue={() => {}}
              allCategories={allCategories}
            />
          </div>
        </form>
      )}
    </div>
  );
};

export default ToDoBuilderForm; 