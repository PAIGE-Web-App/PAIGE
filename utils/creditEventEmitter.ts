// Enhanced event emitter for credit updates with persistence
import { AIFeature } from '@/types/credits';

export type CreditEventData = {
  creditsBeforeDeduction: number;
  feature: AIFeature;
  requiredCredits: number;
} | undefined; // Allow undefined for generic emits

export type CreditUpdateEventData = {
  userId: string;
  credits: any; // UserCredits object
};

type CreditEventListener = (data?: CreditEventData | CreditUpdateEventData) => void;

class CreditEventEmitter {
  private listeners: CreditEventListener[] = [];
  private readonly STORAGE_KEY = 'creditUpdateEvent';
  private pendingEventData: CreditEventData | CreditUpdateEventData | undefined = undefined; // Store pending event data

          // Subscribe to credit updates
        subscribe(listener: CreditEventListener): () => void {
          this.listeners.push(listener);
          
          // Check for any pending events in localStorage
          this.checkPendingEvents();
          
          // Return unsubscribe function
          return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
              this.listeners.splice(index, 1);
            }
          };
        }

          // Emit credit update event
        emit(data?: CreditEventData | CreditUpdateEventData): void {
          // If there are listeners, call them immediately
          if (this.listeners.length > 0) {
            this.listeners.forEach((listener) => {
              try {
                listener(data);
              } catch (error) {
                console.error(`🎯 CreditEventEmitter: Error in listener:`, error);
              }
            });
          } else {
            // No listeners yet - store the event in localStorage for later
            this.pendingEventData = data; // Store the event data
            // Note: This will only work on client-side, server-side localStorage is not available
            if (typeof window !== 'undefined') {
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ 
                timestamp: Date.now().toString(), 
                data: data 
              }));
            }
          }
        }

          // Check for pending events in localStorage
        private checkPendingEvents(): void {
          if (typeof window === 'undefined') return;
          
          const pendingEvent = localStorage.getItem(this.STORAGE_KEY);
          
          if (pendingEvent) {
            localStorage.removeItem(this.STORAGE_KEY);
            
            // Parse the stored event data
            let storedData: CreditEventData = undefined;
            try {
              const parsed = JSON.parse(pendingEvent);
              storedData = parsed.data;
            } catch (e) {
              console.error('Error parsing pending event data from localStorage:', e);
            }
            
            // Trigger all listeners with the stored data
            this.listeners.forEach((listener) => {
              try {
                listener(storedData);
              } catch (error) {
                console.error(`🎯 CreditEventEmitter: Error in listener:`, error);
              }
            });
          }
        }
}

export const creditEventEmitter = new CreditEventEmitter();
