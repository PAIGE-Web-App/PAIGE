import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RAGAnalysisRequest {
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
  userId: string;
  userEmail: string;
}

// Main handler function
async function handleRAGFileAnalysis(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('RAG-Enhanced AI File Analyzer API called');
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const requestBody = await request.json();
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('UserId from request:', requestBody.userId);
    
    const { 
      fileId, 
      fileName, 
      fileContent, 
      fileType, 
      analysisType, 
      chatHistory, 
      userQuestion, 
      userId,
      userEmail 
    }: RAGAnalysisRequest = requestBody;

    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    const useRAG = shouldUseRAG(userId, userEmail);
    console.log(`RAG enabled for user: ${useRAG}`);

    // First, process the file for RAG if enabled
    if (useRAG) {
      try {
        console.log('Processing file for RAG...');
        const ragResult = await ragService.processDocument({
          document_id: fileId,
          document_content: fileContent,
          source: 'user_upload',
          user_id: userId,
          document_type: getDocumentType(fileType)
        });
        console.log('File processed for RAG successfully:', ragResult);
      } catch (ragError) {
        console.error('RAG processing failed, continuing with standard analysis:', ragError);
        console.error('RAG error details:', {
          message: ragError instanceof Error ? ragError.message : 'Unknown error',
          stack: ragError instanceof Error ? ragError.stack : 'No stack'
        });
        // Continue with standard analysis even if RAG fails
      }
    }

    // Truncate file content if it's too long to avoid API issues
    const maxContentLength = 50000; // 50KB limit
    let truncatedContent = fileContent;
    if (fileContent.length > maxContentLength) {
      console.log(`File content too long (${fileContent.length} chars), truncating to ${maxContentLength}`);
      truncatedContent = fileContent.substring(0, maxContentLength) + '\n\n[Content truncated due to length]';
    }

    // Get relevant context from RAG if enabled (only for follow-up questions)
    let ragContext = '';
    if (useRAG && userQuestion) {
      try {
        console.log('Getting RAG context for question...');
        const ragResults = await ragService.processQuery({
          query: userQuestion,
          user_id: userId,
          context: 'file_analysis'
        });
        
        if (ragResults.results && ragResults.results.length > 0) {
          ragContext = '\n\nRelevant context from your other files:\n' + 
            ragResults.results.slice(0, 3).map(result => 
              `- ${result.metadata?.content?.substring(0, 200)}...`
            ).join('\n');
        }
      } catch (ragError) {
        console.error('RAG query failed, continuing without context:', ragError);
        // Continue without RAG context
      }
    } else if (useRAG) {
      console.log('RAG enabled but no user question - using standard analysis');
    }

    // Build the analysis prompt with RAG context
    const analysisPrompt = buildAnalysisPrompt(
      fileName, 
      fileType, 
      analysisType, 
      truncatedContent, 
      userQuestion, 
      chatHistory,
      ragContext
    );

    console.log(`Sending request to OpenAI for ${analysisType} analysis`);
    console.log('Analysis prompt length:', analysisPrompt.length);
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Paige, an expert wedding planning assistant. Analyze files with wedding planning expertise and provide helpful, actionable insights.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    console.log('First OpenAI API call successful');
    } catch (openaiError) {
      console.error('First OpenAI API call failed:', openaiError);
      throw new Error(`OpenAI API call failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
    }

    const analysis = completion.choices[0]?.message?.content || 'Analysis failed';

    // Generate follow-up questions for comprehensive analysis
    let followUpQuestions: string[] = [];
    if (analysisType === 'comprehensive') {
      try {
        console.log('Generating follow-up questions...');
        const questionsCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are Paige, a wedding planning assistant. Generate exactly 3 concise, actionable follow-up questions that a user might want to ask about this document. Keep each question under 15 words and make them specific to wedding planning.'
            },
            {
              role: 'user',
              content: `Based on this document analysis:\n\n${analysis}\n\nGenerate exactly 3 concise follow-up questions (under 15 words each) that would be helpful for wedding planning. Return them as a simple list, one per line.`
            }
          ],
          temperature: 0.7,
          max_tokens: 200,
        });
        console.log('Follow-up questions generation successful');

        const questionsText = questionsCompletion.choices[0]?.message?.content || '';
        followUpQuestions = questionsText
          .split('\n')
          .map(q => q.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter(q => q.length > 0)
          .slice(0, 3);
        console.log('Generated follow-up questions:', followUpQuestions);
      } catch (error) {
        console.error('Error generating follow-up questions:', error);
        console.error('Follow-up questions error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack'
        });
      }
    }

    // Parse structured data if it's a comprehensive analysis
    let structuredData = null;
    if (analysisType === 'comprehensive') {
      structuredData = parseStructuredData(analysis);
    }

    console.log('Analysis completed successfully');

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = request.headers.get('x-credits-required');
    const creditsRemaining = request.headers.get('x-credits-remaining');
    const headerUserId = request.headers.get('x-user-id');

    // Update the file record in Firestore with the analysis results using Admin SDK
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      
      const fileRef = db.collection('users').doc(headerUserId || '').collection('files').doc(fileId);
      await fileRef.update({
        aiSummary: analysis,
        keyPoints: structuredData?.keyPoints || [],
        vendorAccountability: structuredData?.vendorAccountability || [],
        importantDates: structuredData?.importantDates || [],
        paymentTerms: structuredData?.paymentTerms || [],
        cancellationPolicy: structuredData?.cancellationPolicy || [],
        isProcessed: true,
        processingStatus: 'completed',
        updatedAt: new Date(),
      });
      
      console.log('File record updated with analysis results');
    } catch (error) {
      console.error('Error updating file record:', error);
      // Don't fail the request if file update fails
    }

    const response = NextResponse.json({
      success: true,
      analysis,
      structuredData,
      followUpQuestions,
      ragEnabled: useRAG,
      ragContext: ragContext ? 'Context from other files included' : 'No additional context',
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: headerUserId || undefined
      }
    });

    // Add credit information to response headers for frontend
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (headerUserId) response.headers.set('x-user-id', headerUserId);

    return response;

  } catch (error) {
    console.error('Error in RAG file analysis:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(
  fileName: string, 
  fileType: string, 
  analysisType: string, 
  content: string, 
  userQuestion?: string, 
  chatHistory?: Array<{role: string, content: string}>,
  ragContext?: string
): string {
  const basePrompt = `Please analyze this ${fileType} file: "${fileName}"

File Content:
${content}${ragContext || ''}`;

  switch (analysisType) {
    case 'comprehensive':
      return `${basePrompt}

Please provide a comprehensive analysis in a natural, readable format including:
1. **Summary**: Brief overview of the document
2. **Key Points**: Important details and highlights
3. **Vendor Accountability**: Responsibilities and deliverables
4. **Important Dates**: Deadlines, milestones, and timeline items
5. **Payment Terms**: Costs, payment schedules, and financial details
6. **Cancellation Policy**: Terms for cancellation or changes

Format your response as natural, conversational text that's easy to read and understand.`;

    case 'summary':
      return `${basePrompt}

Please provide a concise summary of the key points and main purpose of this document.`;

    case 'insights':
      return `${basePrompt}

Please provide actionable insights and recommendations based on this document. Focus on what the user should know or do next.`;

    case 'questions':
      return `${basePrompt}

Based on this document, what important questions should the user ask or consider?`;

    default:
      if (userQuestion) {
        const historyContext = chatHistory ? 
          '\n\nPrevious conversation:\n' + chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') : '';
        
        return `${basePrompt}${historyContext}

User Question: ${userQuestion}

Please answer this question based on the document content.`;
      }
      return basePrompt;
  }
}

