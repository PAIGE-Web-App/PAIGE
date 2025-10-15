import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Table, Users, ArrowRight, Lightbulb, FolderOpen } from 'lucide-react';
import { TableType } from '@/types/seatingChart';
import Banner from '@/components/Banner';
import { getTemplates, SavedTemplate, TemplateTable } from '@/lib/templateService';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomToast } from '@/hooks/useCustomToast';

interface AITableLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateLayout: (tables: TableType[], totalCapacity: number, positions?: Array<{ id: string; x: number; y: number }>) => void;
  guestCount: number;
  hasSeatedGuests?: boolean;
}

interface TableTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCapacity: number;
  tableType: 'round' | 'long';
  seatsPerTable: number;
  layout: string;
}

const BASE_TEMPLATES: TableTemplate[] = [
  {
    id: 'intimate',
    name: 'Intimate Gathering',
    description: 'Perfect for smaller weddings',
    icon: '💕',
    baseCapacity: 20,
    tableType: 'round',
    seatsPerTable: 8,
    layout: 'U-shaped'
  },
  {
    id: 'traditional',
    name: 'Traditional Reception',
    description: 'Classic round table setup',
    icon: '🎩',
    baseCapacity: 50,
    tableType: 'round',
    seatsPerTable: 10,
    layout: 'Scattered'
  },
  {
    id: 'rustic',
    name: 'Rustic Long Tables',
    description: 'Farmhouse style with long tables',
    icon: '🌾',
    baseCapacity: 50,
    tableType: 'long',
    seatsPerTable: 12,
    layout: 'Long rows'
  },
  {
    id: 'modern',
    name: 'Modern Mixed',
    description: 'Mix of round and long tables',
    icon: '✨',
    baseCapacity: 50,
    tableType: 'round',
    seatsPerTable: 8,
    layout: 'Mixed arrangement'
  }
];

// Function to generate dynamic tables based on guest count
function generateTablesFromTemplate(template: TableTemplate, guestCount: number) {
  const tables: Array<{
    name: string;
    type: 'round' | 'long';
    capacity: number;
    description: string;
  }> = [];

  // Always start with sweetheart table
  tables.push({
    name: 'Sweetheart Table',
    type: 'long',
    capacity: 2,
    description: 'Special table for the happy couple'
  });

  // guestCount represents guests excluding the couple
  // Sweetheart Table will seat the couple (2 people)
  // We need tables to seat all the guestCount people
  const numTables = Math.ceil(guestCount / template.seatsPerTable);
  
  // Generate table names based on template and guest count
  const tableNames = generateTableNames(template.id, numTables, guestCount);
  
  // Distribute guests evenly across tables
  const baseCapacity = Math.floor(guestCount / numTables);
  const remainder = guestCount % numTables;
  
  for (let i = 0; i < numTables; i++) {
    // Give extra seats to the first few tables if there's a remainder
    const capacity = baseCapacity + (i < remainder ? 1 : 0);
    
    // For "Modern Mixed" template, alternate between round and long tables
    let tableType = template.tableType;
    if (template.id === 'modern') {
      tableType = i % 2 === 0 ? 'round' : 'long';
    }
      
    tables.push({
      name: tableNames[i] || `Guest Table ${i + 1}`,
      type: tableType,
      capacity,
      description: generateTableDescription(tableNames[i], capacity)
    });
  }
  return tables;
}

function generateTableNames(templateId: string, numTables: number, guestCount: number): string[] {
  const names: string[] = [];
  
  if (templateId === 'intimate') {
    const intimateNames = ['Family Table', 'Close Friends', 'Extended Family', 'Work Friends'];
    return intimateNames.slice(0, numTables);
  } else if (templateId === 'traditional') {
    const traditionalNames = ['Bridal Party', 'Bride\'s Family', 'Groom\'s Family', 'College Friends', 'Work Friends', 'Extended Family', 'Family Friends', 'Neighbors'];
    return traditionalNames.slice(0, numTables);
  } else if (templateId === 'rustic') {
    const rusticNames = ['Head Table', 'Family Row', 'Friends Row', 'Extended Family Row', 'Work Friends Row', 'Neighbors Row'];
    return rusticNames.slice(0, numTables);
  } else if (templateId === 'modern') {
    const modernNames = ['VIP Circle', 'Family Tables', 'Friends Circle', 'Work Circle', 'Extended Family', 'Neighbors'];
    return modernNames.slice(0, numTables);
  }
  
  // Fallback for large numbers
  for (let i = 0; i < numTables; i++) {
    if (guestCount <= 50) {
      names[i] = `Table ${String.fromCharCode(65 + i)}`; // A, B, C, etc.
    } else {
      names[i] = `Guest Table ${i + 1}`;
    }
  }
  
  return names;
}

