import React, { useState } from 'react';
import { MoreHorizontal, Calendar, Edit, Copy, Trash2 } from 'lucide-react';
import { SavedTemplate } from '@/lib/templateService';

interface TemplateCardProps {
  template: SavedTemplate;
  onEdit: (template: SavedTemplate) => void;
  onClone: (template: SavedTemplate) => void;
  onDelete: (template: SavedTemplate) => void;
}

export default function TemplateCard({ template, onEdit, onClone, onDelete }: TemplateCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCardClick = () => {
    onEdit(template);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowDropdown(false);
  };

  return (
    <div
      onClick={handleCardClick}
      className="border border-gray-200 rounded-lg flex flex-col h-72 overflow-hidden bg-white hover:shadow-lg transition-shadow cursor-pointer group"
    >
      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h6 className="group-hover:text-[#A85C36] transition-colors font-medium text-[#332B42] text-sm mb-1">
              {template.name}
            </h6>
            {template.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
            )}
          </div>
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
            
            {showDropdown && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-1">
                    <button
                      onClick={(e) => handleActionClick(e, () => onEdit(template))}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                      Edit
                    </button>
                    
                    <button
                      onClick={(e) => handleActionClick(e, () => onClone(template))}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Copy className="w-4 h-4 text-green-600" />
                      Clone
                    </button>
                    
                    <button
                      onClick={(e) => handleActionClick(e, () => onDelete(template))}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Template Preview */}
        <div className="space-y-3 flex-1">
          {/* Table Summary */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#332B42]">Layout Summary:</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• {template.tables.filter(t => !t.isVenueItem).length} tables</div>
              <div>• {template.tables.filter(t => t.isVenueItem).length} venue items</div>
              <div>• {template.tables.reduce((sum, t) => sum + t.capacity, 0)} total seats</div>
            </div>
          </div>
          
          {/* Visual Preview */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#332B42]">Table Types:</div>
            <div className="flex flex-wrap gap-1">
              {template.tables.slice(0, 8).map((table, index) => (
                <div key={index} className={`w-5 h-5 rounded text-xs flex items-center justify-center ${
                  table.type === 'round' ? 'bg-blue-100 text-blue-600' :
                  table.type === 'long' ? 'bg-green-100 text-green-600' :
                  table.type === 'square' ? 'bg-purple-100 text-purple-600' :
                  table.isVenueItem ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {table.type === 'round' ? '●' : 
                   table.type === 'long' ? '▭' : 
                   table.type === 'square' ? '■' :
                   table.isVenueItem ? '⬜' : '●'}
                </div>
              ))}
              {template.tables.length > 8 && (
                <div className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs flex items-center justify-center">
                  +{template.tables.length - 8}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {template.createdAt.toLocaleDateString()}
              </span>
            </div>
            <span className="text-[#A85C36] font-medium group-hover:text-[#8B4A2A] transition-colors">
              Edit Template →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
