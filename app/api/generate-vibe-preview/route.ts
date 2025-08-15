import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { vibes, boardType, context } = await request.json();

    if (!vibes || !Array.isArray(vibes) || vibes.length === 0) {
      return NextResponse.json(
        { error: 'Vibes are required and must be an array' },
        { status: 400 }
      );
    }

    // Generate a natural-sounding message based on vibes and board type
    const message = generateVibeMessage(vibes, boardType, context);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating vibe preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview message' },
      { status: 500 }
    );
  }
}

function generateVibeMessage(vibes: string[], boardType: string, context: string): string {
  const boardTypeLabel = boardType === 'wedding-day' ? 'wedding' : 
                        boardType === 'reception' ? 'reception' : 
                        boardType === 'engagement' ? 'engagement' : 'event';
  
  const vibeText = vibes.join(', ');
  
  // Create natural, friendly messages that weave in the vibes
  const templates = [
    `Hi there! 👋

I'm planning my ${boardTypeLabel} and I'm absolutely obsessed with your work! I'm going for a ${vibeText} aesthetic, and I think you'd be perfect for bringing this vision to life.

Could you tell me more about your services and availability? I'd love to chat about how we can work together to create something truly magical.

Thanks so much!
[Your name]`,

    `Hello! ✨

I'm in the early stages of planning my ${boardTypeLabel} and I'm so excited to connect with you! I'm envisioning a ${vibeText} atmosphere, and your portfolio really speaks to that style.

I'd love to learn more about your packages and how you work with couples. Do you have any availability for [your date]?

Looking forward to hearing from you!
[Your name]`,

    `Hi! 🌟

I'm planning my ${boardTypeLabel} and I'm going for a ${vibeText} vibe. Your work is exactly the kind of aesthetic I'm looking for!

Could you share some details about your services and pricing? I'd love to see if we're a good fit to work together.

Thanks for your time!
[Your name]`
  ];

  // Randomly select a template for variety
  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return selectedTemplate;
}
