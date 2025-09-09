// Enhanced event emitter for credit updates with persistence
type CreditEventListener = () => void;

class CreditEventEmitter {
  private listeners: CreditEventListener[] = [];
  private readonly STORAGE_KEY = 'creditUpdateEvent';

          // Subscribe to credit updates
        subscribe(listener: CreditEventListener): () => void {
          this.listeners.push(listener);
          
          // Check for any pending events in localStorage
          console.log(`🎯 CreditEventEmitter: Subscribing, checking for pending events...`);
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
        emit(): void {
          console.log(`🎯 CreditEventEmitter: Emitting event to ${this.listeners.length} listeners`);
          
          // If there are listeners, call them immediately
          if (this.listeners.length > 0) {
            this.listeners.forEach((listener, index) => {
              try {
                console.log(`🎯 CreditEventEmitter: Calling listener ${index + 1}`);
                listener();
              } catch (error) {
                console.error(`🎯 CreditEventEmitter: Error in listener ${index + 1}:`, error);
              }
            });
          } else {
            // No listeners yet - store the event in localStorage for later
            console.log(`🎯 CreditEventEmitter: No listeners, storing event in localStorage`);
            // Note: This will only work on client-side, server-side localStorage is not available
            if (typeof window !== 'undefined') {
              localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
              console.log(`🎯 CreditEventEmitter: Event stored in localStorage with key: ${this.STORAGE_KEY}`);
            } else {
              console.log(`🎯 CreditEventEmitter: Cannot store in localStorage - running on server side`);
            }
          }
        }

          // Check for pending events in localStorage
        private checkPendingEvents(): void {
          if (typeof window === 'undefined') return;
          
          const pendingEvent = localStorage.getItem(this.STORAGE_KEY);
          console.log(`🎯 CreditEventEmitter: Checking localStorage for key '${this.STORAGE_KEY}':`, pendingEvent);
          
          if (pendingEvent) {
            console.log(`🎯 CreditEventEmitter: Found pending event, triggering listeners`);
            localStorage.removeItem(this.STORAGE_KEY);
            
            // Trigger all listeners
            this.listeners.forEach((listener, index) => {
              try {
                console.log(`🎯 CreditEventEmitter: Calling listener ${index + 1} for pending event`);
                listener();
              } catch (error) {
                console.error(`🎯 CreditEventEmitter: Error in listener ${index + 1}:`, error);
              }
            });
          } else {
            console.log(`🎯 CreditEventEmitter: No pending events found`);
          }
        }
}

export const creditEventEmitter = new CreditEventEmitter();
