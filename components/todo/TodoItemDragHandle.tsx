import React, { useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { TodoItem } from '@/types/todo';

interface TodoItemDragHandleProps {
  todo: TodoItem;
  sortOption: 'myOrder' | 'date' | 'title' | 'date-desc' | 'title-desc';
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  dropIndicatorPosition: { id: string | null; position: 'top' | 'bottom' | null };
  onDragStart: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  disabled?: boolean;
}

const TodoItemDragHandle: React.FC<TodoItemDragHandleProps> = ({
  todo,
  sortOption,
  draggedTodoId,
  dragOverTodoId,
  dropIndicatorPosition,
  onDragStart,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDragEnd,
  onDrop,
  disabled = false
}) => {
  const isDraggable = sortOption === 'myOrder' && !disabled;
  const isDragging = draggedTodoId === todo.id;
  const isDragOver = dragOverTodoId === todo.id;
  const showDropIndicator = dropIndicatorPosition.id === todo.id;

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDragStart(e, todo.id);
    }
  }, [isDraggable, onDragStart, todo.id]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDragEnter(e, todo.id);
    }
  }, [isDraggable, onDragEnter, todo.id]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDragLeave(e);
    }
  }, [isDraggable, onDragLeave]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDragOver(e, todo.id);
    }
  }, [isDraggable, onDragOver, todo.id]);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDragEnd(e);
    }
  }, [isDraggable, onDragEnd]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isDraggable) {
      onDrop(e);
    }
  }, [isDraggable, onDrop]);

  if (!isDraggable) {
    return null;
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      className={`flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOver ? 'bg-[#EBE3DD]' : ''}`}
    >
      <GripVertical 
        size={16} 
        className="text-[#AB9C95] hover:text-[#332B42] transition-colors" 
      />
      
      {/* Drop indicator */}
      {showDropIndicator && (
        <div
          className={`absolute w-full h-0.5 bg-[#A85C36] ${
            dropIndicatorPosition.position === 'top' ? 'top-0' : 'bottom-0'
          }`}
        />
      )}
    </div>
  );
};

export default TodoItemDragHandle; 