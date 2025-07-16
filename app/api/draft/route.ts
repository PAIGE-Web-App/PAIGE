// app/api/draft/route.ts
import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Draft API received body:", body);
    const { contact, messages, isReply, originalSubject, originalFrom } = body;

    let context;
    let prompt;
    
    if (isReply && messages?.length) {
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
        { role: "system", content: isReply 
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
