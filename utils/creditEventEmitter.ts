// Simple event emitter for credit updates
type CreditEventListener = () => void;

class CreditEventEmitter {
  private listeners: CreditEventListener[] = [];

  // Subscribe to credit updates
  subscribe(listener: CreditEventListener): () => void {
    this.listeners.push(listener);
    
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
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in credit event listener:', error);
      }
    });
  }
}

export const creditEventEmitter = new CreditEventEmitter();
