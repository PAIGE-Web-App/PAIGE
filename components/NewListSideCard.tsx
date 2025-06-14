import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, WandSparkles, Upload, PenTool, FileText, Sparkles } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';

interface NewListSideCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; tasks?: { name: string; note?: string; category?: string; deadline?: Date; endDate?: Date; }[] }) => void;
  initialName?: string;
  allCategories: string[];
  handleBuildWithAI: (template: string) => void;
  isGenerating: boolean;
}

function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const NewListSideCard: React.FC<NewListSideCardProps> = ({ isOpen, onClose, onSubmit, initialName = '', allCategories, handleBuildWithAI, isGenerating }) => {
  const [listName, setListName] = useState(initialName);
  const [tasks, setTasks] = useState<{
    name: string;
    note?: string;
    category?: string;
    deadline?: string;
    endDate?: string;
  }[]>([{ name: '', note: '', category: '', deadline: '', endDate: '' }]);
  const [customCategoryValue, setCustomCategoryValue] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('General Wedding Tasks');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setListName(initialName);
      setTasks([{ name: '', note: '', category: '', deadline: '', endDate: '' }]);
      setCustomCategoryValue('');
      setSelectedTemplate('General Wedding Tasks');
      setCsvFile(null);
      setIsManualEntry(true);
    }
  }, [isOpen, initialName]);

  const handleAddTask = () => {
    setTasks([...tasks, { name: '', note: '', category: '', deadline: '', endDate: '' }]);
  };

  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setTasks(tasks.map((task, i) =>
      i === index ? { ...task, [field]: value } : task
    ));
  };

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
    onSubmit({ name: listName.trim(), tasks: submitTasks });
    onClose();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Here you can add logic to parse the CSV file and set tasks
    }
  };

  // Fetch AI-powered suggestions from the API
  const fetchAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/generate-list-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setSuggestions([
        'Wedding Planning Checklist',
        'Day-Of Wedding Tasks',
        'Reception Setup List',
      ]);
    }
    setIsLoadingSuggestions(false);
    setHasFetchedSuggestions(true);
  };

  // Only fetch suggestions once, on first focus or mount
  const handleListNameFocus = () => {
    if (!hasFetchedSuggestions) {
      fetchAISuggestions();
    }
  };

  useEffect(() => {
    // Optionally, fetch on mount for instant suggestions
    // fetchAISuggestions();
  }, []);

  const handleListNameBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100); // allow click
  };

  const handleSuggestionClick = (suggestion: string) => {
    setListName(suggestion);
    setShowSuggestions(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-50 bg-white border-b border-[#E0DBD7] flex justify-between items-center mb-0 w-full p-4">
              <h2 className="text-h5 font-medium font-playfair text-[#332B42]">New List</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col space-y-4">
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6 overflow-y-auto pb-24">
                <div>
                  <label className="block text-xs font-medium text-[#332B42] mb-1">List Name</label>
                  <div className="relative">
                    <input
                      className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
                      value={listName}
                      onChange={e => setListName(e.target.value)}
                      placeholder="Enter list name"
                      required
                      autoFocus
                      onFocus={handleListNameFocus}
                    />
                  </div>
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
                            onClick={() => handleSuggestionClick(s)}
                            tabIndex={-1}
                          >
                            <Sparkles className="w-4 h-4 text-[#a85c36] mr-2" />
                            <span className="truncate">{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {listName.trim() && (
                  <>
                    <div className="flex space-x-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setIsManualEntry(true)}
                        className={`flex-1 py-2 px-4 rounded-[5px] text-sm font-medium ${
                          isManualEntry 
                            ? 'bg-[#a85c36] text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Manual Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualEntry(false)}
                        className={`flex-1 py-2 px-4 rounded-[5px] text-sm font-medium ${
                          !isManualEntry 
                            ? 'bg-[#a85c36] text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Import CSV
                      </button>
                    </div>
                    {isManualEntry ? (
                      <div>
                        <label className="block text-xs font-medium text-[#332B42] mb-1">Initial Tasks</label>
                        <div className="space-y-4">
                          {tasks.map((task, idx) => (
                            <div key={idx} className="border border-[#AB9C95] rounded-[5px] p-4 pb-4 mb-2">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-medium text-[#332B42]">{task.name.trim() ? task.name : `To-Do ${idx + 1}`}</h3>
                                {tasks.length > 1 && (
                                  <button type="button" onClick={() => handleRemoveTask(idx)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <FormField
                                  label="To-Do Name"
                                  name={`task-name-${idx}`}
                                  value={task.name}
                                  onChange={e => updateTask(idx, 'name', e.target.value)}
                                  placeholder="Enter to-do name"
                                />
                                <FormField
                                  label="Note"
                                  name={`task-note-${idx}`}
                                  value={task.note || ''}
                                  onChange={e => updateTask(idx, 'note', e.target.value)}
                                  placeholder="Add a note..."
                                />
                                <CategorySelectField
                                  userId={''}
                                  value={task.category || ''}
                                  customCategoryValue={customCategoryValue}
                                  onChange={e => updateTask(idx, 'category', e.target.value)}
                                  onCustomCategoryChange={e => setCustomCategoryValue(e.target.value)}
                                  label="Category"
                                  placeholder="Select a category"
                                />
                                <FormField
                                  label="Deadline"
                                  name={`task-deadline-${idx}`}
                                  type="datetime-local"
                                  value={task.deadline || ''}
                                  onChange={e => updateTask(idx, 'deadline', e.target.value)}
                                  placeholder="Select deadline"
                                />
                                <FormField
                                  label="End Date"
                                  name={`task-enddate-${idx}`}
                                  type="datetime-local"
                                  value={task.endDate || ''}
                                  onChange={e => updateTask(idx, 'endDate', e.target.value)}
                                  placeholder="Select end date"
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddTask}
                            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 mt-2"
                          >
                            + Add another task
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
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
                    )}
                    <div className="fixed bottom-0 right-0 w-96 bg-white p-4 border-t border-[#E0DBD7] flex justify-end gap-2 z-50">
                      <button type="button" onClick={onClose} className="btn-primaryinverse">Cancel</button>
                      <button type="submit" className="btn-primary" disabled={!listName.trim()}>Create List</button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewListSideCard; 