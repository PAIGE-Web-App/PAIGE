import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { AIFeature } from '@/types/credits';

async function handleVibeGeneration(req: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
    }

    // Check Content-Type and handle both multipart/form-data and application/json
    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const formFile = formData.get('image');
      if (!formFile || typeof formFile === 'string') {
        console.error('No image uploaded in form data.');
        return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
      }
      file = formFile as File;
    } else {
      console.error('Invalid Content-Type. Expected multipart/form-data, got:', contentType);
      return NextResponse.json({ error: 'Invalid Content-Type. Expected multipart/form-data.' }, { status: 400 });
    }

    if (!file) {
      console.error('No image file found.');
      return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
    }

    console.log('Processing image:', file.name, file.type, file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are a wedding style expert. Look at the uploaded wedding inspiration image and return a JSON array of 3-7 short, relevant wedding style or vibe words that are commonly used to describe wedding aesthetics (e.g., 'romantic', 'boho', 'modern', 'garden', 'timeless', 'vintage', 'glamorous', etc.), not generic moods or adjectives. The words should be wedding-specific, in sentence case, and not limited to a fixed list. Only return the array, no explanation.`;

    console.log('Calling OpenAI API...');
    
    let response;
    try {
      // Use gpt-4o (current vision model)
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${file.type};base64,${buffer.toString('base64')}` } },
            ],
          },
        ],
        max_tokens: 200,
      });
      console.log('OpenAI API call successful with gpt-4o');
    } catch (visionError) {
      console.log('gpt-4o failed, trying alternative approach...', visionError);
      
      // Fallback to gpt-4o
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${file.type};base64,${buffer.toString('base64')}` } },
            ],
          },
        ],
        max_tokens: 200,
      });
      console.log('OpenAI API call successful with gpt-4o');
    }

    // Try to extract the array from the response
    const text = response.choices[0]?.message?.content || '';
    console.log('OpenAI response text:', text);
    let vibes: string[] = [];
    
    // First try to parse as JSON
    try {
      vibes = JSON.parse(text);
    } catch (err) {
      console.log('Failed to parse as JSON, trying to extract array...');
      
      // Try to extract array from text using regex
      const match = text.match(/\[(.*?)\]/);
      if (match) {
        try {
          vibes = JSON.parse(match[0]);
        } catch (err2) {
          console.error('Failed to parse vibes from match:', err2);
        }
      } else {
        // Try to extract individual words/phrases
        const words = text
          .replace(/[\[\]"]/g, '') // Remove brackets and quotes
          .split(/[,\n]/) // Split by comma or newline
          .map(word => word.trim())
          .filter(word => word.length > 0 && word !== 'and' && word !== 'or');
        
        if (words.length > 0) {
          vibes = words;
        } else {
          console.error('No array match in OpenAI response.');
        }
      }
    }
    
    if (!Array.isArray(vibes) || vibes.length === 0) {
      console.error('Could not extract vibes from OpenAI response. Text was:', text);
      return NextResponse.json({ error: 'Could not extract vibes.' }, { status: 500 });
    }
    
    console.log('Extracted vibes:', vibes);
    return NextResponse.json({ vibes });
  } catch (err) {
    console.error('Failed to process image:', err);
    
    // Check for specific error types
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return NextResponse.json({ error: 'OpenAI API key is invalid or missing.' }, { status: 500 });
      } else if (err.message.includes('model')) {
        return NextResponse.json({ error: 'OpenAI model is not available.' }, { status: 500 });
      } else if (err.message.includes('rate limit')) {
        return NextResponse.json({ error: 'OpenAI rate limit exceeded. Please try again later.' }, { status: 429 });
      } else if (err.message.includes('quota')) {
        return NextResponse.json({ error: 'OpenAI quota exceeded. Please try again later.' }, { status: 429 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to process image. Please try again.' }, { status: 500 });
  }
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleVibeGeneration, {
  feature: 'vibe_generation' as AIFeature,
  userIdField: undefined, // Get userId from headers
  requireAuth: true,
  errorMessage: 'Insufficient credits for vibe generation. Please upgrade your plan to continue using AI features.'
});