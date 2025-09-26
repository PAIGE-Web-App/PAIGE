/**
 * Add N8N webhook URL to environment variables
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const webhookUrl = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

try {
  let envContent = '';
  
  // Read existing .env.local if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if the variable already exists
  if (envContent.includes('N8N_MESSAGE_ANALYSIS_WEBHOOK_URL')) {
    console.log('✅ N8N_MESSAGE_ANALYSIS_WEBHOOK_URL already exists in .env.local');
    return;
  }
  
  // Add the new environment variable
  const newEnvVar = `\n# N8N Message Analysis Webhook\nN8N_MESSAGE_ANALYSIS_WEBHOOK_URL=${webhookUrl}\n`;
  
  // Write to .env.local
  fs.appendFileSync(envPath, newEnvVar);
  
  console.log('✅ Added N8N_MESSAGE_ANALYSIS_WEBHOOK_URL to .env.local');
  console.log(`📝 Webhook URL: ${webhookUrl}`);
  
} catch (error) {
  console.error('❌ Error adding environment variable:', error.message);
}
