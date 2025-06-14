import { useState } from 'react';
import NewListSideCard from './NewListSideCard';

const Sidebar = () => {
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState([]);
  const categories = ['Wedding', 'Honeymoon', 'Reception', 'Ceremony']; // Example categories

  const handleAddList = (data: { name: string; tasks?: { name: string; note?: string; category?: string; deadline?: Date; endDate?: Date; }[] }) => {
    // Logic to add the new list to your state or database
    console.log('Adding new list:', data.name, data.tasks);
  };

  const handleBuildWithAI = async (template: string) => {
    setIsGenerating(true);
    try {
      console.log('Calling /api/generate-list with template:', template);
      const response = await fetch('/api/generate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingDate: '2023-12-31', template }), // Pass the selected template
      });
      const data = await response.json();
      console.log('Response from /api/generate-list:', data);
      setListName(data.listName);
      setTasks(data.tasks);
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