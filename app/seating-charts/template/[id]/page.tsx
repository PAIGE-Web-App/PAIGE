"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { ArrowLeft, Save } from 'lucide-react';
import { getTemplate, updateTemplate, SavedTemplate } from '@/lib/templateService';
import VisualTableLayoutSVG from '@/components/seating-charts/VisualTableLayoutSVG';

export default function TemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [template, setTemplate] = useState<SavedTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<SavedTemplate | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState(false);
  const [editingTemplateNameValue, setEditingTemplateNameValue] = useState('');

  // Load template data
  useEffect(() => {
    const loadTemplate = () => {
      const templateId = params.id as string;
      const templateData = getTemplate(templateId);
      
      if (!templateData) {
        showErrorToast('Template not found');
        router.push('/seating-charts');
        return;
      }
      
      setTemplate(templateData);
      setEditedTemplate(templateData);
      setIsLoading(false);
    };

    loadTemplate();
  }, [params.id, router, showErrorToast]);

  const handleSave = async () => {
    if (!editedTemplate) return;
    
    setIsSaving(true);
    try {
      const updated = updateTemplate(editedTemplate.id, {
        name: editedTemplate.name,
        description: editedTemplate.description,
        tables: editedTemplate.tables
      });
      
      if (updated) {
        setTemplate(updated);
        showSuccessToast('Template saved successfully');
      } else {
        showErrorToast('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showErrorToast('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTableLayoutUpdate = (updates: { tables: any[]; totalCapacity: number }) => {
    if (!editedTemplate) return;
    
    setEditedTemplate(prev => ({
      ...prev!,
      tables: updates.tables
    }));
  };

  const handleRenameTemplate = async () => {
    if (!editedTemplate || !editingTemplateNameValue.trim()) return;
    
    try {
      const updated = updateTemplate(editedTemplate.id, {
        name: editingTemplateNameValue.trim()
      });
      
      if (updated) {
        setEditedTemplate(updated);
        setTemplate(updated);
        setEditingTemplateName(false);
        setEditingTemplateNameValue('');
        showSuccessToast('Template renamed successfully');
      } else {
        showErrorToast('Failed to rename template');
      }
    } catch (error) {
      console.error('Error renaming template:', error);
      showErrorToast('Failed to rename template');
    }
  };

  const handleGoBack = () => {
    router.push('/seating-charts');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linen">
        <WeddingBanner />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-linen">
        <WeddingBanner />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-medium text-[#332B42] mb-4">Template not found</h1>
            <button
              onClick={handleGoBack}
              className="btn-primary"
            >
              Back to Seating Charts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen">
      <WeddingBanner />
      
      {/* Main Content Container - Full Width */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ width: '100%', maxWidth: '1800px' }}>
        {/* Template Header - Exact match with seating chart header */}
        <div className="flex items-center justify-between py-6 bg-[#F3F2F0] border-b border-[#AB9C95] sticky top-0 z-20 mb-8" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0"
              aria-label="Back to templates"
            >
              <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center transition-all duration-300"
                style={{
                  width: editingTemplateName ? '240px' : 'auto',
                  minWidth: editingTemplateName ? '240px' : 'auto',
                }}
              >
                <h1
                  className={`h5 text-[#332B42] transition-opacity duration-300 truncate max-w-[300px] ${
                    editingTemplateName ? 'opacity-0' : 'opacity-100'
                  }`}
                  title={template.name}
                >
                  Template: {template.name}
                </h1>
                <input
                  type="text"
                  value={editingTemplateNameValue || ''}
                  onChange={(e) => setEditingTemplateNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameTemplate();
                    } else if (e.key === 'Escape') {
                      setEditingTemplateName(false);
                      setEditingTemplateNameValue('');
                    }
                  }}
                  onBlur={() => {
                    if (editingTemplateNameValue) {
                      handleRenameTemplate();
                    } else {
                      setEditingTemplateName(false);
                      setEditingTemplateNameValue('');
                    }
                  }}
                  className={`absolute left-0 w-full h-8 px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                    editingTemplateName
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'
                  }`}
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setEditingTemplateName(true);
                  setEditingTemplateNameValue(template.name);
                }}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Rename Template"
              >
                <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                  ✏️
                </span>
              </button>
              {template.description && (
                <p className="text-sm text-[#AB9C95] font-work ml-2">{template.description}</p>
              )}
            </div>
          </div>
          
          {/* Template Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-normal text-[#332B42] font-work">
                {(editedTemplate?.tables || template.tables).filter(t => !t.isVenueItem).length}
              </div>
              <div className="text-xs text-[#AB9C95] font-work">Tables</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-normal text-[#332B42] font-work">
                {(editedTemplate?.tables || template.tables).filter(t => t.isVenueItem).length}
              </div>
              <div className="text-xs text-[#AB9C95] font-work">Venue Items</div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primaryinverse flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Table Layout Editor - Full Width, No Sidebar */}
        <div className="bg-white rounded-lg overflow-hidden">
          <VisualTableLayoutSVG
            tableLayout={{
              tables: editedTemplate?.tables || template.tables,
              totalCapacity: (editedTemplate?.tables || template.tables).reduce((sum, t) => sum + t.capacity, 0)
            }}
            onUpdate={handleTableLayoutUpdate}
            onAddTable={(newTable) => {
              const updatedTables = [...(editedTemplate?.tables || template.tables), newTable];
              const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
              handleTableLayoutUpdate({ tables: updatedTables, totalCapacity });
            }}
            onAddVenueItem={(newVenueItem) => {
              const updatedTables = [...(editedTemplate?.tables || template.tables), newVenueItem];
              const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
              handleTableLayoutUpdate({ tables: updatedTables, totalCapacity });
            }}
            guestCount={0}
            guests={[]}
            onGuestAssignment={() => {}} // Not used in template mode
            onUpdateGuest={() => {}} // Not used in template mode
            onRotationUpdate={() => {}} // Not used in template mode
            onSeatedGuestClick={() => {}} // Not used in template mode
            guestColumns={[]}
            guestGroups={[]}
            onEditGroup={() => {}} // Not used in template mode
            profileImageUrl=""
            userName=""
            partnerName=""
            guestAssignments={{}}
            hideGuestSidebar={true} // Hide guest sidebar in template mode
          />
        </div>
      </div>
    </div>
  );
}
