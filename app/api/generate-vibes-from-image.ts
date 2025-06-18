import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      console.error('No image uploaded.');
      return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are a wedding style expert. Look at the uploaded wedding inspiration image and return a JSON array of 3-7 short, relevant wedding style or vibe words (e.g., "boho", "modern", "romantic", "garden", "classic"). Only return the array, no explanation.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
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

    // Try to extract the array from the response
    const text = response.choices[0]?.message?.content || '';
    console.log('OpenAI response text:', text);
    let vibes: string[] = [];
    try {
      vibes = JSON.parse(text);
    } catch (err) {
      // Try to extract array from text
      const match = text.match(/\[(.*?)\]/);
      if (match) {
        try {
          vibes = JSON.parse(match[0]);
        } catch (err2) {
          console.error('Failed to parse vibes from match:', err2);
        }
      } else {
        console.error('No array match in OpenAI response.');
      }
    }
    if (!Array.isArray(vibes) || vibes.length === 0) {
      console.error('Could not extract vibes from OpenAI response.');
      return NextResponse.json({ error: 'Could not extract vibes.' }, { status: 500 });
    }
    return NextResponse.json({ vibes });
  } catch (err) {
    console.error('Failed to process image:', err);
    return NextResponse.json({ error: 'Failed to process image.' }, { status: 500 });
  }
} 