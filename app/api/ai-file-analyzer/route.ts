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
    const { fileId, fileName, fileContent, fileType, analysisType, chatHistory, userQuestion }: AnalysisRequest = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }

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
Content: ${fileContent}

Please provide a comprehensive analysis including:

1. **Summary**: A concise 2-3 sentence summary of the document
2. **Key Points**: 3-5 most important points from the document
3. **Vendor Accountability**: What the vendor is responsible for
4. **Important Dates**: Any deadlines, event dates, or time-sensitive items
5. **Payment Terms**: Payment schedule, amounts, and conditions
6. **Cancellation Policy**: Any cancellation terms or penalties
7. **Red Flags**: Any concerning terms or things to watch out for
8. **Action Items**: What the user should do next

Format your response in a clear, structured way that's easy to read.`;
        maxTokens = 1000;
        break;

      case 'summary':
        analysisPrompt = `Provide a concise summary of this wedding document:

Document: ${fileName}
Content: ${fileContent}

Focus on the main purpose and key terms. Keep it under 3 sentences.`;
        maxTokens = 200;
        break;

      case 'insights':
        analysisPrompt = `Extract key insights from this wedding document:

Document: ${fileName}
Content: ${fileContent}

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
Content: ${fileContent}

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

Content: ${fileContent}

Provide a helpful summary and key insights.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert wedding planning assistant. You analyze documents to help couples understand contracts, invoices, proposals, and other wedding-related paperwork. Be helpful, concise, and wedding-focused.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    const analysis = completion.choices[0].message.content;

    // Extract structured data for different analysis types
    let structuredData = {};
    
    if (analysisType === 'comprehensive') {
      // Try to extract structured data from comprehensive analysis
      const sections = analysis?.split(/\*\*(.*?)\*\*/g) || [];
      structuredData = {
        summary: sections.find(s => s.includes('Summary'))?.split('\n')[1] || '',
        keyPoints: sections.find(s => s.includes('Key Points'))?.split('\n').slice(1).filter(Boolean) || [],
        vendorAccountability: sections.find(s => s.includes('Vendor Accountability'))?.split('\n').slice(1).filter(Boolean) || [],
        importantDates: sections.find(s => s.includes('Important Dates'))?.split('\n').slice(1).filter(Boolean) || [],
        paymentTerms: sections.find(s => s.includes('Payment Terms'))?.split('\n').slice(1).filter(Boolean) || [],
        cancellationPolicy: sections.find(s => s.includes('Cancellation Policy'))?.split('\n').slice(1).filter(Boolean) || [],
        redFlags: sections.find(s => s.includes('Red Flags'))?.split('\n').slice(1).filter(Boolean) || [],
        actionItems: sections.find(s => s.includes('Action Items'))?.split('\n').slice(1).filter(Boolean) || [],
      };
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
    return NextResponse.json(
      { error: 'Failed to analyze file' },
      { status: 500 }
    );
  }
} 