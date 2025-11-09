# CASA Security Assessment - Google User Data Storage Response

## Response to TAC Security CASA Support Team

**Date:** [Current Date]

---

## 1. Confirmation: Google User Data Storage

**Yes, we do store Google users' data.** Specifically, we store OAuth authentication tokens and related metadata for users who authenticate via Google OAuth.

### Data Stored:

The following Google user data is stored in our Firestore database:

1. **OAuth Access Tokens** (`googleTokens.accessToken`)
   - Used to authenticate API requests to Google services (Gmail, Calendar)
   - Stored with expiration timestamps

2. **OAuth Refresh Tokens** (`googleTokens.refreshToken`)
   - Used to obtain new access tokens when current tokens expire
   - Stored when available (provided during OAuth flow)

3. **User Email Address** (`googleTokens.email`)
   - The Google/Gmail email address associated with the OAuth account

4. **OAuth Scopes** (`googleTokens.scope`)
   - The permissions granted by the user during OAuth authorization

5. **Token Metadata**
   - `googleTokens.expiryDate`: Token expiration timestamp
   - `googleTokens.tokenType`: Type of token ('oauth' or 'popup')
   - `googleTokens.updatedAt`: Last update timestamp

### Storage Location:

- **Database:** Google Cloud Firestore
- **Collection:** `users`
- **Document Structure:** Each user document contains a `googleTokens` field with the above data
- **Example Path:** `/users/{userId}/googleTokens`

---

## 2. Encryption Algorithms

### Current Encryption Implementation:

**Database-Level Encryption (Encryption at Rest):**
- **Provider:** Google Cloud Platform (Firestore)
- **Method:** Google-managed encryption at rest
- **Algorithm:** AES-256 (Google's default encryption)
- **Key Management:** Google Cloud Key Management Service (KMS)
- **Status:** Enabled by default for all Firestore databases

**Application-Level Encryption:**
- **Status:** Currently not implemented
- **Current State:** Tokens are stored in plaintext within Firestore documents
- **Note:** While Firestore provides encryption at rest (protecting data on disk), the tokens are not encrypted at the application level before storage

### Security Measures in Place:

1. **Firestore Security Rules:**
   - Access is restricted to authenticated users only
   - Users can only read/write their own data (UID matching)
   - Rules prevent unauthorized access to `googleTokens` data

2. **Authentication:**
   - All API endpoints require user authentication
   - Server-side validation ensures only the token owner can access their tokens

3. **Network Security:**
   - All connections to Firestore use TLS/SSL encryption in transit
   - HTTPS enforced for all API endpoints

---

## 3. Database Screenshot Information

### Firestore Database Structure:

**Collection:** `users`
**Document ID:** `{userId}` (Firebase Authentication UID)
**Field:** `googleTokens` (nested object)

### Example Document Structure:

```json
{
  "users/{userId}": {
    "email": "user@example.com",
    "onboarded": true,
    "googleTokens": {
      "accessToken": "ya29.a0AfH6SMC...",
      "refreshToken": "1//0gR...",
      "expiryDate": 1234567890000,
      "email": "user@gmail.com",
      "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar",
      "tokenType": "oauth",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "gmailConnected": true
  }
}
```

**Note:** For security reasons, actual token values are redacted in this example. In production, these are real OAuth tokens.

### Screenshot Details:

To provide a database screenshot showing encrypted data, we would need to:
1. Access the Firestore console
2. Navigate to the `users` collection
3. Select a user document containing `googleTokens`
4. Capture the document structure (with sensitive values redacted)

**Important:** The actual token values in the screenshot would need to be redacted for security reasons, but the structure would clearly show:
- The `googleTokens` field exists
- The data structure and field names
- The encrypted state (demonstrated by Firestore's encryption at rest)

---

## 4. Additional Security Information

### Data Access Controls:

- **Firestore Security Rules:** Only authenticated users can access their own data
- **Server-Side Validation:** All API endpoints validate user identity before accessing tokens
- **Token Refresh:** Tokens are automatically refreshed before expiration
- **Token Revocation:** Users can disconnect Google accounts, which removes stored tokens

### Compliance Considerations:

- **Data Minimization:** We only store tokens necessary for OAuth functionality
- **User Consent:** Users explicitly grant permissions during OAuth flow
- **Data Deletion:** Users can delete their accounts and associated Google tokens at any time
- **Token Lifecycle:** Tokens expire and are refreshed automatically

---

## 5. Recommendations for Compliance

While we currently use Firestore's default encryption at rest, we recommend implementing application-level encryption for enhanced security. This would involve:

1. **Encrypting tokens before storage** using AES-256
2. **Decrypting tokens when retrieved** from Firestore
3. **Using a secure key management system** (Google Cloud KMS or similar)

However, this is not currently implemented in our codebase.

---

## Summary

**Yes, we store Google user data** (OAuth tokens and metadata) in Firestore. The data is protected by:
- ✅ Google Cloud Firestore encryption at rest (AES-256, Google-managed)
- ✅ Firestore security rules (user-based access control)
- ✅ TLS/SSL encryption in transit
- ⚠️ **Not** application-level encryption (tokens stored in plaintext within documents)

We can provide a database screenshot with redacted token values to demonstrate the data structure and encryption at rest if needed.

---

**Next Steps:**
Please let us know if you need:
1. A database screenshot (with sensitive values redacted)
2. Additional documentation about our security measures
3. Details about implementing application-level encryption

We are committed to maintaining the highest security standards and are happy to provide any additional information required.

