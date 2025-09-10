import { useState } from 'react';
import NewListSideCard from './NewListSideCard';
import { useRAGTodoGeneration } from '../hooks/useRAGTodoGeneration';

const Sidebar = () => {
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const categories = ['Wedding', 'Honeymoon', 'Reception', 'Ceremony']; // Example categories
  const { generateTodos } = useRAGTodoGeneration();

  const handleAddList = (data: { name: string; tasks?: { name: string; note?: string; category?: string; deadline?: Date; endDate?: Date; }[] }) => {
    // Logic to add the new list to your state or database
    console.log('Adding new list:', data.name, data.tasks);
  };

  const handleBuildWithAI = async (template: string) => {
    setIsGenerating(true);
    try {
      console.log('Calling RAG system with template:', template);
      // Use RAG system for todo generation
      const ragResponse = await generateTodos({
        description: template,
        weddingDate: '2023-12-31',
        todoType: 'comprehensive',
        focusCategories: [],
        existingTodos: [],
        vendorData: []
      });

      if (ragResponse.success && ragResponse.todos) {
        console.log('Response from RAG system:', ragResponse.todos);
        setListName(ragResponse.todos.listName);
        setTasks(ragResponse.todos.todos);
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (error) {
      console.error('Error generating list:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button onClick={() => setIsNewListOpen(true)}>+ New List</button>
      <NewListSideCard
        isOpen={isNewListOpen}
        onClose={() => setIsNewListOpen(false)}
        onSubmit={handleAddList}
        initialName={listName}
        allCategories={categories}
        handleBuildWithAI={handleBuildWithAI}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default Sidebar; 