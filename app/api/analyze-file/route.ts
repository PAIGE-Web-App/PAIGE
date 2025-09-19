import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
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

Format the response as JSON with these exact keys:
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
      analysis = JSON.parse(response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
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