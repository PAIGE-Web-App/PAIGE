export interface WeddingTimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  vendorId?: string;
  vendorName?: string;
  vendorContact?: string;
  location: string;
  description: string;
  assignedTo?: string; // wedding party member
  bufferTime: number; // in minutes
  isCritical: boolean; // can't be moved
  dependencies?: string[]; // other event IDs this depends on
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  todoId?: string; // link to original todo item
  category?: string; // vendor category
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isNew?: boolean; // flag for animation
}

export interface WeddingTimeline {
  id: string;
  userId: string;
  name: string;
  weddingDate: Date;
  events: WeddingTimelineEvent[];
  isActive: boolean;
  lastSynced?: Date;
  calendarId?: string; // Google Calendar ID
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineGenerationRequest {
  weddingDate: string;
  weddingLocation: string;
  guestCount: number;
  venueType: string;
  ceremonyTime: string;
  receptionTime: string;
  vendorIds: string[];
  customRequirements?: string[];
}

export interface TimelineGenerationResponse {
  success: boolean;
  timeline: WeddingTimelineEvent[];
  suggestions: string[];
  warnings: string[];
  estimatedDuration: number;
}

export interface TimelineSyncStatus {
  isLinked: boolean;
  calendarId?: string;
  lastSynced?: Date;
  syncEnabled: boolean;
  weddingPartyMembers: string[];
}

export interface VendorTimelineRequirement {
  vendorId: string;
  vendorName: string;
  category: string;
  setupTime: number; // minutes
  breakdownTime: number; // minutes
  arrivalBuffer: number; // minutes before event
  contactInfo: {
    phone?: string;
    email?: string;
    contactName?: string;
  };
  specialRequirements?: string[];
}

export interface TimelineNotification {
  id: string;
  eventId: string;
  recipientId: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  notificationType: 'sms' | 'email' | 'push';
  scheduledTime: Date;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
}

export interface TimelineStatusUpdate {
  eventId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  updatedBy: string;
  updatedAt: Date;
  notes?: string;
  delayReason?: string;
  newEstimatedTime?: Date;
}
