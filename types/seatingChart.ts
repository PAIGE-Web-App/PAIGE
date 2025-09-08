export interface Guest {
  id: string;
  fullName: string;
  mealPreference?: string;
  relationship?: string;
  notes?: string; // AI-generated notes for seating recommendations
  // Dynamic custom fields
  customFields: Record<string, string>;
  // Legacy fields for backward compatibility
  tableId?: string | null;
  seatNumber?: number | null;
  // Guest management
  isRemovable?: boolean; // Whether this guest can be removed
  groupIds?: string[]; // IDs of the groups this guest belongs to (supports multiple groups)
  // Legacy field for backward compatibility
  groupId?: string; // Deprecated: use groupIds instead
}

export interface GuestColumn {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[]; // For select type
  isRequired: boolean;
  isEditable: boolean;
  isRemovable: boolean;
  order: number;
  width?: number; // Column width in pixels
  // Inline editing support
  isEditing?: boolean;
  editingLabel?: string;
}

export interface Table {
  id: string;
  name: string;
  type: 'round' | 'long' | 'oval' | 'square';
  capacity: number;
  position: { x: number; y: number };
  guests: string[]; // Guest IDs
  isActive: boolean;
}

export interface SeatingChart {
  id: string;
  name: string;
  eventType: string;
  description?: string;
  venueName?: string;
  venueImage?: string;
  guestCount: number;
  tableCount: number;
  tables: Table[];
  guests: Guest[];
  seatingRules: SeatingRule[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isTemplate: boolean;
}

export interface SeatingRule {
  id: string;
  name: string;
  description: string;
  type: 'group_together' | 'keep_apart' | 'preferred_table' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
  guestIds: string[];
  tableIds?: string[];
  isActive: boolean;
}

export interface TableType {
  id: string;
  name: string;
  type: 'round' | 'long' | 'oval' | 'square';
  capacity: number;
  description: string;
  isDefault: boolean;
  rotation?: number; // Rotation in degrees (0-360)
}

export interface GuestGroup {
  id: string;
  name: string;
  type: 'couple' | 'family' | 'extended' | 'friends' | 'other';
  guestIds: string[];
  color?: string;
  description?: string;
  createdAt: Date;
}

export interface SeatingSuggestion {
  id: string;
  description: string;
  reasoning: string;
  guestAssignments: Array<{
    guestId: string;
    tableId: string;
    seatNumber: number;
  }>;
  confidence: number; // 0-1
  isApplied: boolean;
}

export interface CSVUploadResult {
  success: boolean;
  guests: Guest[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  processedRows: number;
}

// Default table types
export const DEFAULT_TABLE_TYPES: TableType[] = [
  {
    id: 'round-8',
    name: 'Round Table (8 seats)',
    type: 'round',
    capacity: 8,
    description: 'Standard round table for 8 guests',
    isDefault: true
  },
  {
    id: 'round-10',
    name: 'Round Table (10 seats)',
    type: 'round',
    capacity: 10,
    description: 'Large round table for 10 guests',
    isDefault: true
  },
  {
    id: 'long-6',
    name: 'Long Table (6 seats)',
    type: 'long',
    capacity: 6,
    description: 'Long banquet table for 6 guests',
    isDefault: true
  },
  {
    id: 'long-8',
    name: 'Long Table (8 seats)',
    type: 'long',
    capacity: 8,
    description: 'Long banquet table for 8 guests',
    isDefault: true
  },
  {
    id: 'oval-10',
    name: 'Oval Table (10 seats)',
    type: 'oval',
    capacity: 10,
    description: 'Elegant oval table for 10 guests',
    isDefault: false
  },
  {
    id: 'square-4',
    name: 'Square Table (4 seats)',
    type: 'square',
    capacity: 4,
    description: 'Intimate square table for 4 guests',
    isDefault: false
  }
];

// Default event types
export const DEFAULT_EVENT_TYPES = [
  'Wedding Reception',
  'Cocktail Hour',
  'Rehearsal Dinner',
  'Wedding Ceremony',
  'Brunch',
  'After Party',
  'Engagement Party',
  'Shower',
  'Other'
];

// Guest attribute options for grouping
export const GUEST_ATTRIBUTES = {
  familyGroups: ['Bride Family', 'Groom Family', 'Bride Extended', 'Groom Extended', 'Mixed Family'],
  friendGroups: ['Bride Friends', 'Groom Friends', 'Mutual Friends', 'College Friends', 'High School Friends'],
  workGroups: ['Bride Work', 'Groom Work', 'Mutual Work'],
  dietaryRestrictions: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher', 'None'],
  rsvpStatuses: ['pending', 'confirmed', 'declined']
};
