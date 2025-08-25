import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { AIFeature } from '@/types/credits';
import { adminDb } from '@/firebase';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateBulkVibesHandler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const moodBoardId = formData.get('moodBoardId') as string;
    const imageId = formData.get('imageId') as string;
    const userId = request.headers.get('x-user-id');

    if (!image || !moodBoardId || !imageId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (image.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log('Processing file:', image.name, 'type:', image.type, 'size:', image.size);

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    let base64String = '';
    
    // Process in chunks to prevent stack overflow
    const chunkSize = 1000;
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      const binaryString = String.fromCharCode(...chunk);
      base64String += btoa(binaryString);
    }

    console.log('Base64 string length:', base64String.length);

    // Make OpenAI API call
    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a wedding vibe expert. Analyze the provided image and extract 5 distinct wedding vibes/aesthetics that would be perfect for this couple's wedding day. 
          
          Return ONLY a JSON array of 5 vibe names, nothing else. Each vibe should be 1-3 words maximum.
          
          Examples of good vibes: "Beach", "Boho", "Rustic", "Coastal", "Natural", "Elegant", "Vintage", "Modern", "Romantic", "Minimalist"
          
          Do not include descriptions, explanations, or any other text - just the JSON array.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract 5 wedding vibes from this image:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.type};base64,${base64String}`
              }
            }
          ]
        }
      ],
      max_tokens: 100
    });

    const text = completion.choices[0]?.message?.content || '';
    console.log('OpenAI API response received');
    console.log('OpenAI response text:', text);
    console.log('OpenAI response length:', text.length);
    console.log('OpenAI response type:', typeof text);

    let vibes: string[] = [];
    try {
      vibes = JSON.parse(text);
      console.log('Successfully parsed JSON:', vibes);
    } catch (err) {
      console.error('Failed to parse JSON from OpenAI response:', err);
      
      // Try to extract content from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*(\[.*?\])\s*```/);
      if (codeBlockMatch) {
        const codeBlockContent = codeBlockMatch[1];
        console.log('Found code block content:', codeBlockContent);
        try {
          vibes = JSON.parse(codeBlockContent);
          console.log('Successfully parsed code block content:', vibes);
        } catch (codeBlockErr) {
          console.error('Failed to parse code block content:', codeBlockErr);
          return NextResponse.json(
            { error: 'Failed to parse AI response' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    if (!Array.isArray(vibes) || vibes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid vibes format received from AI' },
        { status: 500 }
      );
    }

    console.log('Successfully extracted vibes:', vibes);

    // Update the mood board with new vibes
    const moodBoardRef = adminDb.collection('users').doc(userId).collection('moodBoards').doc(moodBoardId);
    
    await moodBoardRef.update({
      vibes: adminDb.FieldValue.arrayUnion(...vibes),
      vibeInputMethod: 'image',
      updatedAt: new Date()
    });

    console.log('Returning successful response with vibes');
    return NextResponse.json({
      success: true,
      vibes,
      message: 'Vibes generated successfully'
    });

  } catch (error) {
    console.error('Error in generateBulkVibesHandler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with credit validation for bulk vibe generation (5 credits)
export const POST = withCreditValidation(generateBulkVibesHandler, {
  feature: 'bulk_vibe_generation' as AIFeature,
  userIdField: undefined, // Don't look for userId in body
  requireAuth: true,
  errorMessage: 'Not enough credits to generate bulk vibes. Please upgrade your plan or wait for daily credit refresh.'
});
