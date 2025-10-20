/**
 * Safe Storage Wrapper
 * 
 * Provides graceful fallbacks for localStorage/sessionStorage that may be blocked
 * in Safari Private Browsing, Firefox Strict Privacy, or other restricted environments.
 * 
 * Features:
 * - Automatic fallback to in-memory storage when browser storage is unavailable
 * - Consistent API across all browsers
 * - No crashes or errors in private browsing modes
 * - TypeScript support
 */

import { isStorageAvailable } from './browserCompat';

// In-memory fallback storage
class MemoryStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }
}

// Singleton instances for fallback storage
const memoryLocalStorage = new MemoryStorage();
const memorySessionStorage = new MemoryStorage();

/**
 * Safe localStorage wrapper with automatic fallback
 */
export const safeLocalStorage = {
  /**
   * Get item from localStorage (returns null if unavailable)
   */
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      if (isStorageAvailable('localStorage')) {
        return localStorage.getItem(key);
      }

      // Fallback to memory storage
      return memoryLocalStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed, using fallback:', error);
      return memoryLocalStorage.getItem(key);
    }
  },

  /**
   * Set item in localStorage (silently falls back to memory if unavailable)
   */
  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      if (isStorageAvailable('localStorage')) {
        localStorage.setItem(key, value);
        return true;
      }

      // Fallback to memory storage
      memoryLocalStorage.setItem(key, value);
      return false; // Return false to indicate fallback was used
    } catch (error) {
      console.warn('localStorage.setItem failed, using fallback:', error);
      memoryLocalStorage.setItem(key, value);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if (isStorageAvailable('localStorage')) {
        localStorage.removeItem(key);
      }

      // Also remove from memory fallback
      memoryLocalStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
      memoryLocalStorage.removeItem(key);
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if (isStorageAvailable('localStorage')) {
        localStorage.clear();
      }

      // Also clear memory fallback
      memoryLocalStorage.clear();
    } catch (error) {
      console.warn('localStorage.clear failed:', error);
      memoryLocalStorage.clear();
    }
  },

  /**
   * Check if localStorage is actually available (not using fallback)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && isStorageAvailable('localStorage');
  },

  /**
   * Get the number of items in storage
   */
  get length(): number {
    try {
      if (typeof window === 'undefined') {
        return 0;
      }

      if (isStorageAvailable('localStorage')) {
        return localStorage.length;
      }

      return memoryLocalStorage.length;
    } catch (error) {
      return memoryLocalStorage.length;
    }
  },

  /**
   * Get key at index
   */
  key(index: number): string | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      if (isStorageAvailable('localStorage')) {
        return localStorage.key(index);
      }

      return memoryLocalStorage.key(index);
    } catch (error) {
      return memoryLocalStorage.key(index);
    }
  },
};

/**
 * Safe sessionStorage wrapper with automatic fallback
 */
export const safeSessionStorage = {
  /**
   * Get item from sessionStorage (returns null if unavailable)
   */
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      if (isStorageAvailable('sessionStorage')) {
        return sessionStorage.getItem(key);
      }

      // Fallback to memory storage
      return memorySessionStorage.getItem(key);
    } catch (error) {
      console.warn('sessionStorage.getItem failed, using fallback:', error);
      return memorySessionStorage.getItem(key);
    }
  },

  /**
   * Set item in sessionStorage (silently falls back to memory if unavailable)
   */
  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.setItem(key, value);
        return true;
      }

      // Fallback to memory storage
      memorySessionStorage.setItem(key, value);
      return false; // Return false to indicate fallback was used
    } catch (error) {
      console.warn('sessionStorage.setItem failed, using fallback:', error);
      memorySessionStorage.setItem(key, value);
      return false;
    }
  },

  /**
   * Remove item from sessionStorage
   */
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.removeItem(key);
      }

      // Also remove from memory fallback
      memorySessionStorage.removeItem(key);
    } catch (error) {
      console.warn('sessionStorage.removeItem failed:', error);
      memorySessionStorage.removeItem(key);
    }
  },

  /**
   * Clear all items from sessionStorage
   */
  clear(): void {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      if (isStorageAvailable('sessionStorage')) {
        sessionStorage.clear();
      }

      // Also clear memory fallback
      memorySessionStorage.clear();
    } catch (error) {
      console.warn('sessionStorage.clear failed:', error);
      memorySessionStorage.clear();
    }
  },

  /**
   * Check if sessionStorage is actually available (not using fallback)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && isStorageAvailable('sessionStorage');
  },

  /**
   * Get the number of items in storage
   */
  get length(): number {
    try {
      if (typeof window === 'undefined') {
        return 0;
      }

      if (isStorageAvailable('sessionStorage')) {
        return sessionStorage.length;
      }

      return memorySessionStorage.length;
    } catch (error) {
      return memorySessionStorage.length;
    }
  },

  /**
   * Get key at index
   */
  key(index: number): string | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      if (isStorageAvailable('sessionStorage')) {
        return sessionStorage.key(index);
      }

      return memorySessionStorage.key(index);
    } catch (error) {
      return memorySessionStorage.key(index);
    }
  },
};

/**
 * Helper functions for common storage patterns
 */

/**
 * Safely get and parse JSON from storage
 */
export function getStorageJSON<T>(key: string, storageType: 'local' | 'session' = 'local'): T | null {
  try {
    const storage = storageType === 'local' ? safeLocalStorage : safeSessionStorage;
    const item = storage.getItem(key);
    
    if (!item) {
      return null;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON from storage for key "${key}":`, error);
    return null;
  }
}

/**
 * Safely set JSON in storage
 */
export function setStorageJSON<T>(key: string, value: T, storageType: 'local' | 'session' = 'local'): boolean {
  try {
    const storage = storageType === 'local' ? safeLocalStorage : safeSessionStorage;
    const jsonString = JSON.stringify(value);
    return storage.setItem(key, jsonString);
  } catch (error) {
    console.warn(`Failed to stringify and store JSON for key "${key}":`, error);
    return false;
  }
}

/**
 * Check if browser storage is available and working
 */
export function checkStorageHealth(): {
  localStorage: boolean;
  sessionStorage: boolean;
  usingFallback: boolean;
} {
  return {
    localStorage: safeLocalStorage.isAvailable(),
    sessionStorage: safeSessionStorage.isAvailable(),
    usingFallback: !safeLocalStorage.isAvailable() || !safeSessionStorage.isAvailable(),
  };
}

