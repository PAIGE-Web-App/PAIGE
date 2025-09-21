import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Upload, Sparkles, Download, Info, CheckCircle, AlertCircle, X } from 'lucide-react';
import OnboardingModalBase from './OnboardingModalBase';
import { Trash2 } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
import ToDoFields from './ToDoFields';
import ToDoListEditor from './ToDoListEditor';
import { useAuth } from '../hooks/useAuth';
import { getAllCategories, saveCategoryIfNew } from '../lib/firebaseCategories';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Banner from './Banner';
import TodoItemSkeleton from './TodoItemSkeleton';
import UnsavedChangesModal from './UnsavedChangesModal';
import { useCredits } from '../contexts/CreditContext';
import CreditToast from './CreditToast';
import { useRouter } from 'next/navigation';
import NotEnoughCreditsModal from './NotEnoughCreditsModal';
import { useRAGTodoGeneration } from '../hooks/useRAGTodoGeneration';
import { COUPLE_SUBSCRIPTION_CREDITS } from '../types/credits';
import { parseTodoCSVFile, downloadTodoCSVTemplate, TodoCSVUploadResult } from '../utils/todoCsvUploadUtils';

interface NewListOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

const TABS = [
  {
    key: 'ai',
    label: 'Create with Paige',
    icon: <Sparkles className="w-5 h-5 mr-1" />,
    description: 'Describe what you need, and let PAIGE generate a smart to-do list with realistic deadlines based on your wedding date.'
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

const STEPS = [
  { id: 1, name: 'Select Type' },
  { id: 2, name: 'Create List' },
];

// At the top, add a counter fallback for environments without crypto.randomUUID
let tempIdCounter = 0;
function getStableId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `temp-id-${tempIdCounter++}`;
}

const NewListOnboardingModal: React.FC<NewListOnboardingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { credits, loadCredits } = useCredits();
  const router = useRouter();
  const { generateTodos, isLoading: ragLoading, error: ragError } = useRAGTodoGeneration();
  const [selectedTab, setSelectedTab] = useState<'manual' | 'import' | 'ai'>('ai');
  const [step, setStep] = useState(1);
  const [listName, setListName] = useState('');
  const [importListName, setImportListName] = useState('');
  const [tasks, setTasks] = useState([{ _id: getStableId(), name: 'New Task', note: '', category: '', deadline: undefined as string | undefined, endDate: undefined as string | undefined }]);
  const [manualTasks, setManualTasks] = useState([{ _id: getStableId(), name: 'New Task', note: '', category: '', deadline: undefined as string | undefined, endDate: undefined as string | undefined }]);
  const [customCategoryValue, setCustomCategoryValue] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [importedTodos, setImportedTodos] = useState<any[]>([]);
  const [aiListResult, setAiListResult] = React.useState<any>(null);
  const [allCategories, setAllCategories] = React.useState<string[]>([]);
  const [weddingDate, setWeddingDate] = React.useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [aiGenerationData, setAiGenerationData] = React.useState<any>(null);
  
  // Credit toast state
  const [showCreditToast, setShowCreditToast] = useState(false);
  const [creditToastData, setCreditToastData] = useState({ creditsSpent: 0, creditsRemaining: 0 });
  const [previousCredits, setPreviousCredits] = useState(0);
  
  // Not enough credits modal state
  const [showNotEnoughCreditsModal, setShowNotEnoughCreditsModal] = useState(false);
  const userCredits = COUPLE_SUBSCRIPTION_CREDITS.free; // For credit information
  
  // List name validation state
  const [listNameError, setListNameError] = React.useState<string | null>(null);

  // Create a simple contacts array for assignment functionality
  const contacts = React.useMemo(() => {
    if (!user?.uid) return [];
    // For now, just return the user as a contact option
    return [{
      id: user.uid,
      name: 'You',
      email: user.email || '',
      phone: '',
      category: 'User',
      website: null,
      avatarColor: '#A85C36',
      userId: user.uid,
      orderIndex: 0,
      isOfficial: false,
      placeId: null,
      vendorEmails: [],
      isVendorContact: false,
    }];
  }, [user]);

  // Create currentUser object for assignment functionality
  const currentUser = React.useMemo(() => {
    if (!user?.uid) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  }, [user]);

  // Handle assignment in list creation state
  const handleAssignTodo = async (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => {
    // In list creation state, we just update the local task state
    // The assignment will be saved when the list is submitted
    setTasks((currentTasks: any[]) => 
      currentTasks.map((task: any) => 
        task.id === todoId || task._id === todoId 
          ? { ...task, assignedTo: assigneeIds, assignedBy: user?.uid, assignedAt: new Date() }
          : task
      )
    );
    
    // Also update AI result tasks if they exist
    if (aiListResult?.tasks) {
      setAiListResult((current: any) => ({
        ...current,
        tasks: (current as any).tasks.map((task: any) => 
          task.id === todoId || task._id === todoId 
            ? { ...task, assignedTo: assigneeIds, assignedBy: user?.uid, assignedAt: new Date() }
            : task
        )
      }));
    }
  };

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

  // Handle AI generation from budget page
  React.useEffect(() => {
    const handleAiGeneration = (event: any) => {
      setAiGenerationData(event.detail);
      setSelectedTab('ai');
      setStep(2);
    };
    
    window.addEventListener('create-todo-list-from-ai', handleAiGeneration);
    
    // Check URL params for AI generation
    const urlParams = new URLSearchParams(window.location.search);
    const aiGenerate = urlParams.get('ai-generate');
    const description = urlParams.get('description');
    
    if (aiGenerate === 'true' && description) {
      setAiGenerationData({ description });
      setSelectedTab('ai');
      setStep(2);
    }
    
    return () => {
      window.removeEventListener('create-todo-list-from-ai', handleAiGeneration);
    };
  }, []);

  const handleContinue = () => setStep(2);
  const handleBack = () => setStep(1);
  const handleStepChange = (newStep: number) => setStep(newStep);

  const handleAddTask = () => {
    const newTask = { _id: getStableId(), name: 'New Task', note: '', category: '', deadline: undefined, endDate: undefined };
    setTasks([...tasks, newTask]);
  };
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

    }
    return updated;
  }));

  // Function to validate list name (for submission)
  const validateListName = (name: string) => {
    if (!name.trim()) {
      return false;
    }
    return true;
  };

  // Function to check if list name already exists
  const checkListNameExists = async (name: string) => {
    if (!name.trim()) {
      return true;
    }
    
    if (!user?.uid) {
      return false;
    }

    try {
      const res = await fetch('/api/check-list-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName: name.trim(), userId: user.uid }),
      });

      if (!res.ok) throw new Error('Failed to check list name');
      
      const data = await res.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking list name:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTab === 'ai') {
      const aiResult: any = aiListResult;
      if (!aiResult || !aiResult.name) return;

      // Validate list name is not empty
      if (!validateListName(aiResult.name)) {
        return; // Don't submit if list name is empty
      }

      // Check for duplicate name before submitting
      const nameExists = await checkListNameExists(aiResult.name);
      if (nameExists) {
        setListNameError('A list with this name already exists');
        return; // Don't submit if name already exists
      }
      
      // Clear any existing errors since validation passed
      setListNameError(null);

      // Check if form can be submitted (no validation errors)
      if (!canSubmit) {
        return; // Don't submit if there are validation errors
      }



      // Combine AI-generated tasks with manually added tasks
      // Deduplicate based on _id to prevent duplicates
      const aiTasks = Array.isArray(aiResult.tasks) ? aiResult.tasks : [];
      const localTasks = tasks || [];
      
      // Create a map of AI tasks by ID for quick lookup
      const aiTaskIds = new Set(aiTasks.map(t => t._id));
      
      // Only include local tasks that aren't already in AI tasks
      const uniqueLocalTasks = localTasks.filter(task => {
        const taskId = task._id;
        return !aiTaskIds.has(taskId);
      });
      
      const allTasks = [...aiTasks, ...uniqueLocalTasks];



      const tasksWithDates = allTasks.map((task: any) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : null,
        endDate: task.endDate ? new Date(task.endDate) : null,
      }));

      // Process tasks to remove [NEW] tags and save new categories
      // Only filter out completely empty tasks at the end
      const processedTasks = tasksWithDates.filter((task: any) => task._id && (task.name?.trim() || task.note?.trim() || task.category?.trim() || task.deadline || task.endDate));
      

      
      // Save new categories and remove [NEW] tags
      if (user?.uid) {
        processedTasks.forEach(async (task) => {
          if (task.category && task.category.includes('[NEW]')) {
            const newCategory = task.category.replace('[NEW]', '').trim();
            await saveCategoryIfNew(newCategory, user.uid);
            task.category = newCategory;
          }
        });
      }

      onSubmit && onSubmit({
        name: aiResult.name.trim(),
        tasks: processedTasks
      });
    } else if (selectedTab === 'manual') {
      if (!listName.trim()) return;
      
      // Check for duplicate name before submitting
      const nameExists = await checkListNameExists(listName);
      if (nameExists) {
        setListNameError('A list with this name already exists');
        return; // Don't submit if name already exists
      }
      
      // Clear any existing errors since validation passed
      setListNameError(null);
      
      const validTasks: any[] = manualTasks
        .filter((task: any) => task._id && (task.name?.trim() || task.note?.trim() || task.category?.trim() || task.deadline || task.endDate))
        .map(task => ({
          ...task,
          deadline: task.deadline ? new Date(task.deadline) : null,
          endDate: task.endDate ? new Date(task.endDate) : null,
        }));

      // Process tasks to remove [NEW] tags and save new categories
      if (user?.uid) {
        validTasks.forEach(async (task) => {
          if (task.category && task.category.trim()) {
            let categoryToSave = task.category;
            // Remove [NEW] tag if present
            if (task.category.includes('[NEW]')) {
              categoryToSave = task.category.replace('[NEW]', '').trim();
              task.category = categoryToSave;
            }
            // Save the category (whether it had [NEW] or not)
            await saveCategoryIfNew(categoryToSave, user.uid);
          }
        });
      }

      onSubmit && onSubmit({ name: listName.trim(), tasks: validTasks });
    } else if (selectedTab === 'import') {
      if (!importListName.trim()) return;
      
      // Check for duplicate name before submitting
      const nameExists = await checkListNameExists(importListName);
      if (nameExists) {
        setListNameError('A list with this name already exists');
        return; // Don't submit if name already exists
      }
      
      // Clear any existing errors since validation passed
      setListNameError(null);
      
      const validTasks: any[] = importedTodos
        .filter((task: any) => task._id && (task.name?.trim() || task.note?.trim() || task.category?.trim() || task.deadline || task.endDate))
        .map(task => ({
          ...task,
          deadline: task.deadline ? new Date(task.deadline) : null,
          endDate: task.endDate ? new Date(task.endDate) : null,
        }));

      // Process tasks to remove [NEW] tags and save new categories
      if (user?.uid) {
        validTasks.forEach(async (task) => {
          if (task.category && task.category.trim()) {
            let categoryToSave = task.category;
            // Remove [NEW] tag if present
            if (task.category.includes('[NEW]')) {
              categoryToSave = task.category.replace('[NEW]', '').trim();
              task.category = categoryToSave;
            }
            // Save the category (whether it had [NEW] or not)
            await saveCategoryIfNew(categoryToSave, user.uid);
          }
        });
      }

      onSubmit && onSubmit({ name: importListName.trim(), tasks: validTasks });
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

  // Helper: check if there is unsaved data
  const hasUnsavedData = () => {
    if (listName.trim()) return true;
    if (importListName.trim()) return true;
    if (selectedTab === 'manual' && manualTasks.some(t => t.name.trim() || t.note.trim() || t.category.trim() || t.deadline || t.endDate)) return true;
    const aiResult: any = aiListResult;
    if (selectedTab === 'ai' && aiResult && (aiResult.name?.trim() || (Array.isArray(aiResult.tasks) && aiResult.tasks.some((t: any) => t.name?.trim())) || tasks.some(t => t.name.trim() || t.note.trim() || t.category.trim() || t.deadline || t.endDate))) return true;
    if (selectedTab === 'import' && importedTodos.length > 0) return true;
    return false;
  };

  // Reset all state to initial
  const resetState = () => {
    setSelectedTab('ai');
    setStep(1);
    setListName('');
    setImportListName('');
    setTasks([{ _id: getStableId(), name: 'New Task', note: '', category: '', deadline: undefined as string | undefined, endDate: undefined as string | undefined }]);
    setManualTasks([{ _id: getStableId(), name: 'New Task', note: '', category: '', deadline: undefined as string | undefined, endDate: undefined as string | undefined }]);
    setCustomCategoryValue('');
    setCanSubmit(false);
    setAiListResult(null);
    setImportedTodos([]);
  };

  // Intercept close
  const handleAttemptClose = () => {
    if (hasUnsavedData()) {
      setShowUnsavedModal(true);
    } else {
      resetState();
      onClose();
    }
  };

  // Confirm leave (lose data)
  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    resetState();
    onClose();
  };

  // Cancel leave (stay in modal)
  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
  };

  // Always reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  // Monitor credits for toast notifications
  React.useEffect(() => {
    if (credits) {
      const currentTotal = (credits.dailyCredits || 0) + (credits.bonusCredits || 0);
      
       // Check if credits decreased (indicating usage) and we have a valid previous value
       // Disabled to prevent duplicate notifications - handled by VerticalNavCreditDisplay
       // if (previousCredits > 0 && currentTotal > 0 && currentTotal < previousCredits) {
       //   const creditsSpent = previousCredits - currentTotal;
       //   setCreditToastData({ creditsSpent, creditsRemaining: currentTotal });
       //   setShowCreditToast(true);
       // }
      
      // Always update previous credits when we get new data
      setPreviousCredits(currentTotal);
    }
  }, [credits]);

  // Credit updates are now handled centrally in CreditProvider
  // No need for individual event listeners

  return (
    <>
      <OnboardingModalBase
        isOpen={isOpen}
        onClose={handleAttemptClose}
        steps={STEPS}
        currentStep={step}
        onStepChange={handleStepChange}
          sidebarTitle={step === 1 ? "Todo Create Wizard" : "Build your List"}
        footer={
          step === 1 ? (
            <button
              onClick={handleContinue}
              className="btn-primary"
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="btn-primaryinverse"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={selectedTab === 'ai' ? (!aiListResult || !canSubmit) : selectedTab === 'import' ? !importListName.trim() : !listName.trim()}
              >
                Submit
              </button>
            </div>
          )
        }
      >
        {step === 1 && (
          <div className="w-full h-full flex flex-col items-center relative pt-20 pb-32 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-8 mt-2 text-center">How do you want to build your list?</h2>
            <div className="flex flex-col md:flex-row gap-6 mt-2 w-full max-w-5xl justify-center items-start">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as 'manual' | 'import' | 'ai')}
                  className={`relative flex flex-col items-center border border-[#E0DBD7] rounded-xl px-8 py-6 w-full max-w-sm shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#a85c36] bg-white min-h-[200px] ${selectedTab === tab.key ? 'ring-2 ring-[#a85c36] border-[#a85c36]' : ''}`}
                >
                  {tab.key === 'ai' && (
                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#7C5CBF] text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-lg z-10" style={{letterSpacing: '0.03em'}}>RECOMMENDED</span>
                  )}
                  {tab.icon}
                  <span className="text-sm ml-1">{tab.label}</span>
                  <span className="text-sm text-[#8A8A8A] text-center mt-1">{tab.description}</span>
                  {tab.key === 'ai' && credits && (
                    <div className="text-xs text-gray-600 mt-2">
                      <div className="font-medium text-gray-700 mb-1">Will take 2 Credits</div>
                      <div className="text-[10px] text-gray-500">
                        {credits.dailyCredits + credits.bonusCredits} Credits available
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Tabs always visible */}
            <div className="flex gap-2 mb-4">
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
            <div className="w-full flex-1 flex items-start justify-center max-h-[75vh] overflow-y-auto pb-4">
              {selectedTab === 'manual' && (
                <ManualListCreationForm
                  allCategories={allCategories}
                  onSubmit={handleSubmit}
                  listName={listName}
                  setListName={setListName}
                  canSubmit={canSubmit}
                  tasks={manualTasks}
                  setTasks={setManualTasks}
                  customCategoryValue={customCategoryValue}
                  setCustomCategoryValue={setCustomCategoryValue}
                  contacts={contacts}
                  currentUser={currentUser}
                  onAssign={handleAssignTodo}
                />
              )}
              {selectedTab === 'import' && (
                <div className="w-full max-w-3xl mx-auto flex flex-col space-y-6">
                  <ImportListCreationForm 
                    onImportComplete={(importedListName, importedTodos) => {
                      setImportListName(importedListName);
                      setCanSubmit(true);
                    }}
                    importedTodos={importedTodos}
                    setImportedTodos={setImportedTodos}
                    allCategories={allCategories}
                    customCategoryValue={customCategoryValue}
                    setCustomCategoryValue={setCustomCategoryValue}
                    contacts={contacts}
                    currentUser={currentUser}
                    onAssign={handleAssignTodo}
                  />
                </div>
              )}
              {selectedTab === 'ai' && (
                <AIListCreationForm
                  isGenerating={false}
                  handleBuildWithAI={handleBuildWithAI}
                  setAiListResult={setAiListResult}
                  aiListResult={aiListResult}
                  allCategories={allCategories}
                  weddingDate={weddingDate}
                  aiGenerationData={aiGenerationData}
                  contacts={contacts}
                  currentUser={currentUser}
                  onAssign={handleAssignTodo}
                  listNameError={listNameError}
                  setListNameError={setListNameError}
                  tasks={tasks}
                  setTasks={setTasks}
                  user={user}
                  credits={credits}
                  loadCredits={loadCredits}
                  router={router}
                  onValidationChange={(hasError: boolean) => {
                    // Update the parent component's validation state
                    setCanSubmit(!hasError);
                  }}
                  showNotEnoughCreditsModal={showNotEnoughCreditsModal}
                  setShowNotEnoughCreditsModal={setShowNotEnoughCreditsModal}
                  userCredits={userCredits}
                />
              )}
            </div>
          </div>
        )}
      </OnboardingModalBase>
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        title="Are you sure?"
        message="You have unsaved changes. If you leave, you will lose all of your list data."
      />
      
      {/* Credit Toast */}
      <CreditToast
        isVisible={showCreditToast}
        creditsSpent={creditToastData.creditsSpent}
        creditsRemaining={creditToastData.creditsRemaining}
        onClose={() => setShowCreditToast(false)}
      />
    </>
  );
};

