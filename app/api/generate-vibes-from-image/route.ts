import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { AIFeature } from '@/types/credits';
import { ragContextCache } from '@/lib/ragContextCache';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';
import { adminDb } from '@/lib/firebaseAdmin';



async function generateVibesHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      console.error('No image uploaded.');
      return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
    }

    // Get user ID from headers (set by credit middleware)
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID not found.' }, { status: 400 });
    }

    // RAG Week 2: Retrieve cached context for vibe generation
    const ragContext = await ragContextCache.getCachedContext(userId, 'vibe_generation');
    console.log('RAG context retrieved for vibe generation:', ragContext ? 'Found' : 'Not found');
    
    console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);
    
    // Check file size to prevent stack overflow issues
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxFileSize) {
      console.error('File too large:', file.size, 'bytes');
      return NextResponse.json({ success: false, error: 'File too large. Please use an image smaller than 10MB.' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert to base64 using a safe method that prevents stack overflow
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    
    // Process in smaller chunks to avoid stack overflow
    const chunkSize = 1000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, uint8Array.length);
      for (let j = i; j < end; j++) {
        binaryString += String.fromCharCode(uint8Array[j]);
      }
    }
    
    const base64String = btoa(binaryString);
    
    console.log('Base64 string length:', base64String.length);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Base prompt for vibe generation
    const basePrompt = `You are a wedding style expert. Analyze the uploaded image and return a JSON array of 3-7 wedding style or vibe words that could apply to wedding aesthetics. Even if the image isn't directly wedding-related, extract style elements that could inspire wedding themes (e.g., colors, textures, moods, settings). Use words like 'romantic', 'boho', 'modern', 'garden', 'timeless', 'vintage', 'glamorous', 'rustic', 'elegant', 'cozy', 'dramatic', etc. Always return a valid JSON array, even if the image is abstract or non-wedding related. Only return the array, no explanation.`;

    // RAG Week 2: Optimize prompt with user context and behavior patterns
    const { optimizedPrompt } = await smartPromptOptimizer.optimizePrompt(
      userId, 
      basePrompt, 
      ragContext || '', 
      'vibe_generation',
      ['wedding', 'style', 'aesthetic']
    );

    console.log('Making OpenAI API call with optimized prompt...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: optimizedPrompt,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: optimizedPrompt },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64String}` } },
          ],
        },
      ],
      max_tokens: 200,
    });
    
    console.log('OpenAI API response received');

    // Try to extract the array from the response
    const text = response.choices[0]?.message?.content || '';
    console.log('OpenAI response text:', text);
    console.log('OpenAI response length:', text.length);
    console.log('OpenAI response type:', typeof text);
    
    // Safety check for empty or invalid response
    if (!text || typeof text !== 'string') {
      console.error('Invalid OpenAI response:', text);
      return NextResponse.json({ success: false, error: 'Invalid response from AI service.' }, { status: 500 });
    }
    
    let vibes: string[] = [];
    try {
      vibes = JSON.parse(text);
      console.log('Successfully parsed JSON:', vibes);
    } catch (err) {
      console.error('Failed to parse JSON from OpenAI response:', err);
      
      // Try to extract JSON from markdown code blocks
      let codeBlockContent = text;
      
      // Remove markdown code block markers safely
      if (text.includes('```')) {
        // Find content between code blocks
        const startIndex = text.indexOf('```');
        const endIndex = text.lastIndexOf('```');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          codeBlockContent = text.substring(startIndex + 3, endIndex).trim();
          // Remove any remaining "json" label
          if (codeBlockContent.startsWith('json')) {
            codeBlockContent = codeBlockContent.substring(4).trim();
          }
        }
      }
      
      if (codeBlockContent.startsWith('[') && codeBlockContent.endsWith(']')) {
        console.log('Found code block content:', codeBlockContent);
        try {
          vibes = JSON.parse(codeBlockContent);
          console.log('Successfully parsed code block content:', vibes);
        } catch (err2) {
          console.error('Failed to parse vibes from code block content:', err2);
        }
      } else {
        // Try to extract array from text
        const match = text.match(/\[(.*?)\]/);
        if (match) {
          console.log('Found array match:', match[0]);
          try {
            vibes = JSON.parse(match[0]);
            console.log('Successfully parsed match:', vibes);
          } catch (err2) {
            console.error('Failed to parse vibes from match:', err2);
          }
        } else {
          console.error('No array match in OpenAI response.');
          console.log('Full response text for debugging:', text);
        }
      }
    }
    
    if (!Array.isArray(vibes) || vibes.length === 0) {
      console.error('Could not extract vibes from OpenAI response.');
      return NextResponse.json({ success: false, error: 'Could not extract vibes.' }, { status: 500 });
    }
    
    console.log('Successfully extracted vibes:', vibes);
    
    // RAG Week 2: Track prompt effectiveness and cache context
    try {
      await smartPromptOptimizer.trackPromptEffectiveness(
        userId,
        'vibe_generation',
        ['wedding', 'style', 'aesthetic'],
        vibes
      );
      
      // Cache the context for future use
      await ragContextCache.cacheContext(
        userId, 
        'vibe_generation', 
        JSON.stringify({
          lastUsed: new Date().toISOString(),
          vibesGenerated: vibes,
          imageProcessed: true,
          promptOptimized: true
        })
      );
    } catch (error) {
      console.error('Error in continuous improvement tracking:', error);
      // Don't fail the request if tracking fails
    }
    
    console.log('Returning successful response with vibes');
    return NextResponse.json({ 
      success: true, 
      vibes,
      cacheInfo: {
        contextRetrieved: !!ragContext,
        promptOptimized: true,
        contextCached: true
      }
    });
  } catch (err) {
    console.error('Failed to process image:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to process image: ${errorMessage}` }, { status: 500 });
  }
}

// Export the handler wrapped with credit validation
export const POST = withCreditValidation(generateVibesHandler, {
  feature: 'vibe_generation' as AIFeature,
  userIdField: undefined, // Don't look for userId in body
  requireAuth: true,
  errorMessage: 'Not enough credits to generate vibes from image. Please upgrade your plan or wait for daily credit refresh.'
}); 