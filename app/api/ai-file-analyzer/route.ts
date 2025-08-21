import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
}

export async function POST(request: NextRequest) {
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
    
    const { fileId, fileName, fileContent, fileType, analysisType, chatHistory, userQuestion }: AnalysisRequest = await request.json();

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
          
          Be concise, helpful, and wedding-focused in your responses.`
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
        analysisPrompt = `Analyze this wedding-related document comprehensively:

Document: ${fileName}
Type: ${fileType}
Content: ${testContent}

Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "A concise 2-3 sentence summary of the document",
  "keyPoints": ["3-5 most important points from the document"],
  "vendorAccountability": ["What the vendor is responsible for and when"],
  "userAccountability": ["What the user is responsible for and when"],
  "importantDates": ["Any deadlines, event dates, or time-sensitive items"],
  "paymentTerms": ["Payment schedule, amounts, deposits, and conditions"],
  "cancellationPolicy": ["Any cancellation terms, refund policies, or penalties"],
  "gotchas": ["Areas to watch out for that could backfire"],
  "recommendations": ["Suggestions for next steps or actions needed"]
}

Focus on wedding-specific context and practical implications for wedding planning. Be specific about dates, amounts, and responsibilities.`;
        maxTokens = 1500;
        break;

      case 'summary':
        analysisPrompt = `Provide a concise summary of this wedding document:

Document: ${fileName}
Content: ${truncatedContent}

Focus on the main purpose and key terms. Keep it under 3 sentences.`;
        maxTokens = 200;
        break;

      case 'insights':
        analysisPrompt = `Extract key insights from this wedding document:

Document: ${fileName}
Content: ${truncatedContent}

Focus on:
- Important dates and deadlines
- Payment terms and amounts
- Vendor responsibilities
- Any concerning terms
- Recommendations for the user`;
        maxTokens = 400;
        break;

      case 'questions':
        analysisPrompt = `Based on this wedding document, suggest 5 helpful questions the user might want to ask:

Document: ${fileName}
Content: ${truncatedContent}

Generate questions that would help the user:
- Understand payment terms
- Clarify vendor responsibilities
- Identify important deadlines
- Spot potential issues
- Plan next steps

Format as a simple list.`;
        maxTokens = 300;
        break;

      default:
        analysisPrompt = `Analyze this wedding document: ${fileName}

Content: ${truncatedContent}

Provide a helpful summary and key insights.`;
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
            content: `You are an expert wedding planning assistant. You analyze documents to help couples understand contracts, invoices, proposals, and other wedding-related paperwork. Be helpful, concise, and wedding-focused. Always return valid JSON when requested.`
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