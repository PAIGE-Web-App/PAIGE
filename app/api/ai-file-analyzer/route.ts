import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisRequest {
  fileId: string;
  fileName: string;
  fileContent: string;
  fileType: string;
  analysisType: 'comprehensive' | 'summary' | 'insights' | 'questions';
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userQuestion?: string;
  userId: string; // Required for credit validation
}

// Main handler function
async function handleFileAnalysis(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('AI File Analyzer API called');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const { fileId, fileName, fileContent, fileType, analysisType, chatHistory, userQuestion, userId }: AnalysisRequest = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }

    // Truncate file content if it's too long to avoid API issues
    const maxContentLength = 50000; // 50KB limit
    let truncatedContent = fileContent;
    if (fileContent.length > maxContentLength) {
      console.log(`File content too long (${fileContent.length} chars), truncating to ${maxContentLength}`);
      truncatedContent = fileContent.substring(0, maxContentLength) + '\n\n[Content truncated due to length]';
    }
    
    // For testing, let's try with a much smaller sample first
    const testContent = truncatedContent.substring(0, 1000) + '\n\n[Content truncated for testing]';
    console.log('Using test content length:', testContent.length);

    // If this is a follow-up question, use chat history
    if (userQuestion && chatHistory) {
      const messages = [
        {
          role: 'system' as const,
          content: `You are an expert wedding planning assistant analyzing documents. You have access to the file "${fileName}" (${fileType}). 
          
          Your role is to:
          - Answer questions about the document content
          - Provide wedding-specific insights and recommendations
          - Help identify important dates, payment terms, and vendor responsibilities
          - Suggest action items and things to watch out for
          
          CRITICAL FORMATTING RULE: You MUST ALWAYS respond with ONLY HTML code. NEVER use markdown formatting like ### or **.
          
          REQUIRED HTML STRUCTURE:
          - Start every response with <div class="prose">
          - End every response with </div>
          - Use <h3> for section headers
          - Use <p> for paragraphs
          - Use <ul> and <li> for lists
          - Use <strong> for bold text
          - NEVER use markdown syntax
          
          If you use markdown formatting, your response will be rejected. Be concise, helpful, and wedding-focused in your responses.`
        },
        ...chatHistory,
        {
          role: 'user' as const,
          content: userQuestion
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return NextResponse.json({
        response: completion.choices[0].message.content,
        analysisType: 'follow-up',
        fileId,
      });
    }

    // Initial file analysis
    let analysisPrompt = '';
    let maxTokens = 800;

    switch (analysisType) {
      case 'comprehensive':
        analysisPrompt = `CRITICAL: You MUST respond with ONLY HTML code. Do NOT use markdown formatting like ### or **. 

Analyze this wedding-related document comprehensively:

Document: ${fileName}
Type: ${fileType}
Content: ${testContent}

You MUST format your response as HTML using this EXACT structure. Do not add any text before or after the HTML:

<div class="prose">
  <h3>Summary</h3>
  <p>Your 2-3 sentence summary here</p>
  
  <h3>Key Points</h3>
  <ul>
    <li>First important point</li>
    <li>Second important point</li>
    <li>Third important point</li>
  </ul>
  
  <h3>Vendor Responsibilities</h3>
  <ul>
    <li>What the vendor is responsible for</li>
  </ul>
  
  <h3>Your Responsibilities</h3>
  <ul>
    <li>What the user is responsible for</li>
  </ul>
  
  <h3>Important Dates</h3>
  <ul>
    <li>Any deadlines or time-sensitive items</li>
  </ul>
  
  <h3>Payment Terms</h3>
  <ul>
    <li>Payment schedule and amounts</li>
  </ul>
  
  <h3>Cancellation Policy</h3>
  <ul>
    <li>Any cancellation terms or penalties</li>
  </ul>
  
  <h3>Things to Watch Out For</h3>
  <ul>
    <li>Areas to watch out for</li>
  </ul>
  
  <h3>Recommendations</h3>
  <ul>
    <li>Suggested next steps</li>
  </ul>
</div>

REMEMBER: Start your response with <div class="prose"> and end with </div>. Use <h3> for headers, <p> for paragraphs, <ul> and <li> for lists. NO markdown formatting.`;
        maxTokens = 1500;
        break;

      case 'summary':
        analysisPrompt = `CRITICAL: You MUST respond with ONLY HTML code. Do NOT use markdown formatting like ### or **.

Provide a concise summary of this wedding document:

Document: ${fileName}
Content: ${truncatedContent}

You MUST format your response as HTML using this EXACT structure:

<div class="prose">
  <h3>Summary</h3>
  <p>Your concise 2-3 sentence summary here</p>
</div>

REMEMBER: Start with <div class="prose"> and end with </div>. Use <h3> for headers, <p> for paragraphs. NO markdown formatting.`;
        maxTokens = 200;
        break;

      case 'insights':
        analysisPrompt = `CRITICAL: You MUST respond with ONLY HTML code. Do NOT use markdown formatting like ### or **.

Extract key insights from this wedding document:

Document: ${fileName}
Content: ${truncatedContent}

You MUST format your response as HTML using this EXACT structure:

<div class="prose">
  <h3>Key Insights</h3>
  <ul>
    <li><strong>Important Dates:</strong> Any deadlines and time-sensitive items</li>
    <li><strong>Payment Terms:</strong> Payment schedule, amounts, and conditions</li>
    <li><strong>Vendor Responsibilities:</strong> What the vendor is responsible for</li>
    <li><strong>Concerning Terms:</strong> Any terms to watch out for</li>
    <li><strong>Recommendations:</strong> Suggested next steps for the user</li>
  </ul>
</div>

REMEMBER: Start with <div class="prose"> and end with </div>. Use <h3> for headers, <ul> and <li> for lists, <strong> for bold text. NO markdown formatting.`;
        maxTokens = 400;
        break;

      case 'questions':
        analysisPrompt = `CRITICAL: You MUST respond with ONLY HTML code. Do NOT use markdown formatting like ### or **.

Based on this wedding document, suggest 5 helpful questions the user might want to ask:

Document: ${fileName}
Content: ${truncatedContent}

You MUST format your response as HTML using this EXACT structure:

<div class="prose">
  <h3>Suggested Questions</h3>
  <p>Here are some questions you might want to ask about this document:</p>
  <ul>
    <li>Question about payment terms</li>
    <li>Question about vendor responsibilities</li>
    <li>Question about important deadlines</li>
    <li>Question about potential issues</li>
    <li>Question about next steps</li>
  </ul>
</div>

REMEMBER: Start with <div class="prose"> and end with </div>. Use <h3> for headers, <p> for paragraphs, <ul> and <li> for lists. NO markdown formatting.`;
        maxTokens = 300;
        break;

      default:
        analysisPrompt = `CRITICAL: You MUST respond with ONLY HTML code. Do NOT use markdown formatting like ### or **.

Analyze this wedding document: ${fileName}

Content: ${truncatedContent}

You MUST format your response as HTML using this EXACT structure:

<div class="prose">
  <h3>Document Analysis</h3>
  <p>Your helpful summary and key insights about the document</p>
</div>

REMEMBER: Start with <div class="prose"> and end with </div>. Use <h3> for headers, <p> for paragraphs. NO markdown formatting.`;
    }

    console.log(`Calling OpenAI with ${analysisType} analysis, maxTokens: ${maxTokens}, contentLength: ${truncatedContent.length}`);
    console.log('Analysis prompt length:', analysisPrompt.length);
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert wedding planning assistant. You analyze documents to help couples understand contracts, invoices, proposals, and other wedding-related paperwork. Be helpful, concise, and wedding-focused. 

CRITICAL FORMATTING RULE: You MUST ALWAYS respond with ONLY HTML code. NEVER use markdown formatting like ### or **. 

REQUIRED HTML STRUCTURE:
- Start every response with <div class="prose">
- End every response with </div>
- Use <h3> for section headers
- Use <p> for paragraphs
- Use <ul> and <li> for lists
- Use <strong> for bold text
- NEVER use markdown syntax

If you use markdown formatting, your response will be rejected.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      });
      
      console.log('OpenAI response received successfully');
    } catch (openaiError) {
      console.error('OpenAI API call failed:', openaiError);
      return NextResponse.json(
        { error: `OpenAI API call failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    const analysis = completion.choices[0].message.content;

    // Extract structured data for different analysis types
    let structuredData = {};
    
    if (analysisType === 'comprehensive') {
      try {
        // Try to parse JSON response
        const jsonMatch = analysis?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback to text parsing if JSON parsing fails
          structuredData = parseTextToStructuredData(analysis || '');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON response, falling back to text parsing:', parseError);
        structuredData = parseTextToStructuredData(analysis || '');
      }
    }

    return NextResponse.json({
      analysis,
      structuredData,
      analysisType,
      fileId,
      fileName,
    });

  } catch (error) {
    console.error('AI File Analyzer Error:', error);
    
    // Return a simple fallback response for testing
    return NextResponse.json({
      analysis: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      structuredData: {
        summary: "Analysis failed due to technical issues",
        keyPoints: ["Please try again or contact support"],
        vendorAccountability: [],
        userAccountability: [],
        importantDates: [],
        paymentTerms: [],
        cancellationPolicy: [],
        gotchas: [],
        recommendations: ["Try re-analyzing the file"]
      },
      analysisType: 'comprehensive',
      fileId: 'error',
      fileName: 'Error',
    });
  }
}

/**
 * Fallback function to parse text analysis into structured data
 */
function parseTextToStructuredData(analysis: string): any {
  const sections = analysis?.split(/\*\*(.*?)\*\*/g) || [];
  
  return {
    summary: sections.find(s => s.includes('Summary'))?.split('\n')[1] || '',
    keyPoints: sections.find(s => s.includes('Key Points'))?.split('\n').slice(1).filter(Boolean) || [],
    vendorAccountability: sections.find(s => s.includes('Vendor Accountability'))?.split('\n').slice(1).filter(Boolean) || [],
    userAccountability: sections.find(s => s.includes('User Accountability'))?.split('\n').slice(1).filter(Boolean) || [],
    importantDates: sections.find(s => s.includes('Important Dates'))?.split('\n').slice(1).filter(Boolean) || [],
    paymentTerms: sections.find(s => s.includes('Payment Terms'))?.split('\n').slice(1).filter(Boolean) || [],
    cancellationPolicy: sections.find(s => s.includes('Cancellation Policy'))?.split('\n').slice(1).filter(Boolean) || [],
    gotchas: sections.find(s => s.includes('Gotchas'))?.split('\n').slice(1).filter(Boolean) || [],
    recommendations: sections.find(s => s.includes('Recommendations'))?.split('\n').slice(1).filter(Boolean) || [],
  };
}

// Export the POST function wrapped with credit validation
export const POST = withCreditValidation(handleFileAnalysis, {
  feature: 'file_analysis',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for file analysis. Please upgrade your plan to continue using AI features.'
});