// app/api/draft/route.ts
import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { contact, messages } = await req.json();

    const context = messages?.length
      ? `Here is the ongoing conversation:\n${messages.map((m: any) => `- ${m}`).join("\n")}`
      : `You're writing the first message to a ${contact.category} named ${contact.name}.`;

    const prompt = `${context}\n\nWrite a friendly, professional message using email tone.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a smart wedding planner assistant that writes thoughtful emails." },
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
