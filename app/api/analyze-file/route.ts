import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { AIFeature } from '@/types/credits';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleFileAnalysis(request: NextRequest) {
  try {
    console.log('Analyze File API called (DEPRECATED - Use /api/ai-file-analyzer-rag instead)');
    const { fileContent, fileName, fileType } = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      );
    }

    // Create a comprehensive prompt for wedding-related file analysis
    const prompt = `Analyze the following wedding-related document and extract key information:

Document: ${fileName}
Type: ${fileType}
Content: ${fileContent}

Please provide a comprehensive analysis including:

1. **Summary**: A concise 2-3 sentence summary of the document
2. **Key Points**: 3-5 most important points from the document
3. **Vendor Accountability**: Any commitments, deadlines, or responsibilities mentioned
4. **Important Dates**: Any dates, deadlines, or time-sensitive information
5. **Payment Terms**: Payment schedules, amounts, deposits, or financial obligations
6. **Cancellation Policy**: Any cancellation terms, refund policies, or penalties
7. **Risk Factors**: Potential issues, red flags, or areas of concern
8. **Recommendations**: Suggestions for next steps or actions needed

IMPORTANT: Return ONLY valid JSON with these exact keys. Do NOT wrap the response in markdown code blocks or any other formatting. Return pure JSON only:

{
  "summary": "string",
  "keyPoints": ["string"],
  "vendorAccountability": ["string"],
  "importantDates": ["string"],
  "paymentTerms": ["string"],
  "cancellationPolicy": ["string"],
  "riskFactors": ["string"],
  "recommendations": ["string"]
}

Focus on wedding-specific context and practical implications for wedding planning.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a wedding planning assistant specializing in document analysis. Extract practical, actionable insights from wedding-related documents."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Try to parse JSON response
    let analysis;
    try {
      // First, try to parse the response directly
      analysis = JSON.parse(response);
    } catch (parseError) {
      try {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find any JSON object in the response
          const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            analysis = JSON.parse(jsonObjectMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        }
      } catch (secondParseError) {
        // If all parsing fails, create a structured response from the text
        analysis = {
          summary: response.substring(0, 200) + "...",
          keyPoints: [response],
          vendorAccountability: [],
          importantDates: [],
          paymentTerms: [],
          cancellationPolicy: [],
          riskFactors: [],
          recommendations: []
        };
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      fileName,
      fileType
    });

  } catch (error) {
    console.error('Error analyzing file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleFileAnalysis, {
  feature: 'file_analysis' as AIFeature,
  userIdField: undefined, // Get userId from headers
  requireAuth: true,
  errorMessage: 'Insufficient credits for file analysis. Please upgrade your plan to continue using AI features.'
}); 