function generateTableDescription(tableName: string | undefined, capacity: number): string {
  if (!tableName) {
    return `${capacity} guest seats`;
  }
  
  if (tableName.includes('Family')) {
    return 'Family seating';
  } else if (tableName.includes('Friends')) {
    return 'Friends seating';
  } else if (tableName.includes('Party') || tableName.includes('VIP')) {
    return 'Wedding party seating';
  } else {
    return `${capacity} guest seats`;
  }
}

// Function to generate proper positioning for each layout type
function generateTablePositions(template: TableTemplate, generatedTables: any[]) {
  const positions: Array<{ id: string; x: number; y: number }> = [];
  
  const sweetheartTable = generatedTables.find(t => t.name === 'Sweetheart Table');
  const guestTables = generatedTables.filter(t => t.name !== 'Sweetheart Table');
  
  if (template.layout === 'U-shaped') {
    // U-shape: Sweetheart table at center-bottom, guest tables in semi-circle around it
    if (sweetheartTable) {
      positions.push({
        id: sweetheartTable.id || 'sweetheart-table',
        x: 400, // Center horizontally
        y: 450  // Bottom area
      });
    }
    
    const centerX = 400;
    const centerY = 300; // Above the sweetheart table
    const radius = 140;
    
    guestTables.forEach((table, index) => {
      const angle = (Math.PI / (guestTables.length + 1)) * (index + 1);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY - radius * Math.sin(angle);
      
      positions.push({
        id: table.id || `table-${index}`,
        x: Math.round(x),
        y: Math.round(y)
      });
    });
  } else if (template.layout === 'Scattered') {
    // Scattered: Sweetheart table at center, guest tables spread around
    if (sweetheartTable) {
      positions.push({
        id: sweetheartTable.id || 'sweetheart-table',
        x: 400, // Center
        y: 350  // Middle vertically
      });
    }
    
    guestTables.forEach((table, index) => {
      const cols = Math.ceil(Math.sqrt(guestTables.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const spacing = 200;
      const startX = 200;
      const startY = 150;
      
      positions.push({
        id: table.id || `table-${index}`,
        x: startX + (col * spacing),
        y: startY + (row * spacing)
      });
    });
  } else if (template.layout === 'Long rows') {
    // Long rows: Sweetheart table at center-bottom, guest tables in rows above
    if (sweetheartTable) {
      positions.push({
        id: sweetheartTable.id || 'sweetheart-table',
        x: 400, // Center horizontally
        y: 450  // Bottom area
      });
    }
    
    const rows = Math.ceil(guestTables.length / 2);
    const spacing = 220;
    const startX = 300;
    const startY = 120;
    
    guestTables.forEach((table, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      
      positions.push({
        id: table.id || `table-${index}`,
        x: startX + (col * spacing),
        y: startY + (row * spacing)
      });
    });
  } else {
    // Mixed arrangement: Sweetheart table at center, guest tables in grid pattern
    if (sweetheartTable) {
      positions.push({
        id: sweetheartTable.id || 'sweetheart-table',
        x: 400, // Center
        y: 400  // Middle vertically
      });
    }
    guestTables.forEach((table, index) => {
      const spacing = 160;
      const startX = 280;
      const startY = 180;
      
      positions.push({
        id: table.id || `table-${index}`,
        x: startX + ((index % 3) * spacing),
        y: startY + (Math.floor(index / 3) * spacing)
      });
    });
  }
  
  return positions;
}

const AITableLayoutModal: React.FC<AITableLayoutModalProps> = ({
  isOpen,
  onClose,
  onGenerateLayout,
  guestCount,
  hasSeatedGuests = false
}) => {
  const { user } = useAuth();
  const { showSuccessToast } = useCustomToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [showYourTemplates, setShowYourTemplates] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedSavedTemplate, setSelectedSavedTemplate] = useState<SavedTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [confirmTemplateRegenerate, setConfirmTemplateRegenerate] = useState(false);

  // Load saved templates when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadSavedTemplates();
    }
  }, [isOpen, user]);

  // Pre-fill AI prompt with guest count
  useEffect(() => {
    if (showAIPrompt && !aiPrompt) {
      setAiPrompt(`I have ${guestCount} guests and I want to create a wedding seating layout. I prefer rectangular tables with 8 seats per table. I want a U-shaped layout for my reception.`);
    }
  }, [showAIPrompt, guestCount, aiPrompt]);

  const loadSavedTemplates = async () => {
    if (!user) return;
    
    setIsLoadingTemplates(true);
    try {
      const templates = await getTemplates(user.uid);
      setSavedTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplate(selectedTemplate === templateId ? null : templateId);
  };

  const handleSavedTemplateClick = (template: SavedTemplate) => {
    setSelectedSavedTemplate(selectedSavedTemplate?.id === template.id ? null : template);
  };

  const handleApplySavedTemplate = () => {
    if (!selectedSavedTemplate) return;

    // Check if we need confirmation (if there are already seated guests)
    if (hasSeatedGuests && !confirmTemplateRegenerate) {
      setConfirmTemplateRegenerate(true);
      return;
    }

    // Generate a single timestamp for consistent ID generation
    const timestamp = Date.now();
    
    // Convert saved template tables to TableType format with NEW IDs to avoid conflicts
    // BUT preserve the sweetheart table ID to maintain its special behavior
    const tables: TableType[] = selectedSavedTemplate.tables.map((table, index) => ({
      id: table.name === 'Sweetheart Table' ? 'sweetheart-table' : `applied-${timestamp}-${index}`, // Preserve sweetheart table ID
      name: table.name,
      type: table.type,
      capacity: table.capacity,
      description: table.description || '',
      isDefault: table.isDefault || false,
      rotation: table.rotation || 0,
      isVenueItem: table.isVenueItem || false
    }));

    // Calculate total capacity (excluding sweetheart table)
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0) - 2;

    // Generate positions array from saved template data with NEW IDs
    // BUT preserve the sweetheart table ID to maintain its special behavior
    const positions = selectedSavedTemplate.tables.map((table, index) => ({
      id: table.name === 'Sweetheart Table' ? 'sweetheart-table' : `applied-${timestamp}-${index}`, // Use same timestamp
      x: table.x || 0,
      y: table.y || 0
    }));

    // Update tables to include width and height properties with NEW IDs
    // BUT preserve the sweetheart table ID to maintain its special behavior
    const tablesWithDimensions = tables.map((table, index) => {
      const savedTable = selectedSavedTemplate.tables[index]; // Use index instead of finding by ID
      const tableWithDimensions = {
        ...table,
        id: table.name === 'Sweetheart Table' ? 'sweetheart-table' : table.id, // Ensure sweetheart table ID is preserved
        // Ensure sweetheart table always has correct dimensions
        width: table.name === 'Sweetheart Table' ? 120 : (savedTable?.width || 80),
        height: table.name === 'Sweetheart Table' ? 60 : (savedTable?.height || 80)
      } as TableType & { width: number; height: number };
      
      return tableWithDimensions;
    });

    // Apply the template with saved positions
    onGenerateLayout(tablesWithDimensions, totalCapacity, positions);
    
    // Show success toast
    showSuccessToast(`Template "${selectedSavedTemplate.name}" applied successfully!`);
    
    onClose();
  };

  const handleGenerateFromTemplate = () => {
    if (!selectedTemplate) return;
    
    // Check if we need confirmation
    if (hasSeatedGuests && !confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    
    const template = BASE_TEMPLATES.find(t => t.id === selectedTemplate);
    
    if (!template) return;
    
    const generatedTables = generateTablesFromTemplate(template, guestCount);
    const totalCapacity = generatedTables.reduce((sum, table) => sum + table.capacity, 0) - 2; // Always subtract 2 for sweetheart table
    
    const tablesWithIds: TableType[] = generatedTables.map((table, index) => ({
      id: `table-${Date.now()}-${index}`,
      name: table.name,
      type: table.type,
      capacity: table.capacity,
      // Don't include x, y here - positions will be set separately via tablePositions
      // Set proper dimensions based on table type
      width: table.type === 'long' ? (table.name === 'Sweetheart Table' ? 120 : 200) : 80,
      height: table.type === 'long' ? (table.name === 'Sweetheart Table' ? 60 : 80) : 80,
      description: table.description,
      isDefault: table.name === 'Sweetheart Table',
      rotation: 0
    }));

    // Generate proper positioning for the tables
    const tablePositions = generateTablePositions(template, tablesWithIds);

    // Template generation complete

    onGenerateLayout(tablesWithIds, totalCapacity, tablePositions);
    onClose();
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    // Check if we need confirmation
    if (hasSeatedGuests && !confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Call AI API to generate table layout
      const response = await fetch('/api/generate-seating-layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          guestCount: guestCount
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate layout');
      }

      const data = await response.json();
      
      if (data.tables) {
        const generatedTables: TableType[] = data.tables.map((table: any, index: number) => ({
          id: `table-${Date.now()}-${index}`,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          description: table.description || '',
          isDefault: table.name === 'Sweetheart Table',
          rotation: 0
        }));

        onGenerateLayout(generatedTables, data.totalCapacity || (generatedTables.reduce((sum, t) => sum + t.capacity, 0) - 2)); // Always subtract 2 for sweetheart table
        onClose();
      }
    } catch (error) {
      console.error('Error generating layout:', error);
      // Fallback to a simple layout
      const fallbackTables: TableType[] = [
        {
          id: `table-${Date.now()}-0`,
          name: 'Sweetheart Table',
          type: 'long',
          capacity: 2,
          description: 'For the couple',
          isDefault: true,
          rotation: 0
        },
        {
          id: `table-${Date.now()}-1`,
          name: 'Guest Table 1',
          type: 'round',
          capacity: 8,
          description: 'Guest seating',
          isDefault: false,
          rotation: 0
        }
      ];
      
      onGenerateLayout(fallbackTables, 8); // 10 - 2 for sweetheart table
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  const resetModal = () => {
    setSelectedTemplate(null);
    setShowAIPrompt(false);
    setAiPrompt('');
    setIsGenerating(false);
    setConfirmRegenerate(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const selectedTemplateData = selectedTemplate ? BASE_TEMPLATES.find(t => t.id === selectedTemplate) : null;
  const previewCapacity = guestCount; // Show the actual guest count

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
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
                  <Table className="w-6 h-6 text-[#A85C36]" />
                </div>
                <h5 className="h5 text-left text-lg md:text-xl">Table Layout Generator</h5>
              </div>
              <button
                onClick={handleClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {/* Confirmation Banner */}
              {confirmRegenerate && hasSeatedGuests && (
                <div className="mb-6">
                  <Banner
                    message="Are you sure? This will remove your current layout with seated guests and create a new one."
                    type="error"
                  />
                </div>
              )}
              
              <div className="mb-4">
                {/* Purple AI Banner */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                    <div className="flex-1">
                      <p className="text-sm text-purple-800 font-medium mb-1">
                        Want a custom AI-generated layout?
                      </p>
                      <p className="text-xs text-purple-600">
                        Generate a personalized table layout tailored to your specific wedding needs and preferences
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAIPrompt(true);
                      }}
                      className="bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Assistant
                    </button>
                  </div>
                </div>

                {/* Option Toggle */}
                <div className="flex justify-center mb-6">
                  <div className="bg-[#F8F6F4] rounded-[5px] p-1 flex">
                    <button
                      onClick={() => {
                        setShowAIPrompt(false);
                        setShowYourTemplates(false);
                      }}
                      className={`px-4 py-2 rounded-[3px] text-sm font-medium transition-all ${
                        !showAIPrompt && !showYourTemplates
                          ? 'bg-white text-[#332B42] shadow-sm' 
                          : 'text-[#AB9C95] hover:text-[#332B42]'
                      }`}
                    >
                      Popular Templates
                    </button>
                    <button
                      onClick={() => {
                        setShowAIPrompt(true);
                        setShowYourTemplates(false);
                      }}
                      className={`px-4 py-2 rounded-[3px] text-sm font-medium transition-all ${
                        showAIPrompt && !showYourTemplates
                          ? 'bg-white text-[#332B42] shadow-sm' 
                          : 'text-[#AB9C95] hover:text-[#332B42]'
                      }`}
                    >
                      AI Assistant
                    </button>
                    <button
                      onClick={() => {
                        setShowAIPrompt(false);
                        setShowYourTemplates(true);
                      }}
                      className={`px-4 py-2 rounded-[3px] text-sm font-medium transition-all ${
                        showYourTemplates && !showAIPrompt
                          ? 'bg-white text-[#332B42] shadow-sm' 
                          : 'text-[#AB9C95] hover:text-[#332B42]'
                      }`}
                    >
                      Your Templates
                    </button>
                  </div>
                </div>

                {/* Content */}
                {!showAIPrompt && !showYourTemplates ? (
                  /* Popular Templates */
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Choose Your Layout Style
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Select one layout style that best fits your wedding vision
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                      {BASE_TEMPLATES.map((template) => {
                        const generatedTables = generateTablesFromTemplate(template, guestCount);
                        const guestTableCapacity = generatedTables.filter(t => t.name !== 'Sweetheart Table').reduce((sum, table) => sum + table.capacity, 0);
                        const numTables = generatedTables.filter(t => t.name !== 'Sweetheart Table').length; // Only count guest tables
                        
                        return (
                          <div
                            key={template.id}
                            className={`p-3 md:p-4 rounded-lg border-2 transition-colors duration-200 text-left relative cursor-pointer ${
                              selectedTemplate === template.id
                                ? 'bg-blue-50 border-blue-300 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => handleTemplateClick(template.id)}
                          >
                            {/* Selection indicator in top left */}
                            <div className="absolute top-3 left-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedTemplate === template.id
                                  ? 'bg-[#A85C36] border-[#A85C36]'
                                  : 'border-gray-300'
                              }`}>
                                {selectedTemplate === template.id && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-2 pl-6">
                              <span className="text-2xl">{template.icon}</span>
                              <span className="font-medium">{template.name}</span>
                            </div>
                            <div className="text-sm opacity-75 mb-1">
                              {template.description}
                            </div>
                            <div className="text-sm font-medium">
                              {guestCount} seats • {numTables} tables • {template.layout}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : showAIPrompt ? (
                  /* AI Assistant */
                  <div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#332B42] mb-2">
                          Describe your ideal table layout:
                        </label>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder={`I have ${guestCount} guests and want round tables with 8 seats each in a U-shaped layout...`}
                          className="w-full h-32 p-4 border border-[#E0DBD7] rounded-[5px] resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] text-sm"
                        />
                      </div>

                    </div>
                  </div>
                ) : (
                  /* Your Templates */
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Choose from Your Saved Templates
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Select a template to apply to your current layout
                      </p>
                    </div>

                    {isLoadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36]"></div>
                        <span className="ml-2 text-gray-600">Loading templates...</span>
                      </div>
                    ) : savedTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No saved templates yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Create and save templates from the seating chart to see them here
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {savedTemplates.map((template) => {
                          const guestTableCapacity = template.tables.reduce((sum, t) => sum + t.capacity, 0) - 2; // Subtract sweetheart table
                          const numTables = template.tables.filter(t => !t.isVenueItem).length;
                          
                          return (
                            <div
                              key={template.id}
                              className={`p-3 md:p-4 rounded-lg border-2 transition-colors duration-200 text-left relative cursor-pointer ${
                                selectedSavedTemplate?.id === template.id
                                  ? 'bg-blue-50 border-blue-300 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
                              }`}
                              onClick={() => handleSavedTemplateClick(template)}
                            >
                              {/* Selection indicator in top left */}
                              <div className="absolute top-3 left-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  selectedSavedTemplate?.id === template.id
                                    ? 'bg-[#A85C36] border-[#A85C36]'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedSavedTemplate?.id === template.id && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 mb-2 pl-6">
                                <span className="text-2xl">📋</span>
                                <span className="font-medium">{template.name}</span>
                              </div>
                              <div className="text-sm opacity-75 mb-1">
                                {template.description || 'Your saved template'}
                              </div>
                              <div className="text-sm font-medium">
                                {guestTableCapacity} seats • {numTables} tables • Saved Layout
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Confirmation Banner for Your Templates */}
                    {confirmTemplateRegenerate && (
                      <div className="mt-4">
                        <Banner 
                          type="warning"
                          message="Are you sure? This will remove your current layout with guests. Are you sure you want to continue?"
                          onDismiss={() => setConfirmTemplateRegenerate(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
              {!showAIPrompt && !showYourTemplates ? (
                /* Popular Templates Tab Footer */
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                  <div className="text-left">
                    {selectedTemplate ? (
                      <p className="text-base font-semibold text-gray-800">
                        {selectedTemplateData?.name} • {previewCapacity} seats • {guestCount} guests
                        <span className={`text-sm font-normal ${
                          previewCapacity >= guestCount ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {' '}({previewCapacity >= guestCount ? 'Perfect fit!' : `${guestCount - previewCapacity} more seats needed`})
                        </span>
                      </p>
                    ) : (
                      <p className="text-base font-semibold text-gray-800">
                        Select a layout style to continue
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={handleGenerateFromTemplate}
                      disabled={!selectedTemplate}
                      className={`flex items-center justify-center gap-2 w-full md:w-auto ${
                        selectedTemplate 
                          ? 'btn-primary' 
                          : 'btn-primary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      {confirmRegenerate ? 'Confirm Regeneration' : 'Generate Layout'}
                    </button>
                  </div>
                </div>
              ) : showAIPrompt ? (
                /* AI Assistant Tab Footer */
                <div className="flex justify-end">
                  <motion.button
                    onClick={handleAIGenerate}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className={`btn-gradient-purple flex items-center gap-2 ${
                      !aiPrompt.trim() || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    whileHover={{ scale: (!aiPrompt.trim() || isGenerating) ? 1 : 1.02 }}
                    whileTap={{ scale: (!aiPrompt.trim() || isGenerating) ? 1 : 0.98 }}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating Layout...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {confirmRegenerate ? 'Confirm Regeneration' : 'Generate with Paige AI'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              ) : (
                /* Your Templates Tab Footer */
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                  <div className="text-left">
                    {selectedSavedTemplate ? (
                      <p className="text-base font-semibold text-gray-800">
                        {selectedSavedTemplate.name} • {selectedSavedTemplate.tables.reduce((sum, t) => sum + t.capacity, 0) - 2} seats • {guestCount} guests
                        <span className={`text-sm font-normal ${
                          (selectedSavedTemplate.tables.reduce((sum, t) => sum + t.capacity, 0) - 2) >= guestCount ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {' '}({(selectedSavedTemplate.tables.reduce((sum, t) => sum + t.capacity, 0) - 2) >= guestCount ? 'Perfect fit!' : `${guestCount - (selectedSavedTemplate.tables.reduce((sum, t) => sum + t.capacity, 0) - 2)} more seats needed`})
                        </span>
                      </p>
                    ) : (
                      <p className="text-base font-semibold text-gray-800">
                        Select a saved template to continue
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button
                      onClick={handleApplySavedTemplate}
                      disabled={!selectedSavedTemplate}
                      className={`flex items-center justify-center gap-2 w-full md:w-auto ${
                        selectedSavedTemplate 
                          ? 'btn-primary' 
                          : 'btn-primary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      {confirmTemplateRegenerate ? 'Confirm Regeneration' : 'Apply Template'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AITableLayoutModal;
