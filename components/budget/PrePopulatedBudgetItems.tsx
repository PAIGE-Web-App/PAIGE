import React from 'react';
import { DollarSign, Camera, Utensils, Car, Music, Flower2, Shirt, Gift, FileText, Zap } from 'lucide-react';

interface PrePopulatedBudgetItem {
  name: string;
  amount: number;
  notes?: string;
}

interface PrePopulatedCategory {
  name: string;
  icon: React.ReactNode;
  items: PrePopulatedBudgetItem[];
  color: string;
}

interface PrePopulatedBudgetItemsProps {
  onAddItems: (items: PrePopulatedBudgetItem[]) => void;
  selectedCategoryName?: string;
}

const PRE_POPULATED_CATEGORIES: PrePopulatedCategory[] = [
  {
    name: 'Venue & Catering',
    icon: <Utensils className="w-5 h-5" />,
    color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    items: [
      { name: 'Venue Rental', amount: 5000, notes: 'Ceremony and reception venue' },
      { name: 'Catering Service', amount: 3500, notes: 'Full service catering for 100 guests' },
      { name: 'Bar Service', amount: 1200, notes: 'Open bar with signature cocktails' },
      { name: 'Cake', amount: 400, notes: 'Wedding cake and dessert table' },
      { name: 'Tableware & Linens', amount: 300, notes: 'Chargers, napkins, tablecloths' }
    ]
  },
  {
    name: 'Photography & Videography',
    icon: <Camera className="w-5 h-5" />,
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    items: [
      { name: 'Photographer', amount: 2500, notes: '8-hour wedding day coverage' },
      { name: 'Videographer', amount: 2000, notes: 'Highlight reel and full ceremony' },
      { name: 'Engagement Photos', amount: 400, notes: 'Pre-wedding photo session' },
      { name: 'Photo Booth', amount: 600, notes: 'Fun guest entertainment' },
      { name: 'Drone Photography', amount: 300, notes: 'Aerial shots of venue' }
    ]
  },
  {
    name: 'Flowers & Decorations',
    icon: <Flower2 className="w-5 h-5" />,
    color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    items: [
      { name: 'Bridal Bouquet', amount: 200, notes: 'Main bridal bouquet' },
      { name: 'Bridesmaids Bouquets', amount: 300, notes: 'Matching bridesmaids flowers' },
      { name: 'Ceremony Flowers', amount: 500, notes: 'Altar and aisle decorations' },
      { name: 'Reception Centerpieces', amount: 800, notes: 'Table centerpieces and decor' },
      { name: 'Flower Petals', amount: 100, notes: 'Aisle and exit petals' }
    ]
  },
  {
    name: 'Attire & Beauty',
    icon: <Shirt className="w-5 h-5" />,
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    items: [
      { name: 'Wedding Dress', amount: 1500, notes: 'Bridal gown and alterations' },
      { name: 'Groom\'s Suit', amount: 600, notes: 'Tuxedo or suit rental' },
      { name: 'Bridesmaids Dresses', amount: 800, notes: 'Matching bridesmaid attire' },
      { name: 'Hair & Makeup', amount: 400, notes: 'Bridal beauty services' },
      { name: 'Accessories', amount: 200, notes: 'Jewelry, shoes, veil' }
    ]
  },
  {
    name: 'Music & Entertainment',
    icon: <Music className="w-5 h-5" />,
    color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
    items: [
      { name: 'DJ Service', amount: 1200, notes: 'Wedding DJ and sound system' },
      { name: 'Live Band', amount: 2500, notes: 'Ceremony and reception music' },
      { name: 'Ceremony Music', amount: 400, notes: 'String quartet or pianist' },
      { name: 'Sound Equipment', amount: 300, notes: 'Microphones and speakers' },
      { name: 'Lighting', amount: 500, notes: 'Dance floor and ambient lighting' }
    ]
  },
  {
    name: 'Transportation',
    icon: <Car className="w-5 h-5" />,
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
    items: [
      { name: 'Limo Service', amount: 800, notes: 'Bridal party transportation' },
      { name: 'Guest Shuttle', amount: 600, notes: 'Transportation for guests' },
      { name: 'Vendor Transportation', amount: 200, notes: 'Getting vendors to venue' },
      { name: 'Parking Fees', amount: 150, notes: 'Venue parking costs' }
    ]
  },
  {
    name: 'Stationery & Favors',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    items: [
      { name: 'Invitations', amount: 400, notes: 'Save the dates and invitations' },
      { name: 'Programs & Menus', amount: 200, notes: 'Wedding day stationery' },
      { name: 'Thank You Cards', amount: 150, notes: 'Post-wedding thank you notes' },
      { name: 'Guest Favors', amount: 300, notes: 'Wedding favors for guests' },
      { name: 'Postage', amount: 100, notes: 'Mailing costs' }
    ]
  },
  {
    name: 'Miscellaneous',
    icon: <Gift className="w-5 h-5" />,
    color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
    items: [
      { name: 'Wedding Planner', amount: 2000, notes: 'Day-of coordination services' },
      { name: 'Marriage License', amount: 50, notes: 'Legal marriage certificate' },
      { name: 'Officiant Fee', amount: 300, notes: 'Ceremony officiant' },
      { name: 'Guest Book', amount: 80, notes: 'Wedding guest book' },
      { name: 'Emergency Kit', amount: 100, notes: 'Wedding day emergency supplies' }
    ]
  }
];

const PrePopulatedBudgetItems: React.FC<PrePopulatedBudgetItemsProps> = ({
  onAddItems,
  selectedCategoryName
}) => {
  const handleCategoryClick = (category: PrePopulatedCategory) => {
    onAddItems(category.items);
  };

  // If a specific category is selected, show only that category
  const categoriesToShow = selectedCategoryName 
    ? PRE_POPULATED_CATEGORIES.filter(cat => 
        cat.name.toLowerCase().includes(selectedCategoryName.toLowerCase()) ||
        selectedCategoryName.toLowerCase().includes(cat.name.toLowerCase())
      )
    : PRE_POPULATED_CATEGORIES;

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <DollarSign className="w-12 h-12 mx-auto mb-3 text-[#AB9C95]" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Quick Start with Common Items</h3>
        <p className="text-sm text-gray-600 mb-4">
          Click on a category to add common budget items instantly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {categoriesToShow.map((category) => (
          <button
            key={category.name}
            onClick={() => handleCategoryClick(category)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${category.color}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {category.icon}
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="text-sm opacity-75">
              {category.items.length} common items
            </div>
            <div className="text-xs mt-1 opacity-60">
              Total: ${category.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      {selectedCategoryName && categoriesToShow.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
          <p className="text-sm">No pre-populated items available for "{selectedCategoryName}"</p>
          <p className="text-xs mt-1">Try the "Add First Item" button to create custom items</p>
        </div>
      )}

      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 These are estimated costs based on average wedding expenses. Adjust amounts as needed.
        </p>
      </div>
    </div>
  );
};

export default PrePopulatedBudgetItems;
