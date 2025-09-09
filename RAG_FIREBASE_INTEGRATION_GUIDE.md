# RAG + Firebase Integration Guide

## Overview

This guide shows how to integrate RAG (Retrieval-Augmented Generation) with your existing Firebase/Cloud Storage file system. RAG enhances your current file storage by adding AI-powered search and insights.

## How It Works

### Current System
```
User uploads file → Firebase Storage → User can view/download
```

### Enhanced with RAG
```
User uploads file → Firebase Storage → RAG processes content → AI-powered search
```

## Integration Benefits

1. **Keep Your Existing System**: All your current file storage, organization, and access patterns remain unchanged
2. **Add AI Intelligence**: Users can search their files using natural language
3. **Smart Insights**: Get AI-generated summaries and insights from uploaded documents
4. **Seamless Experience**: RAG works behind the scenes, enhancing your existing UX

## Implementation Steps

### 1. File Upload Enhancement

When users upload files, automatically process them for RAG:

```typescript
// In your existing file upload handler
import { ragFileIntegration } from '@/lib/ragFileIntegration';

async function handleFileUpload(file: File, userId: string) {
  // Your existing Firebase upload logic
  const uploadResult = await uploadToFirebase(file, userId);
  
  // NEW: Process for RAG if it's a text file
  if (isTextFile(file.type)) {
    try {
      const content = await file.text();
      await ragFileIntegration.processFileForRAG({
        id: uploadResult.id,
        name: file.name,
        url: uploadResult.url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        userId,
        path: uploadResult.path
      }, content);
    } catch (error) {
      console.error('RAG processing failed:', error);
      // Don't fail the upload if RAG fails
    }
  }
  
  return uploadResult;
}
```

### 2. Add RAG Search to Your Files Page

```typescript
// In your existing files page component
import { useRAGFileIntegration } from '@/hooks/useRAGFileIntegration';

function FilesPage() {
  const { user } = useAuth();
  const { files, searchFiles, searchResults, searchLoading } = useRAGFileIntegration();
  
  // Your existing file list logic
  // Add RAG search functionality
}
```

### 3. Batch Process Existing Files

For files already in your system:

```typescript
// One-time migration script
async function migrateExistingFiles() {
  const users = await getAllUsers();
  
  for (const user of users) {
    try {
      const results = await ragFileIntegration.processAllUserFilesForRAG(user.id);
      console.log(`Processed ${results.processed} files for user ${user.id}`);
    } catch (error) {
      console.error(`Failed to process files for user ${user.id}:`, error);
    }
  }
}
```

## File Type Support

### Currently Supported
- ✅ Text files (.txt, .md, .json, .xml)
- ✅ Plain text content
- ✅ Markdown documents

### Future Support (with additional processing)
- 🔄 PDF documents (requires PDF parsing)
- 🔄 Word documents (requires DOCX parsing)
- 🔄 Images with text (requires OCR)

## User Experience

### Before RAG
- Users upload files to Firebase Storage
- Users can view/download files
- No search capability beyond file names

### After RAG
- Users upload files to Firebase Storage (same as before)
- Users can view/download files (same as before)
- **NEW**: Users can search file contents with natural language
- **NEW**: Users get AI-powered insights from their documents
- **NEW**: Users can ask questions about their uploaded content

## Example Use Cases

### Wedding Planning
- Upload vendor contracts → Search "What are the cancellation policies?"
- Upload timeline documents → Search "When should I book the photographer?"
- Upload budget spreadsheets → Search "How much should I allocate for flowers?"

### Vendor Management
- Upload vendor proposals → Search "Which photographer offers the best package?"
- Upload contract templates → Search "What insurance requirements are mentioned?"

## API Endpoints

### List User Files
```bash
GET /api/rag/process-user-files?userId={userId}&action=list_files
```

### Process All Files for RAG
```bash
POST /api/rag/process-user-files
{
  "userId": "user123",
  "action": "process_all"
}
```

### Search Files
```bash
POST /api/rag/process-user-files
{
  "userId": "user123",
  "action": "search",
  "query": "wedding timeline"
}
```

## Testing the Integration

### 1. Test with Sample Files
```bash
# Upload a test document
curl -X POST http://localhost:3000/api/rag/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "wedding-timeline",
    "document_content": "Wedding Planning Timeline: 12+ months before - Set budget and guest list, choose wedding date and venue. 9-11 months before - Book photographer, florist, and caterer.",
    "source": "user_upload",
    "user_id": "test@example.com",
    "document_type": "wedding_guide"
  }'
```

### 2. Test Search
```bash
# Search the uploaded content
curl -X POST http://localhost:3000/api/rag/process-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "When should I book the photographer?",
    "user_id": "test@example.com",
    "context": "user_files"
  }'
```

## Migration Strategy

### Phase 1: Setup (Current)
- ✅ RAG infrastructure is ready
- ✅ Document processing workflow works
- ✅ Basic integration code is written

### Phase 2: Gradual Rollout
- Enable RAG for beta users
- Process their existing files
- Test search functionality

### Phase 3: Full Integration
- Add RAG processing to file upload flow
- Add search UI to files page
- Enable for all users

### Phase 4: Advanced Features
- Add OCR for image files
- Add PDF parsing
- Add AI-generated summaries

## Cost Considerations

### Firebase Storage
- No additional cost (you're already using it)
- RAG doesn't duplicate files, just processes content

### RAG Processing
- OpenAI API calls for embeddings
- Pinecone storage for vectors
- N8N workflow execution

### Optimization Tips
- Only process text files initially
- Batch process files during off-peak hours
- Use feature flags to control rollout

## Monitoring

### Health Checks
```bash
curl http://localhost:3000/api/rag/health
```

### Usage Metrics
- Files processed per user
- Search queries per user
- Processing success/failure rates

## Next Steps

1. **Test the Integration**: Use the provided test commands
2. **Add to Your Files Page**: Integrate the RAG search component
3. **Process Existing Files**: Run the batch processing for current users
4. **Monitor Performance**: Watch for any issues during rollout

## Support

If you encounter issues:
1. Check the health endpoint: `/api/rag/health`
2. Review N8N workflow executions
3. Check Pinecone index for stored vectors
4. Monitor Firebase Storage for file access

The RAG system is designed to enhance your existing file storage without disrupting your current workflow. Users will get the same file management experience they're used to, plus powerful AI-powered search capabilities.

