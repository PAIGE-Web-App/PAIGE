import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { template } = body;
    const prompt = `Suggest 3 creative, concise list names for a to-do or planning list${template ? ` with the theme: ${template}` : ''}. Return only the names, separated by newlines.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates creative list names.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 60,
    });

    const content = completion.choices[0].message.content || '';
    const suggestions = content
      .split('\n')
      .map(s => s.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating list name suggestions:', error);
    return new NextResponse('Failed to generate suggestions.', { status: 500 });
  }
} 