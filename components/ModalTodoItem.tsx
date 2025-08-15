// components/ModalTodoItem.tsx
import React, { useState } from 'react';
import { Calendar, NotepadText } from 'lucide-react';
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import { DetectedTodo } from '../utils/messageAnalysisEngine';

interface ModalTodoItemProps {
  todo: DetectedTodo;
  index: number;
  allCategories: string[];
  onListSelection: (index: number, listId: string) => void;
  selectedListId: string;
  todoLists: Array<{ id: string; name: string }>;
  onCreateTodo: (todo: DetectedTodo, index: number) => void;
  isCreateEnabled: boolean;
  onToggleCreate: (index: number, enabled: boolean) => void;
}

export default function ModalTodoItem({
  todo,
  index,
  allCategories,
  onListSelection,
  selectedListId,
  todoLists,
  onCreateTodo,
  isCreateEnabled,
  onToggleCreate
}: ModalTodoItemProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(todo.name);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState(
    todo.deadline ? todo.deadline.toISOString().split('T')[0] : ''
  );
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteValue, setEditingNoteValue] = useState(todo.note || '');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryValue, setEditingCategoryValue] = useState(todo.category || '');
  const [editingCustomCategoryValue, setEditingCustomCategoryValue] = useState('');

  const handleNameEdit = () => {
    if (isEditingName) {
      // Update the todo name
      todo.name = editingNameValue;
    }
    setIsEditingName(!isEditingName);
  };

  const handleDeadlineEdit = () => {
    if (isEditingDeadline) {
      // Update the todo deadline
      todo.deadline = editingDeadlineValue ? new Date(editingDeadlineValue) : null;
    }
    setIsEditingDeadline(!isEditingDeadline);
  };

  const handleNoteEdit = () => {
    if (isEditingNote) {
      // Update the todo note
      todo.note = editingNoteValue;
    }
    setIsEditingNote(!isEditingNote);
  };

  const handleCategoryEdit = () => {
    if (isEditingCategory) {
      // Update the todo category
      todo.category = editingCategoryValue;
    }
    setIsEditingCategory(!isEditingCategory);
  };

  const handleCategoryDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setEditingCategoryValue(value);
    if (value !== 'Other') {
      setEditingCustomCategoryValue('');
    }
  };

  const handleCustomCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingCustomCategoryValue(e.target.value);
    if (editingCategoryValue === 'Other') {
      todo.category = e.target.value;
    }
  };

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[3px] p-4">
      {/* Task Name */}
      <div className="mb-2">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              className="flex-1 font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-2 py-1"
              placeholder="Task name"
              autoFocus
            />
            <button
              onClick={handleNameEdit}
              className="btn-primary text-xs px-2 py-1"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingNameValue(todo.name);
                setIsEditingName(false);
              }}
              className="btn-primaryinverse text-xs px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span 
              className="font-work text-xs font-medium text-[#332B42] flex-1 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
              onClick={handleNameEdit}
            >
              {todo.name}
            </span>
            
            {/* Toggle Switch for Create To-Do */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Create to-do</span>
              <input
                type="checkbox"
                checked={isCreateEnabled}
                onChange={(e) => onToggleCreate(index, e.target.checked)}
                className="form-checkbox rounded border-[#AB9C95] text-[#A85C36]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Deadline */}
      <div className="mb-2">
        {isEditingDeadline ? (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#364257]" />
            <input
              type="date"
              value={editingDeadlineValue}
              onChange={(e) => setEditingDeadlineValue(e.target.value)}
              className="flex-1 text-xs text-[#364257] border border-[#AB9C95] rounded-[3px] px-2 py-1"
            />
            <button
              onClick={handleDeadlineEdit}
              className="btn-primary text-xs px-2 py-1"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingDeadlineValue(todo.deadline ? todo.deadline.toISOString().split('T')[0] : '');
                setIsEditingDeadline(false);
              }}
              className="btn-primaryinverse text-xs px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
            onClick={handleDeadlineEdit}
          >
            <Calendar size={14} className="text-[#364257]" />
            <span className="text-xs text-[#364257]">
              {todo.deadline ? todo.deadline.toLocaleDateString() : '+ Add Deadline'}
            </span>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="mb-2">
        {isEditingNote ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editingNoteValue}
              onChange={(e) => setEditingNoteValue(e.target.value)}
              className="text-xs text-[#364257] border border-[#AB9C95] rounded-[3px] px-2 py-1 resize-none"
              placeholder="Add a note..."
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleNoteEdit}
                className="btn-primary text-xs px-2 py-1"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingNoteValue(todo.note || '');
                  setIsEditingNote(false);
                }}
                className="btn-primaryinverse text-xs px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
            onClick={handleNoteEdit}
          >
            <NotepadText size={14} className="text-[#364257] mt-0.5" />
            <span className="text-xs text-[#364257] flex-1">
              {todo.note || '+ Add Note'}
            </span>
          </div>
        )}
      </div>

      {/* Category and List Selection */}
      <div className="mb-2">
        {/* Category */}
        <div className="mb-2">
          {isEditingCategory ? (
            <div className="flex flex-col gap-2">
              <CategorySelectField
                userId=""
                value={editingCategoryValue}
                customCategoryValue={editingCustomCategoryValue}
                onChange={handleCategoryDropdownChange}
                onCustomCategoryChange={handleCustomCategoryInputChange}
                label=""
                placeholder="Select Category"
              />
              {editingCategoryValue === "Other" && (
                <input
                  type="text"
                  value={editingCustomCategoryValue}
                  onChange={handleCustomCategoryInputChange}
                  placeholder="Enter custom category"
                  className="text-xs text-[#364257] border border-[#AB9C95] rounded-[3px] px-2 py-1"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCategoryEdit}
                  className="btn-primary text-xs px-2 py-1"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingCategoryValue(todo.category || '');
                    setEditingCustomCategoryValue('');
                    setIsEditingCategory(false);
                  }}
                  className="btn-primaryinverse text-xs px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
              onClick={handleCategoryEdit}
            >
              {todo.category ? (
                <CategoryPill category={todo.category} />
              ) : (
                <span className="text-xs text-[#364257] underline">+ Add Category</span>
              )}
            </div>
          )}
        </div>

        {/* List Selection - positioned above deadline metadata as requested */}
        {todoLists && todoLists.length > 1 && (
          <div className="mb-2">
            <label className="text-xs font-medium text-[#332B42] block mb-1">Add to list:</label>
            <div className="relative w-[40%]">
              <select
                value={selectedListId}
                onChange={(e) => onListSelection(index, e.target.value)}
                className="w-full border pr-10 pl-4 py-2 text-xs rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
              >
                {todoLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              {/* Custom chevron icon */}
              <svg
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#332B42]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
