import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DollarSign, Camera, Utensils, Car, Music, Flower2, Shirt, Gift, FileText, X, Sparkles } from 'lucide-react';

// Color mapping function to match AI-generated categories
const getCategoryColor = (categoryName: string): string => {
  const colorMap: Record<string, string> = {
    'Venue & Catering': '#A85C36',
    'Photography & Videography': '#2F4F4F',
    'Flowers & Decorations': '#FF69B4',
    'Attire & Beauty': '#8A2BE2',
    'Music & Entertainment': '#32CD32',
    'Transportation': '#4169E1',
    'Stationery & Favors': '#DC143C',
    'Wedding Rings': '#FFD700',
    'Wedding Planner': '#00CED1',
    'Miscellaneous': '#696969'
  };
  
  return colorMap[categoryName] || '#696969';
};

interface PrePopulatedCategory {
  name: string;
  icon: React.ReactNode;
  suggestedAmount: number;
  color: string;
  description: string;
  items: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>;
}

interface PrePopulatedBudgetCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategories: (categories: Array<{name: string; amount: number; color?: string; items?: Array<{name: string; amount: number; notes?: string; dueDate?: Date}>}>) => void;
  onShowAIAssistant?: () => void;
  onAddCategory?: () => void;
  maxBudget?: number;
}

const PRE_POPULATED_CATEGORIES: PrePopulatedCategory[] = [
  {
    name: 'Venue & Catering',
    icon: <Utensils className="w-5 h-5" />,
    suggestedAmount: 15000,
    color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    description: 'Ceremony venue, reception space, and catering services',
    items: [
      { name: 'Ceremony Venue', amount: 5000, notes: 'Cost for the ceremony location', dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }, // 60 days from now
      { name: 'Reception Venue', amount: 8000, notes: 'Cost for the reception space', dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) }, // 45 days from now
      { name: 'Catering per person', amount: 100, notes: 'Food and beverage cost per guest', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 days from now
      { name: 'Bar Service', amount: 2000, notes: 'Alcohol and bartender services', dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000) } // 35 days from now
    ]
  },
  {
    name: 'Photography & Videography',
    icon: <Camera className="w-5 h-5" />,
    suggestedAmount: 3500,
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    description: 'Wedding photographer, videographer, and photo booth',
    items: [
      { name: 'Photographer Package', amount: 2500, notes: 'Main photographer for the day', dueDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000) }, // 50 days from now
      { name: 'Videographer Package', amount: 2000, notes: 'Wedding videographer services', dueDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000) }, // 55 days from now
      { name: 'Photo Booth', amount: 500, notes: 'Rental for a fun photo booth', dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) } // 25 days from now
    ]
  },
  {
    name: 'Flowers & Decorations',
    icon: <Flower2 className="w-5 h-5" />,
    suggestedAmount: 2500,
    color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    description: 'Bridal bouquet, centerpieces, and ceremony decorations',
    items: [
      { name: 'Bridal Bouquet', amount: 250, notes: 'Bride\'s main flower arrangement', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }, // 15 days from now
      { name: 'Boutonnieres', amount: 100, notes: 'Flowers for groom and groomsmen', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) }, // 15 days from now
      { name: 'Centerpieces', amount: 1000, notes: 'Table decorations for reception', dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) }, // 20 days from now
      { name: 'Ceremony Decorations', amount: 700, notes: 'Flowers and decor for ceremony space', dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) } // 20 days from now
    ]
  },
  {
    name: 'Attire & Beauty',
    icon: <Shirt className="w-5 h-5" />,
    suggestedAmount: 2000,
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    description: 'Wedding dress, groom\'s suit, hair, and makeup',
    items: [
      { name: 'Wedding Dress', amount: 1200, notes: 'Bride\'s wedding gown' },
      { name: 'Groom\'s Suit/Tux', amount: 400, notes: 'Groom\'s formal wear' },
      { name: 'Hair & Makeup', amount: 200, notes: 'Professional styling for the bride' },
      { name: 'Bridal Accessories', amount: 200, notes: 'Shoes, jewelry, and other accessories' }
    ]
  },
  {
    name: 'Music & Entertainment',
    icon: <Music className="w-5 h-5" />,
    suggestedAmount: 1800,
    color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    description: 'DJ, live music, ceremony musicians, and lighting',
    items: [
      { name: 'DJ Services', amount: 1000, notes: 'Music and MC for reception' },
      { name: 'Ceremony Musicians', amount: 400, notes: 'Live music for ceremony' },
      { name: 'Lighting', amount: 200, notes: 'Uplighting and special effects' },
      { name: 'Sound System', amount: 200, notes: 'Audio equipment rental' }
    ]
  },
  {
    name: 'Transportation',
    icon: <Car className="w-5 h-5" />,
    suggestedAmount: 800,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
    description: 'Limo service and guest transportation',
    items: [
      { name: 'Limo Service', amount: 500, notes: 'Transportation for bridal party' },
      { name: 'Guest Shuttle', amount: 300, notes: 'Shuttle service for guests' }
    ]
  },
  {
    name: 'Stationery & Favors',
    icon: <FileText className="w-5 h-5" />,
    suggestedAmount: 600,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    description: 'Invitations, programs, and guest favors',
    items: [
      { name: 'Invitations', amount: 300, notes: 'Wedding invitations and RSVPs' },
      { name: 'Save the Dates', amount: 150, notes: 'Pre-invitation cards' },
      { name: 'Guest Favors', amount: 150, notes: 'Small gifts for guests' }
    ]
  },
  {
    name: 'Miscellaneous',
    icon: <Gift className="w-5 h-5" />,
    suggestedAmount: 1200,
    color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
    description: 'Wedding planner, marriage license, and other expenses',
    items: [
      { name: 'Wedding Planner', amount: 1000, notes: 'Professional wedding coordination' },
      { name: 'Marriage License', amount: 50, notes: 'Legal document for marriage' },
      { name: 'Contingency Fund', amount: 150, notes: 'Buffer for unexpected expenses' }
    ]
  }
];

