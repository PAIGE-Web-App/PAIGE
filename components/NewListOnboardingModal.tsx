import React, { useState } from 'react';
import { PenTool, Upload, Sparkles } from 'lucide-react';
import OnboardingModalBase from './OnboardingModalBase';
import { Trash2 } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
import ToDoFields from './ToDoFields';
import ToDoListEditor from './ToDoListEditor';

interface NewListOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

const TABS = [
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
  {
    key: 'ai',
    label: 'Create with AI',
    icon: <Sparkles className="w-5 h-5 mr-1" />,
    description: 'Describe what you need, and let PAIGE generate a smart to-do list for you in seconds.'
  },
];

const STEPS = [
  { id: 1, name: 'Select Type' },
  { id: 2, name: 'Create List' },
];

const NewListOnboardingModal: React.FC<NewListOnboardingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedTab, setSelectedTab] = useState<'manual' | 'import' | 'ai'>('manual');
  const [step, setStep] = useState(1);
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState([{ name: '', note: '', category: '', deadline: '', endDate: '' }]);
  const [customCategoryValue, setCustomCategoryValue] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);

  const handleContinue = () => setStep(2);
  const handleBack = () => setStep(1);
  const handleStepChange = (newStep: number) => setStep(newStep);

  const handleAddTask = () => setTasks([...tasks, { name: '', note: '', category: '', deadline: '', endDate: '' }]);
  const handleRemoveTask = (idx: number) => setTasks(tasks.filter((_, i) => i !== idx));
  const updateTask = (index: number, field: string, value: string) => setTasks(tasks.map((task, i) => i === index ? { ...task, [field]: value } : task));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;
    const validTasks = tasks.filter(task => task.name && task.name.trim());
    const submitTasks = validTasks.map(task => ({
      name: task.name.trim(),
      ...(task.note?.trim() ? { note: task.note.trim() } : {}),
      ...(task.category ? { category: task.category } : {}),
      ...(task.deadline ? { deadline: parseLocalDateTime(task.deadline) } : {}),
      ...(task.endDate ? { endDate: parseLocalDateTime(task.endDate) } : {}),
    }));
    onSubmit && onSubmit({ name: listName.trim(), tasks: submitTasks });
  };

  return (
    <OnboardingModalBase
      isOpen={isOpen}
      onClose={onClose}
      steps={STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      sidebarTitle={step === 1 ? "Select Type" : "Build your List"}
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
              disabled={!listName.trim()}
            >
              Submit
            </button>
          </div>
        )
      }
    >
      {step === 1 && (
        <div className="w-full h-full flex flex-col items-center relative pt-20">
          <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-8 mt-2 text-center">How do you want to build your list?</h2>
          <div className="flex flex-col md:flex-row gap-6 mt-2 w-full max-w-5xl justify-center items-start">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as 'manual' | 'import' | 'ai')}
                className={`relative flex flex-col items-center bg-[#F8F6F4] hover:bg-[#F3F2F0] border border-[#E0DBD7] rounded-xl px-12 py-8 w-full max-w-sm shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#a85c36] ${selectedTab === tab.key ? 'ring-2 ring-[#a85c36] border-[#a85c36]' : ''}`}
              >
                {tab.key === 'ai' && (
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#7C5CBF] text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-lg z-10" style={{letterSpacing: '0.03em'}}>RECOMMENDED</span>
                )}
                {tab.icon}
                <span className="text-sm ml-1">{tab.label}</span>
                <span className="text-sm text-[#8A8A8A] text-center mt-1">{tab.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="w-full h-full flex flex-col items-center justify-center">
          {/* Tabs at the top of content area */}
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
          {/* Fixed height content area for tab content */}
          <div className="w-full flex-1 flex items-start justify-center min-h-[600px]">
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
              <AIListCreationForm isGenerating={false} handleBuildWithAI={() => {}} />
            )}
          </div>
        </div>
      )}
    </OnboardingModalBase>
  );
};

function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const ManualListCreationForm = ({ allCategories = [], onSubmit, listName, setListName, canSubmit, tasks, setTasks, customCategoryValue, setCustomCategoryValue }) => {
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

const AIListCreationForm = ({ isGenerating, handleBuildWithAI }: { isGenerating: boolean, handleBuildWithAI: (template: string) => void }) => {
  // Placeholder for AI-powered UI
  return (
    <div className="w-full max-w-3xl mx-auto bg-[#F8F6F4] border border-[#E0DBD7] rounded-lg p-6 text-center text-[#AB9C95]">
      AI-powered list creation UI goes here.
    </div>
  );
};

export default NewListOnboardingModal; 