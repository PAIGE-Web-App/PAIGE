# Message Analysis N8N Workflow Setup Guide

## Overview
This guide explains how to set up the dedicated message analysis workflow in n8n for processing Gmail messages and generating todo suggestions.

## Workflow Purpose
The message analysis workflow is specifically designed to:
- Process Gmail messages for todo detection
- Leverage RAG context from your knowledge base
- Generate intelligent todo suggestions and updates
- Provide wedding-specific context awareness

## Setup Steps

### 1. Import the Workflow
1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Import the file: `rag-workflows/message-analysis-workflow.json`
4. The workflow will be created with the name "PAIGE Message Analysis Workflow"

### 2. Configure Webhook
1. Open the imported workflow
2. Click on the **"Message Analysis Webhook"** node
3. Copy the webhook URL (it will look like: `https://your-n8n-instance.com/webhook/paige-rag-analyze-message`)
4. Add this URL to your `.env.local` file:
   ```
   N8N_MESSAGE_ANALYSIS_WEBHOOK_URL=https://your-n8n-instance.com/webhook/paige-rag-analyze-message
   ```

### 3. Configure Credentials
The workflow requires these credentials in n8n:

#### OpenAI API Credential
1. Go to **Settings** → **Credentials**
2. Create new credential of type **"OpenAI API"**
3. Name it: `OpenAI API`
4. Add your OpenAI API key
5. Test the connection

#### Pinecone API Credential
1. Go to **Settings** → **Credentials**
2. Create new credential of type **"Pinecone API"**
3. Name it: `Pinecone API`
4. Add your Pinecone API key
5. Test the connection

### 4. Configure Pinecone Index
1. In the **"Query Pinecone for Context"** node
2. Update the URL to point to your Pinecone index:
   ```
   https://api.pinecone.io/v1/vectors/query
   ```
3. Make sure the index name matches your existing RAG setup

### 5. Test the Workflow
1. Click **"Execute Workflow"** to test
2. Use this test payload:
   ```json
   {
     "message_content": "Hi! We need to finalize the wedding venue contract by next Friday. Please send over the updated terms.",
     "subject": "Wedding Venue Contract - Urgent",
     "vendor_category": "venue",
     "vendor_name": "Grand Ballroom",
     "existing_todos": [],
     "wedding_context": {
       "weddingDate": "2024-06-15",
       "weddingLocation": "San Francisco",
       "guestCount": 150
     },
     "user_id": "test-user-123"
   }
   ```

## Workflow Features

### Message Preprocessing
- Removes email headers and signatures
- Detects message type (contract, invoice, proposal, etc.)
- Identifies urgency level
- Extracts deadlines and action items

### RAG Integration
- Queries your existing Pinecone knowledge base
- Retrieves relevant wedding planning context
- Enhances analysis with domain-specific knowledge

### AI Analysis
- Uses GPT-4o-mini for cost efficiency
- Generates structured todo suggestions
- Provides wedding-specific recommendations
- Handles todo updates and completions

### Output Format
The workflow returns:
```json
{
  "success": true,
  "analysis": {
    "newTodos": [
      {
        "name": "Finalize wedding venue contract",
        "description": "Review and sign updated venue contract terms",
        "priority": "high",
        "category": "vendor",
        "dueDate": "2024-01-26",
        "sourceText": "We need to finalize the wedding venue contract by next Friday"
      }
    ],
    "todoUpdates": [],
    "completedTodos": [],
    "sentiment": "neutral",
    "urgency": "high",
    "requiresResponse": true,
    "suggestedResponse": "I'll review the contract and get back to you by Thursday.",
    "keyPoints": ["Contract deadline", "Updated terms needed"],
    "nextSteps": ["Review contract", "Schedule call if needed"]
  },
  "metadata": {
    "processed_at": "2024-01-20T10:30:00Z",
    "message_type": "contract",
    "urgency": "high",
    "rag_matches_used": 3,
    "existing_todos_considered": 0,
    "wedding_context_available": true
  }
}
```

## Integration Points

### 1. Enhanced Gmail Import
- Uses `/api/rag/analyze-message` endpoint
- Processes messages during Gmail import
- Generates todo suggestions automatically

### 2. Real-time Message Scanning
- Scans new messages for todo updates
- Provides immediate suggestions
- Updates existing todos based on message content

### 3. Scheduled Scanning
- Runs periodic scans for all users
- Processes recent messages
- Maintains todo suggestions up-to-date

## Performance Considerations

### Batch Processing
- Process messages in batches of 5-10
- Use parallel processing for multiple contacts
- Implement rate limiting for API calls

### Caching
- Messages are marked as scanned to prevent re-processing
- RAG context is cached for similar messages
- Analysis results are cached for duplicate content

### Error Handling
- Graceful fallback for RAG failures
- Retry logic for API timeouts
- Comprehensive error logging

## Monitoring

### Key Metrics
- Messages processed per hour
- Todo suggestions generated
- RAG context matches found
- Analysis accuracy rate

### Logging
- All analysis requests are logged
- Error details are captured
- Performance metrics are tracked

## Troubleshooting

### Common Issues

1. **Webhook not responding**
   - Check n8n instance is running
   - Verify webhook URL in environment variables
   - Test webhook manually

2. **RAG context not found**
   - Verify Pinecone credentials
   - Check index name and configuration
   - Ensure documents are properly indexed

3. **Analysis quality issues**
   - Review prompt engineering in workflow
   - Check wedding context data
   - Verify existing todos format

### Debug Mode
Enable debug logging by setting:
```
N8N_DEBUG=true
```

This will provide detailed logs for troubleshooting.

## Cost Optimization

### OpenAI Usage
- Uses GPT-4o-mini for cost efficiency
- Implements prompt optimization
- Caches similar analyses

### Pinecone Usage
- Limits query results to top 5 matches
- Uses efficient embedding model
- Implements query caching

### Batch Processing
- Reduces API calls through batching
- Implements smart retry logic
- Optimizes for high-volume processing

## Security

### Data Privacy
- Messages are processed securely
- No data is stored in n8n
- All processing is done in-memory

### API Security
- Webhook endpoints are protected
- Credentials are encrypted
- Rate limiting prevents abuse

## Next Steps

1. **Deploy the workflow** to your n8n instance
2. **Configure environment variables** in your app
3. **Test with sample messages** to verify functionality
4. **Monitor performance** and optimize as needed
5. **Scale up** based on usage patterns

This dedicated message analysis workflow provides a robust, scalable solution for processing Gmail messages and generating intelligent todo suggestions while leveraging your existing RAG infrastructure.
