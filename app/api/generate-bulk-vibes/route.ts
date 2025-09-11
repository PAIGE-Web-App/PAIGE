import { NextRequest, NextResponse } from 'next/server';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { AIFeature } from '@/types/credits';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { ragContextCache } from '@/lib/ragContextCache';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';

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

    // RAG Week 2: Retrieve cached context for bulk vibe generation
    const ragContext = await ragContextCache.getCachedContext(userId, 'bulk_vibe_generation');

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

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 using a more reliable method
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64String = btoa(binaryString);

    // Base prompt for bulk vibe generation
    const basePrompt = `You are a wedding vibe expert. Analyze the provided image and extract 5 distinct wedding vibes/aesthetics that would be perfect for this couple's wedding day. Even if the image isn't directly wedding-related, extract style elements that could inspire wedding themes (e.g., colors, textures, moods, settings).
    
    Return ONLY a valid JSON array of exactly 5 vibe names, nothing else. Each vibe should be 1-3 words maximum.
    
    Examples of good vibes: "Beach", "Boho", "Rustic", "Coastal", "Natural", "Elegant", "Vintage", "Modern", "Romantic", "Minimalist", "Garden", "Timeless", "Glamorous", "Cozy", "Dramatic"
    
    Always return a valid JSON array, even if the image is abstract or non-wedding related. Only return the array, no explanation.`;

    // RAG Week 2: Optimize prompt with user context and behavior patterns
    const { optimizedPrompt } = await smartPromptOptimizer.optimizePrompt(
      userId, 
      basePrompt, 
      ragContext || '', 
      'bulk_vibe_generation',
      ['wedding', 'style', 'aesthetic', 'bulk']
    );

    // Make OpenAI API call with optimized prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: optimizedPrompt
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

    let vibes: string[] = [];
    try {
      vibes = JSON.parse(text);
    } catch (err) {
      // Try to extract content from markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*(\[.*?\])\s*```/);
      if (codeBlockMatch) {
        const codeBlockContent = codeBlockMatch[1];
        try {
          vibes = JSON.parse(codeBlockContent);
        } catch (codeBlockErr) {
          return NextResponse.json(
            { error: 'Failed to parse AI response' },
            { status: 500 }
          );
        }
      } else {
        // If no valid JSON found, return default vibes
        vibes = ['Romantic', 'Elegant', 'Natural', 'Modern', 'Timeless'];
      }
    }

    if (!Array.isArray(vibes) || vibes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid vibes format received from AI' },
        { status: 500 }
      );
    }

    // Update the mood board with new vibes
    const moodBoardRef = adminDb.collection('users').doc(userId).collection('moodBoards').doc(moodBoardId);
    
    // Use set with merge to create document if it doesn't exist
    await moodBoardRef.set({
      vibes: FieldValue.arrayUnion(...vibes),
      vibeInputMethod: 'image',
      updatedAt: new Date()
    }, { merge: true });

    // RAG Week 2: Track prompt effectiveness and cache context
    try {
      await smartPromptOptimizer.trackPromptEffectiveness(
        userId,
        'bulk_vibe_generation',
        ['wedding', 'style', 'aesthetic', 'bulk'],
        vibes
      );
      
      // Cache the context for future use
      await ragContextCache.cacheContext(
        userId, 
        'bulk_vibe_generation', 
        JSON.stringify({
          lastUsed: new Date().toISOString(),
          vibesGenerated: vibes,
          imageProcessed: true,
          promptOptimized: true,
          bulkGeneration: true
        })
      );
    } catch (error) {
      console.error('Error in continuous improvement tracking:', error);
      // Don't fail the request if tracking fails
    }

    return NextResponse.json({
      success: true,
      vibes,
      message: 'Vibes generated successfully',
      cacheInfo: {
        contextRetrieved: !!ragContext,
        promptOptimized: true,
        contextCached: true
      }
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
