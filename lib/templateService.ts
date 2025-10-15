import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs, 
  deleteDoc,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { TableType } from '@/types/seatingChart';

export interface TemplateTable extends TableType {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  tables: TemplateTable[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string; // Added for Firestore
}

/**
 * Utility function to remove undefined values from objects
 */
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    });
    return cleaned;
  }
  
  return obj;
};

/**
 * Save a template to Firestore using the same collection as seating charts
 * This avoids creating new indexes and leverages existing patterns
 */
export const saveTemplate = async (templateData: {
  name: string;
  description: string;
  tables: TemplateTable[];
}, userId: string): Promise<SavedTemplate> => {
  try {
    const templateDoc = cleanUndefinedValues({
      name: templateData.name,
      description: templateData.description,
      tables: templateData.tables,
      isTemplate: true, // Flag to distinguish from regular charts
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userId
    });

    // Store in the same collection as seating charts to avoid new indexes
    const docRef = await addDoc(collection(db, 'users', userId, 'seatingCharts'), templateDoc);
    
    return {
      id: docRef.id,
      name: templateData.name,
      description: templateData.description,
      tables: templateData.tables,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId
    };
  } catch (error) {
    console.error('Error saving template:', error);
    throw new Error('Failed to save template');
  }
};

/**
 * Get all templates for a user - optimized to avoid new indexes
 */
export const getTemplates = async (userId: string): Promise<SavedTemplate[]> => {
  try {
    // Query for templates only - this uses existing indexes since we're querying the same collection
    const q = query(
      collection(db, 'users', userId, 'seatingCharts'),
      where('isTemplate', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    const templates = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert timestamps to Date objects
      let createdAt = data.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (!(createdAt instanceof Date)) {
        createdAt = new Date();
      }
      
      let updatedAt = data.updatedAt;
      if (updatedAt?.toDate) {
        updatedAt = updatedAt.toDate();
      } else if (!(updatedAt instanceof Date)) {
        updatedAt = new Date();
      }
      
      // Clean tables to ensure no guest assignment data
      const cleanTables = data.tables.map((table: any) => ({
        ...table,
        guests: [],
        guestAssignments: {}
      }));

      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        tables: cleanTables,
        createdAt,
        updatedAt,
        userId: data.userId
      };
    }) as SavedTemplate[];
    
    // Sort by updatedAt in JavaScript to avoid Firestore index requirements
    return templates.sort((a, b) => {
      const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }
};

/**
 * Get a specific template by ID
 */
export const getTemplate = async (templateId: string, userId: string): Promise<SavedTemplate | null> => {
  try {
    const templateRef = doc(db, 'users', userId, 'seatingCharts', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (templateSnap.exists() && templateSnap.data().isTemplate) {
      const data = templateSnap.data();
      // Convert timestamps to Date objects
      let createdAt = data.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (!(createdAt instanceof Date)) {
        createdAt = new Date();
      }
      
      let updatedAt = data.updatedAt;
      if (updatedAt?.toDate) {
        updatedAt = updatedAt.toDate();
      } else if (!(updatedAt instanceof Date)) {
        updatedAt = new Date();
      }
      
      // Clean tables to ensure no guest assignment data
      const cleanTables = data.tables.map((table: any) => ({
        ...table,
        guests: [],
        guestAssignments: {}
      }));

      return {
        id: templateSnap.id,
        name: data.name,
        description: data.description,
        tables: cleanTables,
        createdAt,
        updatedAt,
        userId: data.userId
      } as SavedTemplate;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching template:', error);
    throw new Error('Failed to fetch template');
  }
};

/**
 * Update an existing template
 */
export const updateTemplate = async (templateId: string, updates: Partial<SavedTemplate>, userId: string): Promise<SavedTemplate | null> => {
  try {
    const templateRef = doc(db, 'users', userId, 'seatingCharts', templateId);
    await updateDoc(templateRef, cleanUndefinedValues({
      ...updates,
      updatedAt: Timestamp.now()
    }));
    
    // Return updated template
    const updatedSnap = await getDoc(templateRef);
    if (updatedSnap.exists()) {
      const data = updatedSnap.data();
      // Convert timestamps to Date objects
      let createdAt = data.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (!(createdAt instanceof Date)) {
        createdAt = new Date();
      }
      
      let updatedAt = data.updatedAt;
      if (updatedAt?.toDate) {
        updatedAt = updatedAt.toDate();
      } else if (!(updatedAt instanceof Date)) {
        updatedAt = new Date();
      }
      
      // Clean tables to ensure no guest assignment data
      const cleanTables = data.tables.map((table: any) => ({
        ...table,
        guests: [],
        guestAssignments: {}
      }));

      return {
        id: updatedSnap.id,
        name: data.name,
        description: data.description,
        tables: cleanTables,
        createdAt,
        updatedAt,
        userId: data.userId
      } as SavedTemplate;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (templateId: string, userId: string): Promise<boolean> => {
  try {
    const templateRef = doc(db, 'users', userId, 'seatingCharts', templateId);
    await deleteDoc(templateRef);
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
};

/**
 * Clean guest assignment data from existing templates in the database
 */
export const cleanExistingTemplates = async (userId: string): Promise<void> => {
  try {
    const templates = await getTemplates(userId);

    for (const template of templates) {
      const cleanTables = template.tables.map(table => ({
        ...table,
        guests: [],
        guestAssignments: {},
        // Fix sweetheart table width to 120px if it's the sweetheart table
        width: table.name === 'Sweetheart Table' ? 120 : table.width,
        height: table.name === 'Sweetheart Table' ? 60 : table.height
      }));

      await updateTemplate(template.id, { tables: cleanTables }, userId);
    }
  } catch (error) {
    console.error('Error cleaning existing templates:', error);
    throw new Error('Failed to clean existing templates');
  }
};

/**
 * Clone a template with a new name
 */
export const cloneTemplate = async (templateId: string, newName: string, userId: string): Promise<SavedTemplate | null> => {
  try {
    const originalTemplate = await getTemplate(templateId, userId);
    if (!originalTemplate) {
      return null;
    }

    // Create a new template with the same data but new ID and name
    const clonedTables: TemplateTable[] = originalTemplate.tables.map(table => ({
      ...table,
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    const clonedTemplate = await saveTemplate({
      name: newName,
      description: originalTemplate.description,
      tables: clonedTables
    }, userId);
    
    return clonedTemplate;
  } catch (error) {
    console.error('Error cloning template:', error);
    throw new Error('Failed to clone template');
  }
};