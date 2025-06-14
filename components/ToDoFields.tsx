import React from 'react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
import { Trash2 } from 'lucide-react';

interface ToDoFieldsProps {
  idx: number;
  task: { name: string; note?: string; category?: string; deadline?: string; endDate?: string };
  setTask: (field: string, value: string) => void;
  onRemove?: () => void;
  customCategoryValue: string;
  setCustomCategoryValue: (val: string) => void;
  allCategories: string[];
}

const ToDoFields: React.FC<ToDoFieldsProps> = ({ idx, task, setTask, onRemove, customCategoryValue, setCustomCategoryValue, allCategories }) => (
  <div className="border border-[#AB9C95] rounded-[5px] p-4 pb-4 mb-2">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium text-[#332B42]">{task.name.trim() ? task.name : `To-Do ${idx + 1}`}</h3>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
    <div className="flex-1 space-y-2">
      <FormField
        label="To-Do Name"
        name={`task-name-${idx}`}
        value={task.name}
        onChange={e => setTask('name', e.target.value)}
        placeholder="Enter to-do name"
      />
      <FormField
        label="Note"
        name={`task-note-${idx}`}
        value={task.note || ''}
        onChange={e => setTask('note', e.target.value)}
        placeholder="Add a note..."
      />
      <CategorySelectField
        userId={''}
        value={task.category || ''}
        customCategoryValue={customCategoryValue}
        onChange={e => setTask('category', e.target.value)}
        onCustomCategoryChange={e => setCustomCategoryValue(e.target.value)}
        label="Category"
        placeholder="Select a category"
      />
      <FormField
        label="Deadline"
        name={`task-deadline-${idx}`}
        type="datetime-local"
        value={task.deadline || ''}
        onChange={e => setTask('deadline', e.target.value)}
        placeholder="Select deadline"
      />
      <FormField
        label="End Date"
        name={`task-enddate-${idx}`}
        type="datetime-local"
        value={task.endDate || ''}
        onChange={e => setTask('endDate', e.target.value)}
        placeholder="Select end date"
      />
    </div>
  </div>
);

export default ToDoFields; 