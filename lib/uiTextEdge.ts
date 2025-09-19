/**
 * UI Text Edge Config Service
 * Safely manages UI text and messaging in Edge Config with fallback
 */

import { getEdgeConfig } from './edgeConfig';

// Default UI text (fallback data)
const DEFAULT_UI_TEXT = {
  messages: {
    emptyState: {
      title: "Cheers to your next chapter!",
      description: "Add contacts to manage communication in one place. Paige scans messages to create/update to-dos and generates personalized email drafts. Connect Gmail for best results!",
      cta: "Set up your Unified Inbox",
      alternativeCta: "Check out the Vendor Catalog"
    },
    errors: {
      insufficientCredits: "Oops you don't have enough credits",
      rateLimit: "Too many requests, please wait a moment",
      genericError: "Something went wrong. Please try again.",
      networkError: "Network error. Please check your connection."
    },
    success: {
      saved: "Saved successfully!",
      created: "Created successfully!",
      updated: "Updated successfully!",
      deleted: "Deleted successfully!"
    },
    validation: {
      required: "This field is required",
      email: "Please enter a valid email address",
      minLength: "Must be at least {min} characters",
      maxLength: "Must be no more than {max} characters",
      invalidDate: "Please enter a valid date"
    }
  },
  buttons: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    update: "Update",
    close: "Close",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    retry: "Retry"
  },
  labels: {
    loading: "Loading...",
    noData: "No data available",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    view: "View",
    settings: "Settings"
  },
  tooltips: {
    help: "Click for help",
    info: "More information",
    warning: "Warning",
    error: "Error occurred"
  }
};

/**
 * Get UI text from Edge Config with fallback
 */
export async function getUIText() {
  try {
    const uiText = await getEdgeConfig('uiText', DEFAULT_UI_TEXT);
    
    // Validate the data structure
    if (uiText && typeof uiText === 'object') {
      return uiText;
    }
    
    console.warn('Invalid UI text from Edge Config, using fallback');
    return DEFAULT_UI_TEXT;
  } catch (error) {
    console.error('Error getting UI text from Edge Config:', error);
    return DEFAULT_UI_TEXT;
  }
}

/**
 * Get specific UI text by path (e.g., 'messages.emptyState.title')
 */
export async function getUITextByPath(path: string, fallback: string = ''): Promise<string> {
  try {
    const uiText = await getUIText();
    const keys = path.split('.');
    let value = uiText;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return fallback;
      }
    }
    
    return typeof value === 'string' ? value : fallback;
  } catch (error) {
    console.error(`Error getting UI text for path ${path}:`, error);
    return fallback;
  }
}

/**
 * Get UI text with variable substitution
 */
export async function getUITextWithVars(path: string, variables: Record<string, string | number> = {}, fallback: string = ''): Promise<string> {
  try {
    let text = await getUITextByPath(path, fallback);
    
    // Replace variables in the format {variableName}
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    
    return text;
  } catch (error) {
    console.error(`Error getting UI text with variables for path ${path}:`, error);
    return fallback;
  }
}