function parseStructuredData(analysis: string) {
  try {
    // Try to extract structured information from the analysis
    const summaryMatch = analysis.match(/summary[:\s]*([^\n]+)/i);
    const keyPointsMatch = analysis.match(/key points?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const vendorMatch = analysis.match(/vendor accountability[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const datesMatch = analysis.match(/important dates?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const paymentMatch = analysis.match(/payment terms?[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const cancellationMatch = analysis.match(/cancellation policy[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);

    return {
      summary: summaryMatch?.[1]?.trim() || 'Summary not found',
      keyPoints: keyPointsMatch?.[1]?.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, '').trim()) || [],
      vendorAccountability: vendorMatch?.[1]?.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, '').trim()) || [],
      importantDates: datesMatch?.[1]?.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, '').trim()) || [],
      paymentTerms: paymentMatch?.[1]?.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, '').trim()) || [],
      cancellationPolicy: cancellationMatch?.[1]?.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•*]\s*/, '').trim()) || []
    };
  } catch (error) {
    console.error('Error parsing structured data:', error);
    return null;
  }
}

function getDocumentType(fileType: string): string {
  if (fileType.includes('pdf')) return 'pdf_document';
  if (fileType.includes('text') || fileType.includes('plain')) return 'text_document';
  if (fileType.includes('word') || fileType.includes('document')) return 'word_document';
  if (fileType.includes('image')) return 'image_document';
  return 'user_document';
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleRAGFileAnalysis, {
  feature: 'file_analysis',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for file analysis. Please upgrade your plan to continue using AI features.'
});
