# RAG Files Integration Guide

## Quick Integration Steps

### 1. Replace FilesTopBar with FilesTopBarWithRAG

In your `app/files/page.tsx`, replace the import:

```typescript
// OLD
import FilesTopBar from '@/components/FilesTopBar';

// NEW
import FilesTopBarWithRAG from '@/components/FilesTopBarWithRAG';
```

### 2. Update the FilesTopBar usage

Replace the FilesTopBar component with FilesTopBarWithRAG:

```typescript
// OLD
<FilesTopBar
  currentFolder={currentFolder}
  editingFolderNameId={editingFolderNameId}
  editingFolderNameValue={editingFolderNameValue}
  searchQuery={searchQuery}
  onSearchQueryChange={setSearchQuery}
  onSearchToggle={handleSearchToggle}
  onEditFolder={handleEditFolder}
  onCloneFolder={handleCloneFolder}
  onDeleteFolder={handleDeleteFolder}
  onRenameFolder={handleRenameFolder}
  onEditingFolderNameChange={setEditingFolderNameValue}
  onCancelEdit={handleCancelEdit}
  onCreateSubfolder={handleCreateSubfolder}
  onUploadFile={handleAddFile}
/>

// NEW - Same props, just different component
<FilesTopBarWithRAG
  currentFolder={currentFolder}
  editingFolderNameId={editingFolderNameId}
  editingFolderNameValue={editingFolderNameValue}
  searchQuery={searchQuery}
  onSearchQueryChange={setSearchQuery}
  onSearchToggle={handleSearchToggle}
  onEditFolder={handleEditFolder}
  onCloneFolder={handleCloneFolder}
  onDeleteFolder={handleDeleteFolder}
  onRenameFolder={handleRenameFolder}
  onEditingFolderNameChange={setEditingFolderNameValue}
  onCancelEdit={handleCancelEdit}
  onCreateSubfolder={handleCreateSubfolder}
  onUploadFile={handleAddFile}
/>
```

### 3. That's it! 

The enhanced search will now be available with:
- **Regular Search**: Filename-based search (your existing functionality)
- **AI Search**: Content-based search using RAG
- **Toggle**: Users can switch between modes
- **Results**: AI search shows relevant file snippets with relevance scores

## Features Added

### 🔍 **Dual Search Modes**
- **Regular**: Searches filenames (existing functionality)
- **AI**: Searches file content using RAG

### 🎯 **Smart Results**
- Shows relevant file snippets
- Displays relevance scores
- Links directly to your Firebase files

### 🎨 **Seamless Integration**
- Maintains your existing design
- No changes to file management
- Users can toggle between modes

### ⚡ **Performance**
- Debounced search (500ms delay)
- Loading states
- Error handling

## User Experience

### Before (Regular Search)
1. User types filename
2. Shows files with matching names
3. User clicks to view file

### After (AI Search)
1. User types natural language query
2. AI finds relevant content across all files
3. Shows snippets with relevance scores
4. User clicks to view relevant file

### Example Queries
- "wedding timeline"
- "photographer cancellation policy"
- "budget allocation for flowers"
- "vendor contract terms"

## Testing

### 1. Test Regular Search
- Should work exactly as before
- No changes to existing functionality

### 2. Test AI Search
- Type a query like "wedding timeline"
- Should show relevant file snippets
- Click results to open files

### 3. Test Toggle
- Switch between Regular and AI modes
- Both should work independently

## Rollback Plan

If you need to rollback:
1. Replace `FilesTopBarWithRAG` with `FilesTopBar`
2. Remove the new import
3. Everything returns to original state

## Next Steps

After integration:
1. **Test with real users**
2. **Process existing files for RAG**
3. **Monitor usage and performance**
4. **Gather feedback for improvements**

The integration is designed to be non-disruptive - your existing file management works exactly the same, with enhanced search capabilities added on top.

