# Category Cleanup Guide

This guide explains how to clean up Firestore document IDs that were incorrectly saved as category names in your database.

## Problem Description

Some category names in your database appear to be Firestore document IDs (long alphanumeric strings like `abc123def456ghi789`) instead of proper category names like "Photographer" or "Caterer". This happened due to a bug where document IDs were accidentally saved as category names.

## Solution Overview

We've implemented a two-part solution:

1. **UI Filtering**: The app now filters out these invalid categories from dropdowns and displays
2. **Database Cleanup**: A script to permanently remove these invalid entries from your database

## UI Filtering (Already Implemented)

The following components now automatically filter out Firestore document IDs:

- `CategorySelectField` - Used in add/edit contact modals
- `firebaseCategories.ts` - The main categories fetching function
- `VendorsPage` - Category filtering in the vendors sidebar
- `TodoPage` - Category filtering in todo items

The filtering uses this pattern: `/^[a-zA-Z0-9_-]{15,}$/` which identifies strings that are 15+ characters long and contain only letters, numbers, hyphens, and underscores.

## Database Cleanup Script

### Prerequisites

1. Make sure you have Node.js installed
2. Install Firebase Admin SDK if not already installed:
   ```bash
   npm install firebase-admin
   ```

### Setup

1. **Get your Firebase config**: Go to your Firebase Console → Project Settings → General → Your apps → SDK setup and configuration
2. **Update the script**: Open `scripts/cleanup-categories.js` and replace the `firebaseConfig` object with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

### Running the Cleanup

**⚠️ IMPORTANT: Backup your database before running this script!**

1. **Test run first** (recommended):
   ```bash
   node scripts/cleanup-categories.js
   ```

2. **Review the output** to see what would be cleaned up

3. **If you're satisfied with the results**, the script will automatically execute the cleanup

### What the Script Does

The cleanup script performs three main operations:

1. **Categories Collection Cleanup**: Deletes invalid category documents from the `users/{userId}/categories` collection
2. **Contacts Cleanup**: Updates contacts that have invalid categories, setting their category to `null`
3. **Todo Items Cleanup**: Updates todo items that have invalid categories, setting their category to `null`

### Expected Output

```
Starting database cleanup for invalid categories...
Starting categories cleanup...
Processing user: user123
  Deleting invalid category: abc123def456ghi789
Categories cleanup completed. Deleted 5 invalid categories.
Starting contacts cleanup...
Processing contacts for user: user123
  Updating contact John Doe with invalid category: xyz789abc123def
Contacts cleanup completed. Updated 3 contacts.
Starting todo items cleanup...
Processing todo items for user: user123
  Updating todo item "Book photographer" with invalid category: def456ghi789jkl
Todo items cleanup completed. Updated 2 todo items.
Database cleanup completed successfully!
```

## Manual Cleanup (Alternative)

If you prefer to clean up manually through the Firebase Console:

1. Go to Firestore Database in your Firebase Console
2. Navigate to `users/{userId}/categories`
3. Look for documents where the `name` field contains long alphanumeric strings
4. Delete these documents manually
5. Repeat for `users/{userId}/contacts` and `users/{userId}/todoItems` collections

## Prevention

To prevent this issue in the future:

1. The UI filtering is now in place to prevent users from seeing invalid categories
2. The `getAllCategories()` function filters out invalid categories at the source
3. Consider adding validation in your category creation logic to prevent saving document IDs as category names

## Verification

After running the cleanup:

1. Check that invalid categories no longer appear in dropdowns
2. Verify that contacts and todo items with invalid categories now have `null` or proper category values
3. Test the app to ensure category functionality still works correctly

## Support

If you encounter any issues:

1. Check the console output for error messages
2. Verify your Firebase configuration is correct
3. Ensure you have proper permissions to read/write to your Firestore database
4. Consider running the script on a test environment first

## Rollback

If something goes wrong and you need to rollback:

1. Use your database backup to restore the data
2. The UI filtering will prevent the invalid categories from appearing even if they exist in the database
3. You can always re-run the cleanup script after fixing any issues 