import { NextRequest, NextResponse } from 'next/server';
import { timelineService } from '@/lib/timelineService';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { MessageAnalysisEngine } from '@/utils/messageAnalysisEngine';
import OpenAI from 'openai';

const messageAnalysisEngine = new MessageAnalysisEngine();

interface TimelineGenerationRequest {
  userId: string;
  weddingDate: string;
  weddingLocation: string;
  guestCount: number;
  weddingDayTodos?: Array<{
    id: string;
    name: string;
    note?: string;
    category?: string;
  }>;
  templateId?: string;
  templateEvents?: Array<{
    name: string;
    time: string;
    duration: string;
    description?: string;
    category?: string;
  }>;
}

async function handleTimelineGeneration(req: NextRequest): Promise<NextResponse> {
  try {
    const { 
      userId, 
      weddingDate, 
      weddingLocation, 
      guestCount, 
      weddingDayTodos,
      templateId,
      templateEvents
    }: TimelineGenerationRequest = await req.json();

    if (!userId || !weddingDate || !weddingLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, weddingDate, weddingLocation' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const weddingDateObj = new Date(weddingDate);
    
    // Get vendors for timeline generation (use empty array if fails due to server-side permissions)
    let vendors: any[] = [];
    try {
      vendors = await timelineService.getVendors(userId);
    } catch (error) {
      console.log('Could not fetch vendors (server-side), continuing with empty vendor list');
      vendors = [];
    }
    
    // Determine if we're using a template or generating from todos
    if (templateId && templateEvents) {
      // Create timeline directly from template events (no AI generation needed)
      const timeline = await timelineService.createTimeline(userId, {
        userId,
        name: 'Wedding Day Timeline',
        weddingDate: weddingDateObj,
        isActive: true,
        events: templateEvents.map((event, index) => ({
          id: `event-${index}`,
          title: event.name,
          startTime: new Date(`${weddingDateObj.toDateString()} ${event.time}`),
          endTime: new Date(`${weddingDateObj.toDateString()} ${event.time}`), // Will be calculated based on duration
          duration: 60, // Default 1 hour duration in minutes
          location: weddingLocation,
          description: event.description || '',
          bufferTime: 15, // Default 15 minutes buffer
          isCritical: false,
          status: 'pending' as const,
          category: event.category || 'wedding',
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });

      return NextResponse.json({
        success: true,
        timeline
      });
    } else {
      // Generate timeline using AI from todos (or default timeline if no todos)
      const todosToUse = weddingDayTodos && weddingDayTodos.length > 0 ? weddingDayTodos : [];

      const aiPrompt = buildTimelinePrompt(
        todosToUse,
        vendors,
        weddingDateObj,
        weddingLocation,
        guestCount
      );

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a wedding planning expert AI assistant. Generate a detailed wedding day timeline based on the provided information. Consider vendor setup times, buffer periods, and optimal flow for a stress-free wedding day.`
        },
        {
          role: 'user',
          content: aiPrompt
        }
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response and create timeline events
    const timelineEvents = parseTimelineResponse(aiResponse, weddingDateObj, weddingLocation, vendors);
    
    // Create timeline
    const timeline = await timelineService.createTimeline(userId, {
      userId,
      name: 'Wedding Day Timeline',
      weddingDate: weddingDateObj,
      events: timelineEvents,
      isActive: true
    });

    // Get credit information from request headers
    const creditsRequired = req.headers.get('x-credits-required');
    const creditsRemaining = req.headers.get('x-credits-remaining');

    const response = NextResponse.json({
      success: true,
      timeline,
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0
      }
    });

      // Add credit information to response headers
      if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
      if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);

      return response;
    }
  } catch (error) {
    console.error('Error generating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function buildTimelinePrompt(
  todos: Array<{ id: string; name: string; note?: string; category?: string }>,
  vendors: any[],
  weddingDate: Date,
  weddingLocation: string,
  guestCount: number
): string {
  const todoList = todos.map(todo => 
    `- ${todo.name}${todo.category ? ` (${todo.category})` : ''}${todo.note ? ` - ${todo.note}` : ''}`
  ).join('\n');

  const vendorList = vendors.map(vendor => 
    `- ${vendor.name} (${vendor.category || 'Unknown'})${vendor.phone ? ` - ${vendor.phone}` : ''}`
  ).join('\n');

  return `
Create a detailed wedding day timeline for the following information:

WEDDING DETAILS:
- Date: ${weddingDate.toLocaleDateString()}
- Location: ${weddingLocation}
- Guest Count: ${guestCount}

TODO ITEMS TO INCLUDE:
${todoList}

AVAILABLE VENDORS:
${vendorList}

TIMELINE REQUIREMENTS:
1. Start timeline at 6:00 AM for vendor setup
2. Include buffer time between events (15-30 minutes)
3. Consider vendor setup and breakdown times
4. Mark critical events that cannot be moved
5. Include vendor contact information where available
6. End timeline by midnight
7. Consider guest flow and venue logistics

OUTPUT FORMAT (JSON):
{
  "events": [
    {
      "title": "Event Title",
      "description": "Detailed description",
      "startHour": 6,
      "startMinute": 0,
      "duration": 60,
      "category": "category",
      "location": "Location",
      "vendorName": "Vendor Name (if applicable)",
      "vendorContact": "Contact Info (if available)",
      "isCritical": true/false,
      "bufferTime": 15
    }
  ]
}

Generate a realistic, well-paced timeline that ensures a smooth wedding day flow.
`;
}

function parseTimelineResponse(
  aiResponse: string, 
  weddingDate: Date, 
  weddingLocation: string,
  vendors: any[]
): any[] {
  try {
    // Try to parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.events && Array.isArray(parsed.events)) {
        const processedEvents: any[] = [];
        
        parsed.events.forEach((event: any, index: number) => {
          let startTime: Date;
          
          if (index === 0) {
            // First event starts at the specified time
            startTime = new Date(
              weddingDate.getFullYear(),
              weddingDate.getMonth(),
              weddingDate.getDate(),
              event.startHour || 6,
              event.startMinute || 0
            );
          } else {
            // Subsequent events start after previous event's end time + buffer time
            const previousEvent = processedEvents[index - 1];
            const previousEndTime = previousEvent.endTime.getTime();
            const bufferTimeMs = (previousEvent.bufferTime || 15) * 60 * 1000;
            startTime = new Date(previousEndTime + bufferTimeMs);
          }
          
          const endTime = new Date(startTime.getTime() + (event.duration || 60) * 60000);

          processedEvents.push({
            id: `event-${index}`,
            title: event.title,
            description: event.description,
            startTime,
            endTime,
            duration: event.duration || 60,
            location: event.location || weddingLocation,
            vendorName: event.vendorName,
            vendorContact: event.vendorContact,
            category: event.category,
            bufferTime: event.bufferTime || 15,
            isCritical: event.isCritical || false,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
        
        return processedEvents;
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  // Fallback: create basic timeline
  return timelineService.generateTimelineEvents([], vendors, weddingDate, weddingLocation);
}

export const POST = withCreditValidation(handleTimelineGeneration, { 
  feature: 'timeline_generation',
  userIdField: 'userId'
});
