# Vendor Email Management System

## Overview

The vendor email management system provides a comprehensive solution for maintaining data quality in the crowdsourced vendor email database. It includes user-facing tools for editing and flagging emails, as well as admin tools for reviewing and resolving flagged emails.

## Key Features

### 1. **User Email Management**
- **Edit Emails**: Users can update contact names, roles, and mark emails as primary
- **Flag Emails**: Users can flag incorrect or outdated emails for community review
- **Remove Emails**: Users can delete clearly wrong emails (with confirmation)

### 2. **Admin Review System**
- **Review Flagged Emails**: Admins can review all flagged emails
- **Approve/Reject Flags**: Admins can approve valid flags or reject invalid ones
- **Immediate Removal**: Admins can immediately remove emails for obvious spam

### 3. **Data Quality Safeguards**
- **Verification Methods**: Track how emails were verified (SMTP, manual, crowdsourced)
- **Flag Tracking**: Count and track flags per email
- **Audit Trail**: Full history of who added, edited, flagged, and reviewed emails

## User Interface

### Vendor Contact Modal
- **Manage Button**: Appears when vendor has verified emails
- **Email Display**: Shows verification method, contact info, and flag count
- **Quick Actions**: Edit, flag, or remove emails directly

### Email Management Modal
- **Comprehensive View**: All emails for a vendor in one place
- **Inline Editing**: Edit contact names, roles, and primary status
- **Flagging System**: Report issues with detailed reasons
- **Visual Indicators**: Icons show verification method and status

### Admin Review Interface
- **Flag Dashboard**: All pending flags in one view
- **Review Workflow**: Approve, reject, or remove with notes
- **Resolution Tracking**: Full audit trail of decisions

## API Endpoints

### `/api/vendor-emails` (GET, POST, PUT, DELETE)
- **GET**: Retrieve vendor emails by placeId
- **POST**: Add new vendor email
- **PUT**: Update existing email (contact info, primary status)
- **DELETE**: Remove email (with user confirmation)

### `/api/vendor-emails/flag` (POST, GET)
- **POST**: Flag an email for review
- **GET**: Retrieve flagged emails (admin only)

### `/api/vendor-emails/flag/review` (POST)
- **POST**: Review and resolve flagged emails (admin only)

## Data Structure

### Vendor Email Document
```typescript
interface GlobalVendorEmail {
  placeId: string;
  vendorName: string;
  vendorAddress: string;
  vendorCategory: string;
  emails: VendorEmail[];
  totalVerifications: number;
  lastUpdated: string;
  createdBy: string;
}

interface VendorEmail {
  email: string;
  verifiedBy: string;
  verifiedAt: string;
  verificationMethod: 'smtp' | 'manual' | 'crowdsourced';
  isPrimary: boolean;
  contactName?: string;
  role?: string;
  flagCount?: number;
  lastFlaggedAt?: string;
}
```

### Flag Document
```typescript
interface VendorEmailFlag {
  id: string;
  placeId: string;
  email: string;
  reason: string;
  flaggedBy: string;
  flaggedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}
```

## User Workflows

### Adding a Verified Email
1. User links vendor to contact during onboarding or editing
2. Email is automatically added to global database
3. Other users can see and use the verified email

### Editing an Email
1. User clicks "Manage" in vendor contact modal
2. User clicks edit icon next to email
3. User updates contact name, role, or primary status
4. Changes are saved with audit trail

### Flagging an Email
1. User clicks flag icon next to email
2. User provides reason for flagging
3. Flag is recorded and email flag count increases
4. Admin can review the flag

### Removing an Email
1. User clicks remove icon next to email
2. Confirmation dialog appears
3. Email is removed from global database
4. Action is logged for audit purposes

## Admin Workflows

### Reviewing Flagged Emails
1. Admin accesses admin tools in settings
2. Admin clicks "Review Flagged Vendor Emails"
3. Admin sees all pending flags with details
4. Admin can approve, reject, or remove emails

### Approving a Flag
1. Admin clicks "Review" on flagged email
2. Admin selects "Approve Flag"
3. Email is removed from vendor database
4. Flag status updated to "resolved"

### Rejecting a Flag
1. Admin clicks "Review" on flagged email
2. Admin selects "Reject Flag"
3. Email remains in database
4. Flag status updated to "reviewed"

### Immediate Removal
1. Admin clicks "Review" on flagged email
2. Admin selects "Remove Email"
3. Email is immediately removed
4. Flag status updated to "resolved"

## Data Quality Measures

### Verification Methods
- **SMTP Verified**: Email verified through SMTP testing
- **Manual Added**: User manually added email
- **Community Verified**: Email added through contact association

### Flag System
- **Flag Count**: Track how many times an email has been flagged
- **Flag Reasons**: Detailed reasons for flagging
- **Review Process**: Admin review before removal

### Audit Trail
- **Who Added**: Track who originally added the email
- **Who Edited**: Track who made changes
- **Who Flagged**: Track who flagged the email
- **Who Reviewed**: Track admin decisions

## Security Considerations

### User Permissions
- Users can only edit emails they added
- Users can flag any email
- Users can remove emails with confirmation
- Only admins can review flags

### Data Integrity
- All changes are logged with timestamps
- Email removal requires confirmation
- Flag review requires admin approval
- Full audit trail maintained

### Rate Limiting
- Flag submissions are rate limited
- Email additions are rate limited
- Admin actions are logged

## Best Practices

### For Users
- Only add emails you're confident are correct
- Flag emails that seem wrong or outdated
- Provide detailed reasons when flagging
- Use the edit function for minor corrections

### For Admins
- Review flags promptly
- Consider the flag reason carefully
- Use resolution notes for context
- Remove obvious spam immediately

### For Developers
- Monitor flag volume and patterns
- Implement additional verification methods
- Consider automated spam detection
- Regular data quality audits

## Future Enhancements

### Automated Verification
- Email validation on submission
- Domain verification
- SMTP testing for new emails

### Community Moderation
- User reputation system
- Community voting on flags
- Trusted user status

### Advanced Analytics
- Flag pattern analysis
- Email quality scoring
- Vendor engagement metrics

### Integration Features
- Vendor website scraping
- Social media verification
- Business directory integration 