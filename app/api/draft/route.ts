// app/api/draft/route.ts
import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";
import { userContextBuilder } from "../../../utils/userContextBuilder";
import { adminDb } from "../../../lib/firebaseAdmin";
import { withCreditValidation } from "../../../lib/creditMiddleware";
import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { ragContextCache } from '@/lib/ragContextCache';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Main handler function
async function handleDraftGeneration(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { contact, messages, isReply, originalSubject, originalFrom, vibeContext, userId, userData } = body;
    
    // Validate required fields
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      );
    }
    
    if (!contact.name) {
      return NextResponse.json(
        { error: 'Contact name is required' },
        { status: 400 }
      );
    }

    // Get user context from frontend (most secure and performant approach)
    let userContext: any = null;
    
    if (userData) {
      // Use frontend user data (most reliable)
      userContext = {
        userName: userData.userName || null,
        partnerName: userData.partnerName || null,
        weddingDate: userData.weddingDate ? new Date(userData.weddingDate) : null,
        weddingLocation: userData.weddingLocation || null,
        hasVenue: userData.hasVenue || null,
        guestCount: userData.guestCount || null,
        maxBudget: userData.maxBudget || null,
        vibe: userData.vibe || [],
        daysUntilWedding: userData.weddingDate ? Math.ceil((new Date(userData.weddingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
        planningStage: userData.weddingDate ? (Math.ceil((new Date(userData.weddingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 180 ? 'early' : Math.ceil((new Date(userData.weddingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 60 ? 'mid' : 'late') : 'unknown',
        lastUpdated: new Date(),
        contextVersion: "1.0"
      };
      console.log("Draft API - User context built from frontend data:", userContext);
    } else if (userId) {
      // Fallback to server-side (for backward compatibility)
      console.log("Draft API - No frontend user data, attempting server-side fallback");
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const serverUserData = userDoc.data();
          if (serverUserData) {
            userContext = {
              userName: serverUserData.userName || null,
              partnerName: serverUserData.partnerName || null,
              weddingDate: serverUserData?.weddingDate ? (serverUserData.weddingDate.toDate ? serverUserData.weddingDate.toDate() : new Date(serverUserData.weddingDate)) : null,
              weddingLocation: serverUserData.weddingLocation || null,
              hasVenue: serverUserData.hasVenue || null,
              guestCount: serverUserData.guestCount || null,
              maxBudget: serverUserData.maxBudget || null,
              vibe: serverUserData.vibe || [],
              daysUntilWedding: serverUserData?.weddingDate ? (() => {
                const weddingDate = serverUserData.weddingDate.toDate ? serverUserData.weddingDate.toDate() : new Date(serverUserData.weddingDate);
                return Math.ceil((weddingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              })() : null,
              planningStage: serverUserData?.weddingDate ? (() => {
                const weddingDate = serverUserData.weddingDate.toDate ? serverUserData.weddingDate.toDate() : new Date(serverUserData.weddingDate);
                const daysUntil = Math.ceil((weddingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 180 ? 'early' : daysUntil > 60 ? 'mid' : 'late';
              })() : 'unknown',
              lastUpdated: new Date(),
              contextVersion: "1.0"
            };
            console.log("Draft API - User context built from server fallback:", userContext);
          }
        }
      } catch (error) {
        console.error("Draft API - Server fallback also failed:", error);
      }
    }

    let context;
    let prompt;
    
    if (vibeContext) {
      // Generate vibe-integrated message with enhanced context
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
      
      // Enhanced context with user data
      let enhancedContext = `You're writing a short, friendly message to a vendor for your ${boardTypeLabel}${locationContext}. Your aesthetic vibes are: ${vibeContext.vibes.join(', ')}.${vendorContext}`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
      prompt = `${context}\n\nWrite a brief, friendly message (2-3 sentences max) that naturally mentions your vibes and feels personal to your situation. Keep it short and sweet - you're a couple planning your wedding, not a wedding planner. Don't use placeholders like [Vendor Name] or [Your Name] - write as if you're speaking directly to them.`;

      // Add signature formatting instruction for vibe context
      if (userContext?.userName) {
        prompt += `\n\nSIGNATURE FORMAT: End with "Warm regards," on one line, then "${userContext.userName}" on the next line.`;
      }
    } else if (isReply && messages?.length) {
      // Generate a reply to the original message with enhanced context
      let enhancedContext = `You're replying to a message from ${contact.name}.\n\nOriginal message:\n"${messages[0]}"\n\nOriginal subject: ${originalSubject || 'No subject'}\nFrom: ${originalFrom || 'Unknown'}`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
      prompt = `${context}\n\nWrite a thoughtful, professional response that addresses their message appropriately. Keep it friendly and engaging, and feel free to reference your wedding planning context if relevant.`;
    } else if (messages?.length) {
      // Ongoing conversation with enhanced context
      let enhancedContext = `Here is the ongoing conversation:\n${messages.map((m: any) => `- ${m}`).join("\n")}`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
      prompt = `${context}\n\nWrite a friendly, professional message using email tone. Consider your wedding planning context when appropriate.`;
    } else {
      // First message with enhanced context
      const contactCategory = contact.category || 'vendor'; // Default to 'vendor' if category is missing
      let enhancedContext = `You're writing the first message to a ${contactCategory} named ${contact.name}.`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
      prompt = `${context}\n\nWrite a friendly, professional message using email tone. Make it personal to your wedding planning situation.`;

      // Add explicit instructions about using real data
      if (userContext) {
        prompt += `\n\nCRITICAL INSTRUCTIONS:`;
        if (userContext.weddingDate) {
          prompt += `\n- Use the actual wedding date: ${userContext.weddingDate.toLocaleDateString()}`;
        }
        if (userContext.partnerName) {
          prompt += `\n- Use the actual partner name: ${userContext.partnerName}`;
        }
        if (userContext.weddingLocation) {
          prompt += `\n- Use the actual location: ${userContext.weddingLocation}`;
        }
        if (userContext.userName) {
          prompt += `\n- Use the actual user name: ${userContext.userName}`;
        }
        prompt += `\n- NEVER use placeholders like [Date], [Partner's Name], [Location], or [Your Contact Information]`;
        prompt += `\n- Replace ALL placeholders with the actual information provided above`;
      }
    }

    // Get RAG context if available
    let ragContext = '';
    let contextSource = 'none';
    let optimizationApplied = false;
    
    try {
      // Try to get cached RAG context
      const cachedContext = await ragContextCache.getCachedContext(userId, 'draft_messaging');
      if (cachedContext) {
        ragContext = cachedContext;
        contextSource = 'cache';
      } else {
        // Generate new RAG context if needed
        const ragQuery = `Generate context for drafting a message to ${contact.name} (${contact.category})`;
        const ragResult = await ragService.processQuery({
          query: ragQuery,
          user_id: userId
        });
        if (ragResult.answer) {
          ragContext = ragResult.answer;
          contextSource = 'rag';
          // Cache the context for future use
          ragContextCache.cacheContext(userId, 'draft_messaging', ragResult.answer);
        }
      }
      
      // Apply smart prompt optimization
      const optimizationResult = await smartPromptOptimizer.optimizePrompt(
        userId,
        prompt,
        ragContext,
        'draft_messaging',
        [contact.category]
      );
      if (optimizationResult.optimizedPrompt !== prompt) {
        prompt = optimizationResult.optimizedPrompt;
        optimizationApplied = true;
      }
    } catch (ragError) {
      console.error('RAG optimization failed:', ragError);
      // Continue without RAG if it fails
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(userContext, vibeContext, isReply) },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;

    // Track prompt effectiveness for continuous improvement
    try {
      await smartPromptOptimizer.trackPromptEffectiveness(
        userId,
        'draft_messaging',
        [prompt],
        [draft || ''],
        optimizationApplied ? 1 : 0
      );
    } catch (trackingError) {
      console.error('Failed to track prompt effectiveness:', trackingError);
    }

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = req.headers.get('x-credits-required');
    const creditsRemaining = req.headers.get('x-credits-remaining');
    const headerUserId = req.headers.get('x-user-id');

    const response = NextResponse.json({ 
      draft,
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: headerUserId || undefined
      },
      ragEnabled: contextSource !== 'none',
      ragContext: ragContext,
      contextSource: contextSource,
      optimizationApplied: optimizationApplied
    });

    // Add credit information to response headers for frontend
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (headerUserId) response.headers.set('x-user-id', headerUserId);

    return response;
  } catch (error: any) {
    console.error("Error in /api/draft:", error);
    return new NextResponse("Failed to generate draft message.", { status: 500 });
  }
}

/**
 * Build enhanced context string from user context
 */
function buildEnhancedContextString(userContext: any, contact: any): string {
  let contextString = '\n\n--- YOUR WEDDING CONTEXT ---\n';
  let missingData: string[] = [];
  
  // Basic wedding info
  if (userContext.partnerName) {
    contextString += `Partner Name: ${userContext.partnerName}\n`;
  } else {
    missingData.push('partner name');
  }
  
  if (userContext.weddingLocation) {
    contextString += `Wedding Location: ${userContext.weddingLocation}\n`;
  } else {
    missingData.push('wedding location');
  }
  
  if (userContext.weddingDate) {
    contextString += `Wedding Date: ${userContext.weddingDate.toLocaleDateString()}\n`;
  } else {
    missingData.push('wedding date');
  }
  
  if (userContext.daysUntilWedding !== null) {
    contextString += `Days Until Wedding: ${userContext.daysUntilWedding}\n`;
  }
  
  if (userContext.planningStage !== 'unknown') {
    contextString += `Planning Stage: ${userContext.planningStage}\n`;
  }
  
  // Guest count and budget
  if (userContext.guestCount) {
    contextString += `Guest Count: ${userContext.guestCount}\n`;
  } else {
    missingData.push('guest count');
  }
  
  if (userContext.maxBudget) {
    contextString += `Budget: $${userContext.maxBudget.toLocaleString()}\n`;
  } else {
    missingData.push('budget');
  }
  
  // Vibes and aesthetic
  if (userContext.vibe && userContext.vibe.length > 0) {
    contextString += `Wedding Vibes: ${userContext.vibe.join(', ')}\n`;
  } else {
    missingData.push('wedding vibes/aesthetic');
  }
  
  // Planning progress
  if (userContext.pendingTodos && userContext.pendingTodos.length > 0) {
    contextString += `Recent Planning Tasks: ${userContext.pendingTodos.slice(0, 3).join(', ')}\n`;
  }
  
  // Vendor connections
  if (userContext.selectedVendors && userContext.selectedVendors.length > 0) {
    contextString += `Already Working With: ${userContext.selectedVendors.slice(0, 2).join(', ')}\n`;
  }
  
  // Venue info
  if (userContext.hasVenue && userContext.selectedVenueMetadata) {
    contextString += `Venue: ${userContext.selectedVenueMetadata.name || 'Selected'}\n`;
  } else if (userContext.hasVenue === false) {
    missingData.push('venue');
  }
  
  // Add instructions based on available data
  if (missingData.length === 0) {
    contextString += '\n\nIMPORTANT: Use the ACTUAL information provided above in your message. Do NOT use placeholders like [Partner\'s Name], [Preferred Month/Year], [Preferred Location], [Date], or [Your Contact Information]. Replace these with the real data from the context above.';
  } else {
    contextString += `\n\nMISSING INFORMATION: The following details are not yet set: ${missingData.join(', ')}.`;
    contextString += '\n\nINSTRUCTIONS:';
    contextString += '\n- Use the ACTUAL information provided above where available.';
    contextString += '\n- For missing information, use natural, conversational language instead of placeholders.';
    contextString += '\n- Instead of [Partner\'s Name], say "my partner" or "my fiancé/fiancée".';
    contextString += '\n- Instead of [Preferred Month/Year] or [Date], say "we\'re still finalizing our date" or "we\'re flexible on timing".';
    contextString += '\n- Instead of [Preferred Location], say "we\'re still exploring locations" or "we\'re open to suggestions".';
    contextString += '\n- Instead of [Your Contact Information], end with your name only.';
    contextString += '\n- Keep the message warm and personal despite missing details.';
    contextString += '\n- NEVER use [Date], [Partner\'s Name], [Location], or [Your Contact Information] - use actual data or natural language.';
  }
  
  return contextString;
}

/**
 * Build system prompt based on context
 */
function buildSystemPrompt(userContext: any, vibeContext: any, isReply: boolean): string {
  let systemPrompt = '';
  
  if (vibeContext) {
    systemPrompt = "You are a friendly person planning your own wedding who writes short, personal messages to vendors. You're not a wedding planner - you're a couple reaching out to vendors for your special day. Keep messages brief, warm, and authentic.";
  } else if (isReply) {
    systemPrompt = "You are a friendly person that's looking to get married that writes thoughtful email responses. When replying, be responsive to the original message content and maintain a conversational tone.";
  } else {
    systemPrompt = "You are a friendly person that's looking to get married that writes thoughtful emails.";
  }
  
  // Add context-aware instructions
  if (userContext) {
    systemPrompt += ` You have access to rich wedding planning context including your wedding date, location, budget, vibes, and planning progress. Use this information to make your messages more personal and relevant.`;
    
    // Check if we have complete data
    const hasCompleteData = userContext.partnerName && userContext.weddingLocation && userContext.weddingDate && userContext.guestCount && userContext.maxBudget && userContext.vibe && userContext.vibe.length > 0;
    
    if (hasCompleteData) {
      systemPrompt += ` CRITICAL: Use the REAL data provided (partner name, wedding date, location, etc.) instead of generic placeholders. Never use [Partner's Name], [Preferred Month/Year], [Preferred Location], [Date], or [Your Contact Information] when real data is available.`;
      
      // Add signature formatting instruction
      systemPrompt += ` SIGNATURE FORMAT: End with "Warm regards," on one line, then "[USERNAME]" on the next line.`;
    } else {
      systemPrompt += ` NOTE: Some wedding details are still being finalized. Use the available real data where provided, and use natural, conversational language for missing details instead of placeholders. NEVER use [Date], [Partner's Name], [Location], or [Your Contact Information] - use the actual data or natural language.`;
    
                  // Add signature formatting instruction
        systemPrompt += ` SIGNATURE FORMAT: End with "Warm regards," on one line, then "[USERNAME]" on the next line.`;
    }
    
    // Add planning stage specific guidance
    if (userContext.planningStage === 'early') {
      systemPrompt += ` You're in the early planning stages, so focus on gathering information and building relationships with vendors.`;
    } else if (userContext.planningStage === 'mid') {
      systemPrompt += ` You're in the middle of planning, so you may be making decisions and finalizing details.`;
    } else if (userContext.planningStage === 'late') {
      systemPrompt += ` You're in the final planning stages, so focus on coordination and final details.`;
    }
  }
  
  return systemPrompt;
}

// Export the POST function wrapped with credit validation
export const POST = withCreditValidation(handleDraftGeneration, {
  feature: 'draft_messaging',
  userIdField: undefined, // Get userId from headers instead of body
  requireAuth: true,
  errorMessage: 'Insufficient credits for draft generation. Please upgrade your plan to continue using AI features.'
});