function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const ManualListCreationForm = ({ allCategories = [], onSubmit, listName = '', setListName, canSubmit = false, tasks = [], setTasks, customCategoryValue = '', setCustomCategoryValue, contacts = [], currentUser = null, onAssign }: { allCategories?: string[], onSubmit?: any, listName?: string, setListName?: any, canSubmit?: boolean, tasks?: any[], setTasks?: any, customCategoryValue?: string, setCustomCategoryValue?: any, contacts?: any[], currentUser?: any, onAssign?: (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => Promise<void> }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);

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
          className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
          value={listName}
          onChange={e => { setListName(e.target.value); setShowSuggestions(true); }}
          placeholder="Enter list name"
          required
          onFocus={handleListNameFocus}
        />
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
            setTasks={setTasks}
            customCategoryValue={customCategoryValue}
            setCustomCategoryValue={setCustomCategoryValue}
            allCategories={allCategories}
            contacts={contacts}
            currentUser={currentUser}
            onAssign={onAssign}
          />
        </div>
      )}
    </form>
  );
};

const ImportListCreationForm = React.memo(({ 
  onImportComplete, 
  importedTodos, 
  setImportedTodos, 
  allCategories, 
  customCategoryValue, 
  setCustomCategoryValue, 
  contacts, 
  currentUser, 
  onAssign 
}: { 
  onImportComplete?: (listName: string, todos: any[]) => void, 
  importedTodos: any[], 
  setImportedTodos: (todos: any[]) => void,
  allCategories: string[],
  customCategoryValue: string,
  setCustomCategoryValue: (value: string) => void,
  contacts: any[],
  currentUser: any,
  onAssign: (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => Promise<void>
}) => {
  console.log('ImportListCreationForm props:', { importedTodos: importedTodos.length });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TodoCSVUploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [listName, setListName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to convert MM-DD-YYYY HH:mm format to Date
  const convertToDate = (dateString: string): Date => {
    const parts = dateString.split(' ');
    const datePart = parts[0];
    const timePart = parts[1];
    const [month, day, year] = datePart.split('-');
    
    // Create date in YYYY-MM-DD format for Date constructor
    const isoDateString = `${year}-${month}-${day} ${timePart}`;
    return new Date(isoDateString);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check for supported file types
    const supportedTypes = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!supportedTypes.includes(fileExtension)) {
      alert('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setCsvFile(file);

    try {
      const result = await parseTodoCSVFile(file);
      setUploadResult(result);
      
      if (result.success) {
        // Convert to the format expected by the parent component
        const formattedTodos = result.todos.map(todo => ({
          _id: `temp-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: todo.name,
          note: todo.note || '',
          category: todo.category || '',
          deadline: todo.deadline ? convertToDate(todo.deadline) : undefined,
          endDate: todo.endDate ? convertToDate(todo.endDate) : undefined
        }));
        setImportedTodos(formattedTodos);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        todos: [],
        errors: ['Failed to process file'],
        warnings: [],
        totalRows: 0,
        processedRows: 0
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTodoCSVTemplate();
  };

  const handleReset = () => {
    setCsvFile(null);
    setUploadResult(null);
    setImportedTodos([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-update when todos are imported or list name changes
  useEffect(() => {
    if (importedTodos.length > 0 && onImportComplete) {
      onImportComplete(listName, importedTodos);
    }
  }, [importedTodos, listName, onImportComplete]);

  // Clear upload result when component unmounts (switching tabs)
  useEffect(() => {
    return () => {
      setUploadResult(null);
    };
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {!uploadResult ? (
        <>
          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h6 className="h6 text-blue-900 mb-2">Get Started with a Template</h6>
            <p className="text-sm text-blue-700 mb-2">
              Download our CSV template with 10 example to-do items to see the required format and add your todo items.
            </p>
                <p className="text-xs text-blue-600 mb-3">
                  <strong>Tip:</strong> Keep the default column names unchanged for best results.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="btn-primaryinverse text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-[#A85C36] bg-[#F8F6F4]' : 'border-[#AB9C95]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 text-[#AB9C95] mx-auto mb-4" />
            <h4 className="text-lg font-medium text-[#332B42] mb-2">Upload Your File</h4>
            <p className="text-sm text-[#AB9C95] mb-2">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-[#AB9C95] mb-2">
              Supports CSV, XLS, and XLSX files
            </p>
            <p className="text-xs text-[#A85C36] mb-4 font-medium">
              Required columns: To-do Name
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-sm"
                disabled={isUploading}
              >
                {isUploading ? 'Processing...' : 'Choose File'}
              </button>
            </div>
          </div>

          {/* File Requirements */}
          <div className="text-xs text-gray-500">
            <p className="font-medium mb-2">CSV should have the following columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>To-do Name</strong> (required)</li>
              <li><strong>Note</strong> (optional)</li>
              <li><strong>Category</strong> (optional)</li>
              <li><strong>Deadline</strong> (optional, format: MM-DD-YYYY HH:mm)</li>
              <li><strong>End Date</strong> (optional, format: MM-DD-YYYY HH:mm)</li>
            </ul>
          </div>
        </>
      ) : (
        /* Upload Results */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-[#332B42]">Upload Results</h4>
            <button
              onClick={handleReset}
              className="text-sm text-[#A85C36] hover:text-[#784528]"
            >
              Upload Another File
            </button>
          </div>

          {uploadResult.success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h6 className="h6 text-green-900 mb-2">Upload Successful!</h6>
                    <p className="text-sm text-green-700">
                      Successfully imported {uploadResult.processedRows} of {uploadResult.totalRows} to-do items.
                    </p>
                    {uploadResult.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600 font-medium">Warnings:</p>
                        <ul className="text-xs text-green-600 list-disc list-inside">
                          {uploadResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h6 className="h6 text-red-900 mb-2">Upload Failed</h6>
                  <p className="text-sm text-red-700 mb-2">
                    {uploadResult.errors.length > 0 ? uploadResult.errors[0] : 'Unknown error occurred'}
                  </p>
                  {uploadResult.errors.length > 1 && (
                    <ul className="text-xs text-red-600 list-disc list-inside">
                      {uploadResult.errors.slice(1).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show list name input and todo editor when todos are imported */}
      {importedTodos.length > 0 && (
        <div className="w-full max-w-3xl mx-auto flex flex-col space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#332B42] mb-1">List Name</label>
            <input
              className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#332B42] mb-1">Initial To-Dos</label>
            <ToDoListEditor
              tasks={importedTodos}
              setTasks={setImportedTodos}
              customCategoryValue={customCategoryValue}
              setCustomCategoryValue={setCustomCategoryValue}
              allCategories={allCategories}
              contacts={contacts}
              currentUser={currentUser}
              onAssign={onAssign}
            />
          </div>
        </div>
      )}
    </div>
  );
});

const AIListCreationForm = ({ isGenerating, handleBuildWithAI, setAiListResult, aiListResult, allCategories, weddingDate, aiGenerationData, contacts = [], currentUser = null, onAssign, tasks = [], setTasks, user, credits, loadCredits, router, onValidationChange, showNotEnoughCreditsModal, setShowNotEnoughCreditsModal, userCredits, listNameError, setListNameError }: { isGenerating: boolean, handleBuildWithAI: (template: string) => void, setAiListResult: (result: any) => void, aiListResult: any, allCategories: string[], weddingDate: string | null, aiGenerationData?: any, contacts?: any[], currentUser?: any, onAssign?: (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => Promise<void>, tasks?: any[], setTasks?: any, user?: any, credits?: any, loadCredits: () => Promise<void>, router?: any, onValidationChange?: (hasError: boolean) => void, showNotEnoughCreditsModal: boolean, setShowNotEnoughCreditsModal: (show: boolean) => void, userCredits: any, listNameError: string | null, setListNameError: (error: string | null) => void }) => {
  const [description, setDescription] = React.useState(aiGenerationData?.description || '');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { generateTodos, isLoading: ragLoading, error: ragError } = useRAGTodoGeneration();
  const [showSlowGenerationBanner, setShowSlowGenerationBanner] = React.useState(false);
  const slowGenerationTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [isCheckingName, setIsCheckingName] = React.useState(false);
  const [useProgressiveGeneration, setUseProgressiveGeneration] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [loadingStage, setLoadingStage] = React.useState('idle');

  // Auto-generate if description is pre-filled from budget page
  React.useEffect(() => {
    if (aiGenerationData?.description && !aiListResult && !isLoading && !ragLoading) {
      handleGenerate();
    }
  }, [aiGenerationData]);

  // Notify parent component of validation state changes
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(!!listNameError);
    }
  }, [listNameError, onValidationChange]);

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

  // Loading message helpers
  function getLoadingMessage() {
    switch (loadingStage) {
      case 'analyzing':
        return 'Analyzing your wedding requirements...\nPlease don\'t refresh';
      case 'priority':
        return 'Generating high-priority todos (venue, catering, photography)...\nPlease don\'t refresh';
      case 'secondary':
        return 'Adding remaining todos (decorations, transportation, stationery)...\nPlease don\'t refresh';
      case 'finalizing':
        return 'Finalizing your personalized checklist...\nPlease don\'t refresh';
      default:
        return 'Preparing your wedding planning checklist...\nPlease don\'t refresh';
    }
  }

  function getLoadingSubtext() {
    switch (loadingStage) {
      case 'analyzing':
        return 'Understanding your wedding vision and requirements';
      case 'priority':
        return 'Creating essential tasks for venue, catering, and photography';
      case 'secondary':
        return 'Adding decorations, transportation, and final details';
      case 'finalizing':
        return 'Organizing tasks and setting optimal deadlines';
      default:
        return 'Creating your personalized wedding planning checklist';
    }
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

  // Function to check if list name already exists (for real-time validation)
  const checkListNameExistsRealtime = async (name: string) => {
    if (!name.trim()) {
      setListNameError('List name is required');
      return true;
    }
    
    if (!user?.uid) {
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

  // Function to validate list name (for submission)
  const validateListName = (name: string) => {
    if (!name.trim()) {
      setListNameError('List name is required');
      return false;
    }
    return true;
  };

  const handleTasksUpdate = React.useCallback((updatedTasksOrFn: any[] | ((prev: any[]) => any[])) => {
    setAiListResult((prev: any) => {
      const prevTasks = Array.isArray(prev?.tasks) ? prev.tasks : [];
      const updated = typeof updatedTasksOrFn === 'function' ? updatedTasksOrFn(prevTasks) : updatedTasksOrFn;
      // Normalize dates to string format for input and assign ids
      const normalized = updated.map((t: any) => {
        const id = t.id || t._id || getStableId();
        // Preserve undefined deadlines for new tasks, only format existing dates
        let deadline = t.deadline;
        if (deadline && deadline !== undefined) {
          deadline = formatDateForInputWithTime(deadline);
          // Only apply "today at 5 PM" logic for existing dates that are before today
          if (isBeforeToday(deadline)) {
            deadline = formatDateForInputWithTime(getTodayAtFivePM());
          }
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

      return {
        ...prev,
        tasks: normalized
      };
    });
  }, [setAiListResult]);

  const handleGenerate = async () => {
    // Check if user is available
    if (!user?.uid) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAiListResult(null);
    setShowSlowGenerationBanner(false);
    setLoadingProgress(0);
    setLoadingStage('idle');

    if (slowGenerationTimer.current) {
      clearTimeout(slowGenerationTimer.current);
    }

    slowGenerationTimer.current = setTimeout(() => {
      setShowSlowGenerationBanner(true);
    }, 5000);

    // Simple progress simulation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          setLoadingStage('finalizing');
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    // Clean up interval when component unmounts or generation completes
    const cleanup = () => clearInterval(progressInterval);

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
        // Also update the local tasks state with the AI-generated tasks
        if (setTasks && Array.isArray(transformedData.tasks)) {
          setTasks(transformedData.tasks);
        }
        
        // Complete the loading progress
        setLoadingProgress(100);
        setLoadingStage('complete');
        
        // Trigger credit refresh for useCredits hook
        // Credit refresh is now handled centrally in CreditProvider
        // No need for manual event emission
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (e: any) {
      console.log('Error caught in outer catch block:', e.message); // Debug log
      
      // Check if it's a credit-related error
      if (e.message && (e.message.includes('Insufficient credits') || e.message.includes('Not enough credits'))) {
        console.log('Setting showNotEnoughCreditsModal to true'); // Debug log
        setShowNotEnoughCreditsModal(true);
      } else {
        console.log('Setting generic error:', e.message); // Debug log
        setError(e.message || 'Something went wrong');
      }
    } finally {
      cleanup(); // Clear progress interval
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

  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const handleSuggestionSelect = (suggestion: typeof suggestions[0]) => {
    setDescription(`${suggestion.title}: ${suggestion.description}`);
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
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
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
          style={{ cursor: (!description.trim() || isLoading || ragLoading) ? 'not-allowed' : 'pointer' }}
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
        <div className="w-full mt-4 space-y-4">
          {/* Progressive Loading States */}
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 bg-purple-500 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>

            {/* Progress Message */}
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">
                {getLoadingMessage()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getLoadingSubtext()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {loadingProgress}% complete
              </p>
            </div>

            {/* Stage Indicators */}
            <div className="flex justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${loadingStage === 'analyzing' ? 'text-blue-600' : loadingStage === 'priority' || loadingStage === 'secondary' || loadingStage === 'finalizing' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStage === 'analyzing' ? 'bg-blue-500 animate-pulse' : loadingStage === 'priority' || loadingStage === 'secondary' || loadingStage === 'finalizing' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Analyzing</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${loadingStage === 'priority' ? 'text-blue-600' : loadingStage === 'secondary' || loadingStage === 'finalizing' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStage === 'priority' ? 'bg-blue-500 animate-pulse' : loadingStage === 'secondary' || loadingStage === 'finalizing' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Priority</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${loadingStage === 'secondary' ? 'text-blue-600' : loadingStage === 'finalizing' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStage === 'secondary' ? 'bg-blue-500 animate-pulse' : loadingStage === 'finalizing' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Secondary</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${loadingStage === 'finalizing' ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStage === 'finalizing' ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-medium">Complete</span>
              </div>
            </div>
          </div>
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
              value={aiListResult.name || ''}
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
                  checkListNameExistsRealtime(e.target.value);
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
            <label className="block text-xs font-medium text-[#332B42] mb-1">To-Dos</label>
            <ToDoListEditor
              tasks={tasks}
              setTasks={setTasks}
              customCategoryValue={''}
              setCustomCategoryValue={() => {}}
              allCategories={allCategories}
              contacts={contacts}
              currentUser={currentUser}
              onAssign={onAssign}
            />
          </div>
          
        </form>
      )}
      
      {/* Not Enough Credits Modal */}
      <NotEnoughCreditsModal
        isOpen={showNotEnoughCreditsModal}
        onClose={() => setShowNotEnoughCreditsModal(false)}
        requiredCredits={2}
        currentCredits={credits ? (credits.dailyCredits + credits.bonusCredits) : 0}
        feature="list generation"
        accountInfo={{
          tier: 'Free',
          dailyCredits: userCredits.monthlyCredits,
          refreshTime: 'Daily at midnight'
        }}
      />

    </div>
  );
};

// Helper to format a Date or string to YYYY-MM-DDTHH:mm
function normalizeDateString(val: any) {
  if (!val) return '';
  if (typeof val === 'string') {
    // If already in correct format, return as is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 16);
  }
  return '';
}

export default NewListOnboardingModal; 