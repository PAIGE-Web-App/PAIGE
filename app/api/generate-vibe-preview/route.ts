import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      vibes, 
      boardType, 
      context, 
      weddingLocation, 
      completedTodos, 
      pendingTodos, 
      selectedVendors 
    } = await request.json();

    if (!vibes || !Array.isArray(vibes) || vibes.length === 0) {
      return NextResponse.json(
        { error: 'Vibes are required and must be an array' },
        { status: 400 }
      );
    }

    // Generate a natural-sounding message based on vibes and board type
    const message = generateVibeMessage(vibes, boardType, context, {
      weddingLocation,
      completedTodos,
      pendingTodos,
      selectedVendors
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating vibe preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview message' },
      { status: 500 }
    );
  }
}

interface ContextData {
  weddingLocation?: string;
  completedTodos?: string[];
  pendingTodos?: string[];
  selectedVendors?: string[];
}

function generateVibeMessage(vibes: string[], boardType: string, context: string, contextData?: ContextData): string {
  const boardTypeLabel = boardType === 'wedding-day' ? 'wedding' : 
                        boardType === 'reception' ? 'reception' : 
                        boardType === 'engagement' ? 'engagement' : 'event';
  
  // Limit vibes to first 4 for natural integration
  const limitedVibes = vibes.slice(0, 4);
  const vibeText = limitedVibes.join(', ');
  
  // Build context-specific details
  let locationContext = '';
  if (contextData?.weddingLocation) {
    locationContext = ` in ${contextData.weddingLocation}`;
  }
  
  let progressContext = '';
  if (contextData?.completedTodos && contextData.completedTodos.length > 0) {
    const completedCount = contextData.completedTodos.length;
    progressContext = ` We've already ${completedCount > 1 ? 'completed several tasks' : 'made great progress'} like ${contextData.completedTodos.slice(0, 2).join(' and ')}.`;
  }
  
  let vendorContext = '';
  if (contextData?.selectedVendors && contextData.selectedVendors.length > 0) {
    vendorContext = ` We've already connected with ${contextData.selectedVendors.slice(0, 2).join(' and ')}.`;
  }
  
  // Create enhanced, context-aware messages
  const templates = [
    `Hi there! 👋

I'm planning my ${boardTypeLabel}${locationContext} and I'm absolutely obsessed with your work! I'm going for a ${vibeText} aesthetic, and I think you'd be perfect for bringing this vision to life.${progressContext}${vendorContext}

Could you tell me more about your services and availability? I'd love to chat about how we can work together to create something truly magical.

Thanks so much!
[Your name]`,

    `Hello! ✨

I'm in the early stages of planning my ${boardTypeLabel}${locationContext} and I'm so excited to connect with you! I'm envisioning a ${vibeText} atmosphere, and your portfolio really speaks to that style.${progressContext}${vendorContext}

I'd love to learn more about your packages and how you work with couples. Do you have any availability for [your date]?

Looking forward to hearing from you!
[Your name]`,

    `Hi! 🌟

I'm planning my ${boardTypeLabel}${locationContext} and I'm going for a ${vibeText} vibe. Your work is exactly the kind of aesthetic I'm looking for!${progressContext}${vendorContext}

Could you share some details about your services and pricing? I'd love to see if we're a good fit to work together.

Thanks for your time!
[Your name]`
  ];

  // Randomly select a template for variety
  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return selectedTemplate;
}
