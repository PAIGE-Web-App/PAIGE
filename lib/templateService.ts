import { TableType } from '@/types/seatingChart';

export interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tables: TableType[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'seating-chart-templates';

export const saveTemplate = (templateData: {
  name: string;
  description: string;
  tables: TableType[];
}): SavedTemplate => {
  const template: SavedTemplate = {
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: templateData.name,
    description: templateData.description,
    category: 'custom', // Default category
    tables: templateData.tables,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Get existing templates
  const existingTemplates = getTemplates();
  
  // Add new template
  const updatedTemplates = [...existingTemplates, template];
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
  
  return template;
};

export const getTemplates = (): SavedTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const templates = JSON.parse(stored);
      // Convert date strings back to Date objects
      return templates.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      }));
    }
  } catch (error) {
    console.warn('Failed to load templates from localStorage:', error);
  }
  
  return [];
};

export const deleteTemplate = (templateId: string): boolean => {
  try {
    const templates = getTemplates();
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
    return true;
  } catch (error) {
    console.warn('Failed to delete template:', error);
    return false;
  }
};

export const updateTemplate = (templateId: string, updates: Partial<SavedTemplate>): SavedTemplate | null => {
  try {
    const templates = getTemplates();
    const templateIndex = templates.findIndex(t => t.id === templateId);
    
    if (templateIndex === -1) {
      return null;
    }
    
    const updatedTemplate = {
      ...templates[templateIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    templates[templateIndex] = updatedTemplate;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    
    return updatedTemplate;
  } catch (error) {
    console.warn('Failed to update template:', error);
    return null;
  }
};

export const getTemplate = (templateId: string): SavedTemplate | null => {
  const templates = getTemplates();
  return templates.find(t => t.id === templateId) || null;
};

export const cloneTemplate = (templateId: string, newName: string): SavedTemplate | null => {
  try {
    const originalTemplate = getTemplate(templateId);
    if (!originalTemplate) {
      return null;
    }

    // Create a new template with the same data but new ID and name
    const clonedTemplate: SavedTemplate = {
      ...originalTemplate,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      tables: originalTemplate.tables.map(table => ({
        ...table,
        id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    };

    // Save the cloned template
    const templates = getTemplates();
    const updatedTemplates = [...templates, clonedTemplate];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
    
    return clonedTemplate;
  } catch (error) {
    console.warn('Failed to clone template:', error);
    return null;
  }
};