const PrePopulatedBudgetCategoriesModal: React.FC<PrePopulatedBudgetCategoriesModalProps> = ({
  isOpen,
  onClose,
  onAddCategories,
  onShowAIAssistant,
  onAddCategory,
  maxBudget
}) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'suggestions' | 'custom'>('suggestions');
  const [customCategories, setCustomCategories] = useState<Array<{name: string; amount: string; id: string}>>([
    { name: '', amount: '', id: '1' }
  ]);

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(new Set());
    }
  }, [isOpen]);

  const handleCategoryClick = (category: PrePopulatedCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category.name)) {
      newSelected.delete(category.name);
    } else {
      newSelected.add(category.name);
    }
    setSelectedCategories(newSelected);
  };

  const handleAddSelected = () => {
    if (activeTab === 'suggestions') {
      // Add selected common categories
      const categoriesToAdd = PRE_POPULATED_CATEGORIES.filter(cat => 
        selectedCategories.has(cat.name)
      ).map(cat => ({
        name: cat.name,
        amount: cat.suggestedAmount,
        color: getCategoryColor(cat.name),
        items: cat.items
      }));

      if (categoriesToAdd.length > 0) {
        onAddCategories(categoriesToAdd);
        onClose();
      }
    } else {
      // Add custom categories
      const validCustomCategories = customCategories
        .filter(cat => cat.name.trim() && cat.amount && parseFloat(cat.amount) > 0)
        .map(cat => ({
          name: cat.name.trim(),
          amount: parseFloat(cat.amount),
          color: '#696969' // Default gray color for custom categories
        }));

      if (validCustomCategories.length > 0) {
        onAddCategories(validCustomCategories);
        onClose();
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === PRE_POPULATED_CATEGORIES.length) {
      // If all are selected, deselect all
      setSelectedCategories(new Set());
    } else {
      // Select all categories
      setSelectedCategories(new Set(PRE_POPULATED_CATEGORIES.map(cat => cat.name)));
    }
  };


  // Calculate totals based on active tab
  const totalSelected = activeTab === 'suggestions' 
    ? selectedCategories.size 
    : customCategories.filter(cat => cat.name.trim() && cat.amount && parseFloat(cat.amount) > 0).length;
    
  const totalAmount = activeTab === 'suggestions'
    ? PRE_POPULATED_CATEGORIES
        .filter(cat => selectedCategories.has(cat.name))
        .reduce((sum, cat) => sum + cat.suggestedAmount, 0)
    : customCategories
        .filter(cat => cat.name.trim() && cat.amount && parseFloat(cat.amount) > 0)
        .reduce((sum, cat) => sum + parseFloat(cat.amount), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full h-[80vh] md:h-[85vh] flex flex-col relative mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-[#A85C36] bg-opacity-10 rounded-full p-2">
                  <DollarSign className="w-6 h-6 text-[#A85C36]" />
                </div>
                <h5 className="h5 text-left text-lg md:text-xl">Quick Start with Common Categories</h5>
              </div>
              <button
                onClick={onClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="mb-4">
                {/* Purple AI Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                    <div className="flex-1">
                      <p className="text-sm text-purple-800 font-medium mb-1">
                        Want a hyper-personalized budget?
                      </p>
                      <p className="text-xs text-purple-600">
                        Generate a custom budget tailored to your specific wedding needs and preferences
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (onShowAIAssistant) {
                          onShowAIAssistant();
                          onClose();
                        }
                      }}
                      className="btn-gradient-purple flex items-center gap-2 w-full md:w-auto md:ml-4 flex-shrink-0 justify-center md:justify-start"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate with Paige (5 Credits)
                    </button>
                  </div>
                </div>

                {/* Tabs - Matching Signup Flow */}
                <div className="flex mb-4 border-b border-[#E0D6D0]">
                  <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex-1 flex items-center justify-center gap-2 px-2 py-1 text-xs font-work-sans font-medium border-b-2 transition-colors duration-150 focus:outline-none whitespace-nowrap ${
                      activeTab === 'suggestions'
                        ? 'border-[#A85C36] text-[#A85C36] bg-[#F8F5F2]'
                        : 'border-transparent text-[#332B42] bg-transparent hover:bg-[#F3F2F0]'
                    }`}
                    style={{ borderRadius: '8px 8px 0 0' }}
                  >
                    <span className="text-base">✨</span>
                    <span className="whitespace-nowrap">Suggestions</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 flex items-center justify-center gap-2 px-2 py-1 text-xs font-work-sans font-medium border-b-2 transition-colors duration-150 focus:outline-none whitespace-nowrap ${
                      activeTab === 'custom'
                        ? 'border-[#A85C36] text-[#A85C36] bg-[#F8F5F2]'
                        : 'border-transparent text-[#332B42] bg-transparent hover:bg-[#F3F2F0]'
                    }`}
                    style={{ borderRadius: '8px 8px 0 0' }}
                  >
                    <span className="text-base">✏️</span>
                    <span className="whitespace-nowrap">Add Your Own</span>
                  </button>
                </div>

                {/* Suggestions Tab Content */}
                {activeTab === 'suggestions' && (
                  <>
                    <p className="text-sm text-gray-600 text-left mb-4">
                      Select budget categories below to get started quickly. You can adjust amounts later.
                    </p>
                
                    {/* Info Banner - Full Width */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 font-medium">
                        💡 These are estimated costs based on average wedding expenses. Adjust amounts as needed.
                      </p>
                    </div>

                    {/* Select All Row */}
                    <div className="flex justify-start mb-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={selectedCategories.size === PRE_POPULATED_CATEGORIES.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#A85C36] bg-gray-100 border-gray-300 rounded focus:ring-[#A85C36] focus:ring-2"
                        />
                        <label htmlFor="select-all" className="text-sm text-gray-700 cursor-pointer">
                          Select All
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {PRE_POPULATED_CATEGORIES.map((category) => (
                  <div
                    key={category.name}
                    className={`p-3 md:p-4 rounded-lg border-2 transition-colors duration-200 text-left relative cursor-pointer ${
                      selectedCategories.has(category.name)
                        ? 'bg-blue-50 border-blue-300 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleCategoryClick(category)}
                  >
                    {/* Checkbox in top left */}
                    <div className="absolute top-3 left-3">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category.name)}
                        onChange={() => handleCategoryClick(category)}
                        className="w-4 h-4 text-[#A85C36] bg-white border-gray-300 rounded focus:ring-[#A85C36] focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2 pl-6">
                      {category.icon}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-sm opacity-75 mb-1">
                      {category.description}
                    </div>
                    <div className="text-sm font-medium">
                      ${category.suggestedAmount.toLocaleString()}
                    </div>
                  </div>
                ))}
                    </div>
                  </>
                )}

                {/* Custom Tab Content */}
                {activeTab === 'custom' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 text-left mb-4">
                      Add multiple custom categories with your own names and budgets.
                    </p>

                    {/* Custom Category Inputs - Matching Signup Flow */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {customCategories.map((category, index) => (
                        <div key={category.id} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={category.name}
                              onChange={(e) => {
                                const newCategories = [...customCategories];
                                newCategories[index].name = e.target.value;
                                setCustomCategories(newCategories);
                              }}
                              placeholder="Category name (e.g., Gratuities & Tips)"
                              className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                              autoComplete="off"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              value={category.amount}
                              onChange={(e) => {
                                const newCategories = [...customCategories];
                                newCategories[index].amount = e.target.value;
                                setCustomCategories(newCategories);
                              }}
                              placeholder="Amount"
                              className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                              autoComplete="off"
                              min="0"
                              step="1"
                            />
                          </div>
                          {customCategories.length > 1 && (
                            <button
                              onClick={() => {
                                setCustomCategories(customCategories.filter(c => c.id !== category.id));
                              }}
                              className="p-2 text-red-500 hover:text-red-700 transition-colors"
                              title="Remove category"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Another Category Button */}
                    <button
                      onClick={() => {
                        setCustomCategories([
                          ...customCategories,
                          { name: '', amount: '', id: Date.now().toString() }
                        ]);
                      }}
                      className="w-full px-4 py-2 text-sm border-2 border-dashed border-gray-300 rounded-[5px] text-gray-600 hover:border-[#A85C36] hover:text-[#A85C36] transition-colors"
                    >
                      + Add Another Category
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                <div className="text-left">
                  {totalSelected > 0 ? (
                    <p className="text-base font-semibold text-gray-800">
                      {totalSelected} selected • Total Projected Spend: ${totalAmount.toLocaleString()}
                      {maxBudget && (
                        <span className={`text-sm font-normal ${
                          totalAmount <= maxBudget ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {' '}({Math.round((totalAmount / maxBudget) * 100)}% of your Max Budget)
                        </span>
                      )}
                    </p>
                  ) : null}
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={handleAddSelected}
                    disabled={totalSelected === 0}
                    className={`flex items-center justify-center gap-2 w-full md:w-auto ${
                      totalSelected > 0 
                        ? 'btn-primary' 
                        : 'btn-primary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Add {totalSelected > 0 ? `${totalSelected} ` : ''}Categories
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrePopulatedBudgetCategoriesModal;
