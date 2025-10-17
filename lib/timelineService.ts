import { adminDb } from '@/lib/firebaseAdmin';
import { WeddingTimeline, WeddingTimelineEvent, TimelineGenerationRequest } from '@/types/timeline';

export class TimelineService {
  private static instance: TimelineService;
  
  public static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService();
    }
    return TimelineService.instance;
  }

  /**
   * Get timeline for a user
   */
  async getTimeline(userId: string): Promise<WeddingTimeline | null> {
    try {
      const timelinesRef = adminDb.collection('users').doc(userId).collection('timelines');
      const snapshot = await timelinesRef
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const timelineDoc = snapshot.docs[0];
      const timelineData = timelineDoc.data();
      
      return {
        id: timelineDoc.id,
        ...timelineData,
        weddingDate: timelineData.weddingDate?.toDate ? timelineData.weddingDate.toDate() : new Date(timelineData.weddingDate),
        createdAt: timelineData.createdAt?.toDate ? timelineData.createdAt.toDate() : new Date(timelineData.createdAt),
        updatedAt: timelineData.updatedAt?.toDate ? timelineData.updatedAt.toDate() : new Date(timelineData.updatedAt),
        lastSynced: timelineData.lastSynced?.toDate ? timelineData.lastSynced.toDate() : null,
        events: (timelineData.events || []).map((event: any) => ({
          ...event,
          startTime: event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime),
          endTime: event.endTime?.toDate ? event.endTime.toDate() : new Date(event.endTime),
          createdAt: event.createdAt?.toDate ? event.createdAt.toDate() : new Date(event.createdAt),
          updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate() : new Date(event.updatedAt)
        }))
      } as WeddingTimeline;
    } catch (error) {
      console.error('Error getting timeline:', error);
      throw new Error('Failed to get timeline');
    }
  }

  /**
   * Get timeline by ID
   */
  async getTimelineById(userId: string, timelineId: string): Promise<WeddingTimeline | null> {
    try {
      const timelineDoc = await adminDb.collection('users').doc(userId).collection('timelines').doc(timelineId).get();
      
      if (!timelineDoc.exists) {
        return null;
      }
      
      const timelineData = timelineDoc.data();
      
      return {
        id: timelineDoc.id,
        ...timelineData,
        weddingDate: timelineData.weddingDate?.toDate ? timelineData.weddingDate.toDate() : new Date(timelineData.weddingDate),
        createdAt: timelineData.createdAt?.toDate ? timelineData.createdAt.toDate() : new Date(timelineData.createdAt),
        updatedAt: timelineData.updatedAt?.toDate ? timelineData.updatedAt.toDate() : new Date(timelineData.updatedAt),
        lastSynced: timelineData.lastSynced?.toDate ? timelineData.lastSynced.toDate() : null,
        events: (timelineData.events || []).map((event: any) => ({
          ...event,
          startTime: event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime),
          endTime: event.endTime?.toDate ? event.endTime.toDate() : new Date(event.endTime),
          createdAt: event.createdAt?.toDate ? event.createdAt.toDate() : new Date(event.createdAt),
          updatedAt: event.updatedAt?.toDate ? event.updatedAt.toDate() : new Date(event.updatedAt)
        }))
      } as WeddingTimeline;
    } catch (error) {
      console.error('Error getting timeline by ID:', error);
      throw new Error('Failed to get timeline');
    }
  }

  /**
   * Create a new timeline
   */
  async createTimeline(userId: string, timeline: Omit<WeddingTimeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeddingTimeline> {
    try {
      const now = new Date();
      const timelineData = {
        ...timeline,
        weddingDate: timeline.weddingDate,
        events: timeline.events,
        isActive: timeline.isActive,
        userId: userId,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await adminDb.collection('users').doc(userId).collection('timelines').add(timelineData);
      
      return {
        id: docRef.id,
        ...timelineData
      } as WeddingTimeline;
    } catch (error) {
      console.error('Error creating timeline:', error);
      throw new Error('Failed to create timeline');
    }
  }

  /**
   * Update timeline
   */
  async updateTimeline(userId: string, timelineId: string, updates: Partial<WeddingTimeline>): Promise<void> {
    try {
      const timelineRef = adminDb.collection('users').doc(userId).collection('timelines').doc(timelineId);
      
      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      // Ensure Date objects are properly formatted
      if (updates.events) {
        updateData.events = updates.events.map(event => ({
          ...event,
          startTime: event.startTime instanceof Date ? event.startTime : new Date(event.startTime),
          endTime: event.endTime instanceof Date ? event.endTime : new Date(event.endTime),
          createdAt: event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt),
          updatedAt: event.updatedAt instanceof Date ? event.updatedAt : new Date(event.updatedAt)
        }));
      }

      await timelineRef.update(updateData);
    } catch (error) {
      console.error('Error updating timeline:', error);
      throw new Error('Failed to update timeline');
    }
  }

  /**
   * Update a specific event in the timeline
   */
  async updateEvent(userId: string, timelineId: string, eventId: string, updates: Partial<WeddingTimelineEvent>): Promise<void> {
    try {
      console.log('TimelineService.updateEvent called with:', { userId, timelineId, eventId, updates });
      
      // First get the current timeline by ID
      console.log('Fetching timeline by ID...');
      const timeline = await this.getTimelineById(userId, timelineId);
      if (!timeline) {
        console.error('Timeline not found for ID:', timelineId);
        throw new Error('Timeline not found');
      }
      console.log('Timeline found with', timeline.events.length, 'events');

      // Sort events by start time to ensure proper order
      const sortedEvents = [...timeline.events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      console.log('Sorted events:', sortedEvents.map(e => ({ id: e.id, title: e.title, startTime: e.startTime })));
      
      // Find the index of the event being updated
      const eventIndex = sortedEvents.findIndex(event => event.id === eventId);
      if (eventIndex === -1) {
        console.error('Event not found with ID:', eventId);
        console.error('Available event IDs:', sortedEvents.map(e => e.id));
        throw new Error('Event not found');
      }
      console.log('Event found at index:', eventIndex);

      // Update the specific event
      const updatedEvent = { 
        ...sortedEvents[eventIndex], 
        ...updates, 
        updatedAt: new Date(),
        // Ensure date fields are Date objects
        startTime: updates.startTime ? new Date(updates.startTime) : sortedEvents[eventIndex].startTime,
        endTime: updates.endTime ? new Date(updates.endTime) : sortedEvents[eventIndex].endTime
      };
      sortedEvents[eventIndex] = updatedEvent;
      console.log('Event updated:', updatedEvent);

      // If buffer time, start time, or duration was updated, recalculate subsequent events
      if (updates.bufferTime !== undefined || updates.startTime !== undefined || updates.duration !== undefined) {
        console.log('Time-related update detected, recalculating subsequent events...');
        // Recalculate all events after the updated one
        for (let i = eventIndex + 1; i < sortedEvents.length; i++) {
          const previousEvent = sortedEvents[i - 1];
          const currentEvent = sortedEvents[i];
          
          // Calculate new start time based on previous event's end time + buffer time
          const previousEndTime = previousEvent.endTime.getTime();
          const bufferTimeMs = (previousEvent.bufferTime || 15) * 60 * 1000;
          const newStartTime = new Date(previousEndTime + bufferTimeMs);
          
          // Calculate new end time based on current duration
          const newEndTime = new Date(newStartTime.getTime() + currentEvent.duration * 60 * 1000);
          
          console.log(`Recalculating event ${i}: ${currentEvent.title}`);
          console.log(`  Previous end time: ${previousEvent.endTime}`);
          console.log(`  Buffer time: ${previousEvent.bufferTime} minutes`);
          console.log(`  New start time: ${newStartTime}`);
          console.log(`  New end time: ${newEndTime}`);
          
          // Update the event with new times
          sortedEvents[i] = {
            ...currentEvent,
            startTime: newStartTime,
            endTime: newEndTime,
            updatedAt: new Date()
          };
        }
      }

      // Update the timeline with the modified events
      console.log('Updating timeline with modified events...');
      await this.updateTimeline(userId, timelineId, { events: sortedEvents });
      console.log('Timeline updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      console.error('Error stack:', (error as Error).stack);
      throw new Error('Failed to update event');
    }
  }

  /**
   * Delete timeline
   */
  async deleteTimeline(userId: string, timelineId: string): Promise<void> {
    try {
      await adminDb.collection('users').doc(userId).collection('timelines').doc(timelineId).delete();
    } catch (error) {
      console.error('Error deleting timeline:', error);
      throw new Error('Failed to delete timeline');
    }
  }

  /**
   * Get wedding day todos for timeline generation
   */
  async getWeddingDayTodos(userId: string): Promise<any[]> {
    try {
      const snapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('todoItems')
        .where('planningPhase', '==', 'Wedding Day')
        .orderBy('createdAt', 'asc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting wedding day todos:', error);
      return [];
    }
  }

  /**
   * Get vendor information for timeline generation
   */
  async getVendors(userId: string): Promise<any[]> {
    try {
      const snapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('contacts')
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting vendors:', error);
      return [];
    }
  }

  /**
   * Generate timeline events from todos and vendors
   */
  generateTimelineEvents(
    weddingDayTodos: any[], 
    vendors: any[], 
    weddingDate: Date,
    weddingLocation: string
  ): WeddingTimelineEvent[] {
    const events: WeddingTimelineEvent[] = [];
    
    // Create vendor lookup map
    const vendorMap = new Map(vendors.map(vendor => [vendor.category, vendor]));
    
    // Default timeline structure
    const defaultTimeline = [
      {
        title: 'Vendor Setup Begins',
        description: 'Vendors arrive and begin setup',
        category: 'setup',
        startHour: 6,
        duration: 120,
        isCritical: true,
        location: weddingLocation
      },
      {
        title: 'Hair & Makeup',
        description: 'Bride and wedding party hair and makeup',
        category: 'beauty',
        startHour: 8,
        duration: 180,
        isCritical: true,
        location: 'Getting Ready Location'
      },
      {
        title: 'Photographer Arrives',
        description: 'Getting ready photos and detail shots',
        category: 'photography',
        startHour: 9,
        duration: 240,
        isCritical: true,
        location: 'Getting Ready Location'
      },
      {
        title: 'Ceremony Setup',
        description: 'Final ceremony preparation and guest seating',
        category: 'ceremony',
        startHour: 11,
        duration: 60,
        isCritical: true,
        location: weddingLocation
      },
      {
        title: 'Ceremony',
        description: 'Wedding ceremony',
        category: 'ceremony',
        startHour: 12,
        duration: 60,
        isCritical: true,
        location: weddingLocation
      },
      {
        title: 'Cocktail Hour',
        description: 'Cocktail hour and photos',
        category: 'reception',
        startHour: 13,
        duration: 60,
        isCritical: true,
        location: weddingLocation
      },
      {
        title: 'Reception',
        description: 'Dinner and dancing',
        category: 'reception',
        startHour: 14,
        duration: 240,
        isCritical: true,
        location: weddingLocation
      }
    ];

    // Convert todos to timeline events with proper buffer time calculation
    weddingDayTodos.forEach((todo, index) => {
      const vendor = todo.category ? vendorMap.get(todo.category) : null;
      
      let startTime: Date;
      if (index === 0) {
        // First event starts at 6 AM
        startTime = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate(), 6, 0);
      } else {
        // Subsequent events start after previous event's end time + buffer time
        const previousEvent = events[index - 1];
        const previousEndTime = previousEvent.endTime.getTime();
        const bufferTimeMs = (previousEvent.bufferTime || 15) * 60 * 1000;
        startTime = new Date(previousEndTime + bufferTimeMs);
      }
      
      const endTime = new Date(startTime.getTime() + 60 * 60000); // 60 minutes duration
      
      events.push({
        id: `event-${todo.id}`,
        title: todo.name,
        description: todo.note || '',
        startTime,
        endTime,
        duration: 60,
        location: weddingLocation,
        vendorId: vendor?.id,
        vendorName: vendor?.name || todo.category,
        vendorContact: vendor?.phone || vendor?.email,
        category: todo.category,
        bufferTime: 15,
        isCritical: todo.category === 'photography' || todo.category === 'ceremony',
        status: 'pending',
        todoId: todo.id,
        notes: todo.note,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Add default timeline events if no todos exist, with proper buffer time calculation
    if (events.length === 0) {
      defaultTimeline.forEach((item, index) => {
        let startTime: Date;
        if (index === 0) {
          // First event starts at the specified hour
          startTime = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate(), item.startHour, 0);
        } else {
          // Subsequent events start after previous event's end time + buffer time
          const previousEvent = events[index - 1];
          const previousEndTime = previousEvent.endTime.getTime();
          const bufferTimeMs = (previousEvent.bufferTime || 15) * 60 * 1000;
          startTime = new Date(previousEndTime + bufferTimeMs);
        }
        
        const endTime = new Date(startTime.getTime() + item.duration * 60000);
        
        events.push({
          id: `default-${index}`,
          title: item.title,
          description: item.description,
          startTime,
          endTime,
          duration: item.duration,
          location: item.location,
          category: item.category,
          bufferTime: 15,
          isCritical: item.isCritical,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
}

export const timelineService = TimelineService.getInstance();
