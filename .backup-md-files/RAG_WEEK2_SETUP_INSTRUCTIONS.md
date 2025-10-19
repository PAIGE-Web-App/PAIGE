# RAG Week 2 Setup Instructions

## 🎯 Overview

This guide will walk you through setting up the external infrastructure components for your RAG system. By the end of this setup, you'll have:

- ✅ N8N instance running with workflows
- ✅ Pinecone vector database configured
- ✅ RAG system integrated with your PAIGE application
- ✅ Testing scripts to verify everything works

## 📋 Prerequisites

- [ ] Week 1 foundation setup completed
- [ ] PAIGE application running locally
- [ ] OpenAI API key available
- [ ] Git repository with Week 2 changes

## 🚀 Step-by-Step Setup

### Step 1: Set Up N8N Cloud Instance

1. **Go to N8N Cloud**
   - Visit [n8n.cloud](https://n8n.cloud)
   - Click "Start Free" or "Sign Up"
   - Choose the "Starter" plan (free tier available)
   - Complete the signup process

2. **Access Your Instance**
   - After signup, you'll get a URL like: `https://your-instance.n8n.cloud`
   - Bookmark this URL for easy access
   - Note down your instance URL

3. **Get Webhook URLs**
   - In your N8N instance, go to "Workflows"
   - Create a new workflow
   - Add a "Webhook" node
   - Copy the webhook URL (we'll use this later)

### Step 2: Set Up Pinecone Vector Database

1. **Create Pinecone Account**
   - Go to [pinecone.io](https://pinecone.io)
   - Click "Get Started Free"
   - Sign up with your email or Google account
   - Verify your email address

2. **Create Your First Index**
   - In Pinecone console, click "Create Index"
   - **Index Name**: `paige-wedding-knowledge`
   - **Dimensions**: `1536` (for OpenAI text-embedding-3-small)
   - **Metric**: `cosine` (recommended for text similarity)
   - **Pods**: `1` (for free tier)
   - **Replicas**: `1` (for free tier)

3. **Get API Keys**
   - Go to "API Keys" in Pinecone console
   - Click "Create API Key"
   - **Key Name**: `paige-rag-production`
   - Copy the API key (starts with `pc-`)
   - **Important**: Store this securely, it won't be shown again

4. **Get Environment URL**
   - In Pinecone console, go to "Indexes"
   - Click on your index name
   - Copy the "Environment" URL (looks like: `us-east-1-aws.pinecone.io`)

### Step 3: Configure Environment Variables

1. **Update Your `.env.local` File**
   ```bash
   # Add these lines to your .env.local file:
   
   # N8N Configuration
   RAG_N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/paige-rag
   RAG_N8N_API_KEY=your-api-key-here
   
   # Pinecone Configuration
   RAG_VECTOR_DB_URL=https://paige-wedding-knowledge-xxxxx.svc.us-east-1-aws.pinecone.io
   RAG_VECTOR_DB_API_KEY=pc-your-api-key-here
   RAG_VECTOR_DB_INDEX_NAME=paige-wedding-knowledge
   RAG_VECTOR_DB_ENVIRONMENT=us-east-1-aws
   ```

2. **Replace Placeholder Values**
   - Replace `your-instance.n8n.cloud` with your actual N8N instance URL
   - Replace `your-api-key-here` with your actual API keys
   - Replace the Pinecone URLs with your actual values

### Step 4: Import N8N Workflows

1. **Import Document Processing Workflow**
   - In your N8N instance, go to "Workflows"
   - Click "Import from File"
   - Upload the file: `rag-workflows/document-processing-workflow.json`
   - Save the workflow

2. **Import Query Processing Workflow**
   - Create another new workflow
   - Import the file: `rag-workflows/query-processing-workflow.json`
   - Save the workflow

3. **Configure Workflow Credentials**
   - In each workflow, you'll need to set up credentials for:
     - OpenAI API (for embeddings and chat completions)
     - HTTP requests (for Pinecone API calls)

### Step 5: Test the Integration

1. **Start Your PAIGE Application**
   ```bash
   npm run dev
   ```

2. **Run the Test Script**
   ```bash
   node tests/test-rag-system.js
   ```

3. **Check Test Results**
   - All tests should pass
   - If any tests fail, check the error messages and configuration

### Step 6: Enable RAG for Testing

1. **Enable RAG for Your Account**
   ```bash
   # In your .env.local file, change:
   ENABLE_RAG=true
   RAG_BETA_USERS="your-email@example.com"
   ```

2. **Restart Your Application**
   ```bash
   npm run dev
   ```

3. **Test RAG Functionality**
   - Try uploading a document
   - Ask questions about your documents
   - Verify that RAG responses are more accurate

## 🔧 Troubleshooting

### Common Issues

1. **N8N Webhook Not Working**
   - Check that the webhook URL is correct
   - Verify that the workflow is active
   - Check N8N logs for errors

2. **Pinecone Connection Failed**
   - Verify API key is correct
   - Check that the index name matches
   - Ensure the environment URL is correct

3. **OpenAI API Errors**
   - Verify your OpenAI API key is valid
   - Check that you have sufficient credits
   - Ensure the model names are correct

4. **Feature Flags Not Working**
   - Check that environment variables are set correctly
   - Restart the application after changes
   - Verify user email is in the beta list

### Getting Help

- Check the N8N documentation: [docs.n8n.io](https://docs.n8n.io)
- Check the Pinecone documentation: [docs.pinecone.io](https://docs.pinecone.io)
- Review the test script output for specific error messages

## 🎉 Success Criteria

You'll know the setup is successful when:

- ✅ All test scripts pass
- ✅ RAG health check returns "healthy"
- ✅ Document processing works
- ✅ Query processing returns relevant answers
- ✅ Feature flags can be toggled
- ✅ Emergency disable works

## 🚀 Next Steps

Once Week 2 is complete, you'll be ready for:

- **Week 3**: Advanced RAG features and optimization
- **Week 4**: Production deployment and monitoring
- **Week 5**: User testing and feedback integration

## 📞 Support

If you encounter any issues during setup:

1. Check the troubleshooting section above
2. Review the test script output
3. Verify all environment variables are set correctly
4. Ensure all external services are accessible

Remember: The RAG system is designed to be safe and can be disabled at any time using the emergency disable feature.
