const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'gmail-microservice-test'
  });
});

// Test Gmail Reply endpoint (without Firebase)
app.post('/gmail-reply', async (req, res) => {
  try {
    console.log('📧 Gmail Reply test request received');
    const { body, to, subject, threadId, messageId, attachments, userId } = req.body;
    
    console.log('📧 Request details:', { to, subject, userId, hasAttachments: !!attachments });

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required.' 
      });
    }

    // Simulate Gmail API call (this would normally call Gmail API)
    console.log('📧 Simulating Gmail API call...');
    
    // Simulate success response
    const mockGmailResponse = {
      id: 'mock-message-id-' + Date.now(),
      threadId: threadId || 'mock-thread-id',
      labelIds: ['SENT']
    };

    console.log('✅ Mock email sent successfully:', mockGmailResponse.id);

    res.json({ 
      success: true, 
      gmailRes: mockGmailResponse,
      message: 'Test mode - email not actually sent'
    });
    
  } catch (error) {
    console.error('❌ Gmail reply error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail reply.'
    });
  }
});

// Test Gmail Send endpoint (without Firebase)
app.post('/gmail-send', async (req, res) => {
  try {
    console.log('📧 Gmail Send test request received');
    const { body, to, subject, attachments, userId } = req.body;
    
    console.log('📧 Request details:', { to, subject, userId, hasAttachments: !!attachments });

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required.' 
      });
    }

    // Simulate Gmail API call
    console.log('📧 Simulating Gmail API call...');
    
    // Simulate success response
    const mockGmailResponse = {
      id: 'mock-message-id-' + Date.now(),
      threadId: 'mock-thread-id',
      labelIds: ['SENT']
    };

    console.log('✅ Mock email sent successfully:', mockGmailResponse.id);

    res.json({ 
      success: true, 
      gmailRes: mockGmailResponse,
      message: 'Test mode - email not actually sent'
    });
    
  } catch (error) {
    console.error('❌ Gmail send error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail send.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gmail Microservice (TEST MODE) running on port ${PORT}`);
  console.log(`📧 Health check: http://localhost:${PORT}/health`);
  console.log(`📧 Gmail Reply: http://localhost:${PORT}/gmail-reply`);
  console.log(`📧 Gmail Send: http://localhost:${PORT}/gmail-send`);
  console.log(`⚠️  Note: This is test mode - emails are not actually sent`);
});
