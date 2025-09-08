# Pinecone Vector Database Setup Guide for PAIGE RAG

## Step 1: Create Pinecone Account

### Sign Up
1. Go to [pinecone.io](https://pinecone.io)
2. Click "Get Started Free"
3. Sign up with your email or Google account
4. Verify your email address

### Choose Plan
- **Free Tier**: 100,000 vectors, 1 index
- **Starter Plan**: 1M vectors, 1 index ($70/month)
- **Recommended**: Start with Free Tier for testing

## Step 2: Create Your First Index

### Index Configuration
1. In Pinecone console, click "Create Index"
2. **Index Name**: `paige-wedding-knowledge`
3. **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
4. **Metric**: `cosine` (recommended for text similarity)
5. **Pods**: `1` (for free tier)
6. **Replicas**: `1` (for free tier)

### Index Settings
```json
{
  "name": "paige-wedding-knowledge",
  "dimension": 1536,
  "metric": "cosine",
  "pods": 1,
  "replicas": 1,
  "pod_type": "p1.x1"
}
```

## Step 3: Get API Keys

### API Key
1. Go to "API Keys" in Pinecone console
2. Click "Create API Key"
3. **Key Name**: `paige-rag-production`
4. Copy the API key (starts with `pc-`)
5. **Important**: Store this securely, it won't be shown again

### Environment URL
1. In Pinecone console, go to "Indexes"
2. Click on your index name
3. Copy the "Environment" URL (looks like: `us-east-1-aws.pinecone.io`)

## Step 4: Test Connection

### Python Test Script
```python
import pinecone
from pinecone import Pinecone

# Initialize Pinecone
pc = Pinecone(api_key="your-api-key-here")

# Test connection
try:
    # List indexes
    indexes = pc.list_indexes()
    print("✅ Connection successful!")
    print(f"Available indexes: {[idx.name for idx in indexes]}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

## Step 5: Configure PAIGE Integration

### Environment Variables
Add these to your `.env.local`:

```bash
# Pinecone Configuration
RAG_VECTOR_DB_URL=https://paige-wedding-knowledge-xxxxx.svc.us-east-1-aws.pinecone.io
RAG_VECTOR_DB_API_KEY=pc-your-api-key-here
RAG_VECTOR_DB_INDEX_NAME=paige-wedding-knowledge
```

### Index Schema
Your Pinecone index will store documents with this structure:

```json
{
  "id": "doc_123_chunk_1",
  "values": [0.1, 0.2, 0.3, ...], // 1536-dimensional vector
  "metadata": {
    "document_id": "doc_123",
    "chunk_index": 1,
    "content": "Wedding planning timeline...",
    "source": "wedding-guides/timeline.md",
    "user_id": "user_123",
    "created_at": "2024-01-01T00:00:00Z",
    "document_type": "wedding_guide"
  }
}
```

## Step 6: Create Index Schema

### Document Types
We'll store these types of documents:

1. **Wedding Guides** (`wedding_guide`)
   - Timeline guides
   - Planning checklists
   - Vendor selection tips

2. **Vendor Templates** (`vendor_template`)
   - Contract templates
   - Vendor checklists
   - Best practices

3. **User Documents** (`user_document`)
   - User-uploaded contracts
   - Vendor proposals
   - Personal notes

### Chunking Strategy
- **Chunk Size**: 500-1000 characters
- **Overlap**: 100-200 characters
- **Max Chunks per Document**: 50

## Step 7: Test Data Upload

### Sample Document Upload
```python
import openai
from pinecone import Pinecone

# Initialize clients
openai.api_key = "your-openai-key"
pc = Pinecone(api_key="your-pinecone-key")
index = pc.Index("paige-wedding-knowledge")

# Sample document
document = {
    "id": "test_doc_1",
    "content": "Wedding planning timeline: 12+ months before - Set budget and guest list, choose wedding date and venue...",
    "source": "wedding-guides/timeline.md",
    "type": "wedding_guide"
}

# Create embedding
response = openai.embeddings.create(
    model="text-embedding-3-small",
    input=document["content"]
)

# Upload to Pinecone
index.upsert([{
    "id": document["id"],
    "values": response.data[0].embedding,
    "metadata": {
        "content": document["content"],
        "source": document["source"],
        "type": document["type"]
    }
}])

print("✅ Document uploaded successfully!")
```

## Step 8: Query Testing

### Test Similarity Search
```python
# Test query
query = "What should I do 6 months before my wedding?"

# Create query embedding
response = openai.embeddings.create(
    model="text-embedding-3-small",
    input=query
)

# Search Pinecone
results = index.query(
    vector=response.data[0].embedding,
    top_k=5,
    include_metadata=True
)

# Display results
for match in results.matches:
    print(f"Score: {match.score}")
    print(f"Content: {match.metadata['content'][:100]}...")
    print("---")
```

## Security Best Practices

### API Key Security
- Store API keys in environment variables
- Never commit API keys to version control
- Use different keys for development/production
- Rotate keys regularly

### Access Control
- Use Pinecone's built-in access controls
- Limit API key permissions
- Monitor usage and costs
- Set up alerts for unusual activity

## Cost Management

### Free Tier Limits
- 100,000 vectors
- 1 index
- 1 pod
- 1 replica

### Cost Optimization
- Use appropriate chunk sizes
- Clean up old/unused vectors
- Monitor usage regularly
- Set up cost alerts

## Troubleshooting

### Common Issues
1. **Index not found**: Check index name and environment
2. **API key invalid**: Verify key format and permissions
3. **Dimension mismatch**: Ensure embedding model matches index dimensions
4. **Rate limits**: Implement exponential backoff

### Support Resources
- [Pinecone Documentation](https://docs.pinecone.io)
- [Pinecone Community](https://community.pinecone.io)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
