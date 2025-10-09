# RAG Implementation Setup Guide

## Overview
This guide walks you through setting up the RAG (Retrieval-Augmented Generation) architecture for the enhanced onboarding flow using n8n, Pinecone, and OpenAI.

## Architecture
```
User Signup Data → n8n Workflow → Pinecone Search → Enhanced GPT Prompt → Personalized Response
```

## Prerequisites

### 1. Pinecone Setup
1. Create account at [pinecone.io](https://pinecone.io)
2. Create a new index:
   - Name: `wedding-planning-knowledge`
   - Dimensions: `1536` (for text-embedding-3-small)
   - Metric: `cosine`
3. Get your API key from the dashboard
4. Add to environment variables:
   ```bash
   PINECONE_API_KEY=your_pinecone_api_key
   ```

### 2. n8n Setup
1. Sign up at [n8n.cloud](https://n8n.cloud) or self-host
2. Create a new workflow
3. Import the workflow from `n8n-workflows/onboarding-rag-workflow.json`
4. Configure credentials:
   - **Pinecone API**: Add your Pinecone API key
   - **OpenAI API**: Add your OpenAI API key
5. Get your webhook URL and API key
6. Add to environment variables:
   ```bash
   N8N_WEBHOOK_URL=your_n8n_webhook_url
   N8N_API_KEY=your_n8n_api_key
   ```

### 3. OpenAI Setup
1. Ensure you have an OpenAI API key
2. Add to environment variables:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   ```

## Setup Steps

### 1. Populate Pinecone Knowledge Base
```bash
# Install dependencies
npm install @pinecone-database/pinecone openai

# Run the population script
node scripts/populate-pinecone-wedding-knowledge.js
```

This will create embeddings for wedding planning knowledge and store them in Pinecone.

### 2. Configure n8n Workflow
1. Import the workflow JSON file
2. Update the Pinecone index name if different
3. Test the workflow with sample data
4. Activate the workflow

### 3. Update Environment Variables
Add these to your `.env.local` and Vercel:
```bash
# Pinecone
PINECONE_API_KEY=your_pinecone_api_key

# n8n
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key

# OpenAI (already exists)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Test the RAG Flow
1. Complete the signup flow with test data
2. Click "Create my plan" in step 6
3. Verify the RAG API is called
4. Check n8n workflow execution logs
5. Verify Pinecone search results
6. Confirm personalized content generation

## Knowledge Base Content

The Pinecone knowledge base includes:

### Todo Planning Knowledge
- Wedding timeline guidelines
- Essential wedding categories
- Seasonal considerations
- Guest count impact
- Budget planning priorities

### Budget Planning Knowledge
- Budget breakdowns by guest count
- Cost-saving strategies
- Hidden wedding costs
- Venue cost factors

### Vendor Recommendations Knowledge
- Photography selection criteria
- Catering considerations
- Floral design options
- Music & entertainment choices
- Venue selection factors

## API Endpoints

### `/api/onboarding/generate-preliminary-rag`
- **Method**: POST
- **Body**: `{ userId, weddingData }`
- **Response**: `{ success: true, data: { todos, budget, vendors } }`

### n8n Webhook: `/onboarding-rag`
- **Method**: POST
- **Body**: `{ userId, weddingContext, requestType }`
- **Response**: `{ success: true, data: { todos, budget, vendors } }`

## Monitoring & Debugging

### 1. n8n Workflow Logs
- Check execution history in n8n dashboard
- Look for errors in individual nodes
- Verify data flow between nodes

### 2. Pinecone Search Results
- Check query results in Pinecone dashboard
- Verify vector similarity scores
- Ensure proper metadata filtering

### 3. API Logs
- Check Next.js API route logs
- Verify webhook calls to n8n
- Monitor OpenAI API usage

## Cost Optimization

### Pinecone
- Use `text-embedding-3-small` (cheaper than `text-embedding-3-large`)
- Implement vector caching for repeated queries
- Use metadata filtering to reduce search scope

### n8n
- Use n8n Cloud for reliability
- Monitor execution time and optimize workflow
- Implement error handling and retries

### OpenAI
- Use `gpt-4o-mini` for cost efficiency
- Implement prompt optimization
- Cache similar responses when possible

## Troubleshooting

### Common Issues

1. **Pinecone Connection Failed**
   - Verify API key and index name
   - Check network connectivity
   - Ensure index is created and ready

2. **n8n Webhook Not Triggered**
   - Verify webhook URL is correct
   - Check n8n workflow is active
   - Verify API key authentication

3. **OpenAI API Errors**
   - Check API key validity
   - Verify rate limits
   - Check prompt length limits

4. **Poor Search Results**
   - Review Pinecone knowledge base content
   - Adjust vector similarity thresholds
   - Improve metadata filtering

### Debug Commands

```bash
# Test Pinecone connection
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
pc.index('wedding-planning-knowledge').describeIndexStats().then(console.log);
"

# Test n8n webhook
curl -X POST "your_n8n_webhook_url/onboarding-rag" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_n8n_api_key" \
  -d '{"userId":"test","weddingContext":{"couple":"Test & Test"},"requestType":"generate_preliminary"}'
```

## Next Steps

1. **Expand Knowledge Base**: Add more wedding planning content
2. **Improve Search**: Fine-tune vector similarity and metadata
3. **Add Caching**: Implement response caching for similar queries
4. **Monitor Performance**: Set up logging and analytics
5. **A/B Testing**: Compare RAG vs non-RAG responses

## Support

For issues with:
- **Pinecone**: Check [Pinecone documentation](https://docs.pinecone.io)
- **n8n**: Check [n8n documentation](https://docs.n8n.io)
- **OpenAI**: Check [OpenAI documentation](https://platform.openai.com/docs)
