# Vendor Email Association Feature

This feature allows users to associate real email addresses with vendors, creating a crowdsourced database of verified vendor contact information.

## Overview

The vendor email association system enables:
- **Crowdsourced Email Database**: Users can contribute verified email addresses for vendors
- **Improved Contact Success**: Future users can reach vendors using verified emails instead of guessing
- **Community Verification**: Multiple users can verify and rate email addresses
- **Primary Email Selection**: Users can mark the most reliable email as primary

## How It Works

### 1. Adding Vendor Associations
When creating or editing contacts, users can:
- Search for vendors using the vendor search field
- Associate their contact with a specific vendor
- Add verified email addresses to the global vendor database

### 2. Global Vendor Email Database
- Stored in Firestore collection: `vendorEmails`
- Keyed by Google Places `place_id`
- Contains multiple verified emails per vendor
- Tracks verification method and user contributions

### 3. Vendor Contact Flow
When contacting vendors:
1. **First Priority**: Use verified emails from the global database
2. **Fallback**: Use SMTP verification to find working emails
3. **Last Resort**: Open vendor website for manual contact

## Data Structure

### Global Vendor Email Document
```typescript
{
  placeId: string;
  vendorName: string;
  vendorAddress: string;
  vendorCategory: string;
  emails: VendorEmail[];
  totalVerifications: number;
  lastUpdated: string;
  createdBy: string;
}
```

### Vendor Email Object
```typescript
{
  email: string;
  verifiedBy: string; // User ID
  verifiedAt: string; // ISO timestamp
  verificationMethod: 'manual' | 'smtp' | 'crowdsourced';
  isPrimary: boolean;
  contactName?: string;
  role?: string;
}
```

## API Endpoints

### GET `/api/vendor-emails?placeId={placeId}`
Retrieve all verified emails for a vendor

### POST `/api/vendor-emails`
Add a new email association to a vendor

### PUT `/api/vendor-emails`
Update email association (e.g., mark as primary)

### DELETE `/api/vendor-emails?placeId={placeId}&email={email}&userId={userId}`
Remove an email association

## UI Components

### VendorSearchField
- Search and select vendors from Google Places
- Autocomplete with vendor details
- Keyboard navigation support

### VendorEmailAssociationModal
- Manage email associations for a vendor
- Add/remove email addresses
- Mark emails as primary
- View verification history

### VendorEmailBadge
- Display verified email status in vendor catalog
- Shows primary email and count of additional emails
- Green badge with star icon for verified vendors

## Usage Examples

### Adding Vendor Association During Contact Creation
1. Open "Add Contact" modal
2. Fill in contact details
3. Use vendor search to find and select vendor
4. Save contact (vendor association is stored)
5. Optionally manage email associations

### Managing Vendor Emails
1. Click "Manage Emails" button in vendor association section
2. View existing verified emails
3. Add new email addresses with contact details
4. Mark preferred email as primary
5. Remove outdated or incorrect emails

### Contacting Vendors with Verified Emails
1. Browse vendor catalog
2. Look for green email badges indicating verified emails
3. Click "Contact" to send email
4. System automatically uses verified email if available
5. Toast message shows email source (Community verified vs SMTP verified)

## Benefits

### For Users
- **Higher Success Rate**: Verified emails are more likely to reach vendors
- **Time Savings**: No need to guess email addresses
- **Community Trust**: Emails verified by other users

### For Vendors
- **Better Inquiries**: More professional contact attempts
- **Reduced Spam**: Verified email addresses reduce false positives
- **Improved Response**: Users more likely to follow up with verified contacts

### For the Platform
- **Data Quality**: Crowdsourced verification improves email database
- **User Engagement**: Community contribution increases platform value
- **Scalability**: System improves with more user contributions

## Future Enhancements

- **Email Verification Workflow**: Automated email verification process
- **Vendor Response Tracking**: Track which emails get responses
- **Email Quality Scoring**: Rate emails based on response success
- **Bulk Email Association**: Import multiple vendor emails at once
- **Vendor Dashboard**: Allow vendors to manage their contact information 