export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  website: string | null;
  avatarColor: string;
  userId: string;
  orderIndex?: number;
  isOfficial?: boolean;
  // New fields for vendor association
  placeId?: string | null; // Google Places ID for vendor association
  vendorEmails?: VendorEmail[]; // Multiple verified emails for this vendor
  isVendorContact?: boolean; // Flag to identify vendor contacts
}

export interface VendorEmail {
  email: string;
  verifiedBy: string; // User ID who verified this email
  verifiedAt: string; // ISO timestamp
  verificationMethod: 'manual' | 'smtp' | 'crowdsourced';
  isPrimary: boolean; // Primary contact email for this vendor
  contactName?: string; // Name of the person this email belongs to
  role?: string; // Role/title of the contact person
}

export interface GlobalVendorEmail {
  placeId: string;
  vendorName: string;
  vendorAddress: string;
  vendorCategory: string;
  emails: VendorEmail[];
  totalVerifications: number;
  lastUpdated: string;
  createdBy: string;
} 