// app/api/draft/route.ts
import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Draft API received body:", body);
    const { contact, messages, isReply, originalSubject, originalFrom, vibeContext } = body;

    let context;
    let prompt;
    
    if (vibeContext) {
      // Generate vibe-integrated message
      const boardTypeLabel = vibeContext.boardType === 'wedding-day' ? 'wedding' : 
                            vibeContext.boardType === 'reception' ? 'reception' : 
                            vibeContext.boardType === 'engagement' ? 'engagement' : 'event';
      
      let locationContext = '';
      if (vibeContext.weddingLocation) {
        locationContext = ` in ${vibeContext.weddingLocation}`;
      }
      
      let vendorContext = '';
      if (vibeContext.selectedVendors && vibeContext.selectedVendors.length > 0) {
        vendorContext = ` We've already connected with ${vibeContext.selectedVendors.slice(0, 1)}.`;
      }
      
      context = `You're writing a short, friendly message to a vendor for your ${boardTypeLabel}${locationContext}. Your aesthetic vibes are: ${vibeContext.vibes.join(', ')}.${vendorContext}`;
      prompt = `${context}\n\nWrite a brief, friendly message (2-3 sentences max) that naturally mentions your vibes. Keep it short and sweet - you're a couple planning your wedding, not a wedding planner. Don't use placeholders like [Vendor Name] or [Your Name] - write as if you're speaking directly to them.`;
    } else if (isReply && messages?.length) {
      // Generate a reply to the original message
      context = `You're replying to a message from ${contact.name}.\n\nOriginal message:\n"${messages[0]}"\n\nOriginal subject: ${originalSubject || 'No subject'}\nFrom: ${originalFrom || 'Unknown'}`;
      prompt = `${context}\n\nWrite a thoughtful, professional response that addresses their message appropriately. Keep it friendly and engaging.`;
    } else if (messages?.length) {
      // Ongoing conversation
      context = `Here is the ongoing conversation:\n${messages.map((m: any) => `- ${m}`).join("\n")}`;
      prompt = `${context}\n\nWrite a friendly, professional message using email tone.`;
    } else {
      // First message
      context = `You're writing the first message to a ${contact.category} named ${contact.name}.`;
      prompt = `${context}\n\nWrite a friendly, professional message using email tone.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: vibeContext 
          ? "You are a friendly person planning your own wedding who writes short, personal messages to vendors. You're not a wedding planner - you're a couple reaching out to vendors for your special day. Keep messages brief, warm, and authentic."
          : isReply 
            ? "You are a friendly person that's looking to get married that writes thoughtful email responses. When replying, be responsive to the original message content and maintain a conversational tone."
            : "You are a friendly person that's looking to get married that writes thoughtful emails."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return NextResponse.json({ draft: completion.choices[0].message.content });
  } catch (error: any) {
    console.error("Error in /api/draft:", error);
    return new NextResponse("Failed to generate draft message.", { status: 500 });
  }
}
