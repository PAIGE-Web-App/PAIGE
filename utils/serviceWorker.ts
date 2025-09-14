/**
 * Service Worker Registration and Management
 * Handles service worker lifecycle and cache management
 */

import React from 'react';

interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: ServiceWorkerMessage): Promise<void> {
    if (!this.registration?.active) {
      console.warn('Service Worker not active');
      return;
    }

    try {
      this.registration.active.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to Service Worker:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    await this.sendMessage({ type: 'CLEAR_CACHE' });
  }

  /**
   * Cache vendor data proactively
   */
  async cacheVendorData(vendorData: any): Promise<void> {
    await this.sendMessage({
      type: 'CACHE_VENDOR_DATA',
      data: { vendorData }
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    if (!this.isSupported) return null;

    try {
      const cacheNames = await caches.keys();
      const stats = {
        totalCaches: cacheNames.length,
        cacheNames,
        estimatedSize: 0
      };

      // Estimate cache size (rough calculation)
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats.estimatedSize += keys.length * 50; // Rough estimate
      }

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Check if service worker is controlling the page
   */
  isControlled(): boolean {
    return !!navigator.serviceWorker.controller;
  }

  /**
   * Notify user that update is available
   */
  private notifyUpdateAvailable(): void {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Update service worker
   */
  async update(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Hook for React components
export function useServiceWorker() {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [isControlled, setIsControlled] = React.useState(false);

  React.useEffect(() => {
    const checkSupport = () => {
      const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setIsControlled(serviceWorkerManager.isControlled());
        
        // Register service worker
        serviceWorkerManager.register().then(setIsRegistered);
      }
    };

    checkSupport();

    // Listen for service worker updates
    const handleUpdate = () => {
      console.log('Service Worker update available');
      // You can show a notification to the user here
    };

    window.addEventListener('sw-update-available', handleUpdate);
    
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  return {
    isSupported,
    isRegistered,
    isControlled,
    clearCaches: () => serviceWorkerManager.clearCaches(),
    cacheVendorData: (vendorData: any) => serviceWorkerManager.cacheVendorData(vendorData),
    getCacheStats: () => serviceWorkerManager.getCacheStats(),
    update: () => serviceWorkerManager.update()
  };
}

// Auto-register service worker in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  serviceWorkerManager.register();
}
