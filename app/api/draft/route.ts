// app/api/draft/route.ts
import { OpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";
import { userContextBuilder } from "../../../utils/userContextBuilder";
import { adminDb } from "@/lib/firebaseAdmin";
import { withCreditValidation } from "../../../lib/creditMiddleware";
// // import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { ragContextCache } from '@/lib/ragContextCache';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Main handler function
async function handleDraftGeneration(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { contact, messages, isReply, originalSubject, originalFrom, vibeContext, userId, userData } = body;
    const isRegeneration = userData?.isRegeneration || false;
    const originalDraft = userData?.originalDraft || null;
    
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
        communicationPreferences: userData.communicationPreferences || null,
        lastUpdated: new Date(),
        contextVersion: "1.0"
      };
    } else if (userId) {
      // Fallback to server-side (for backward compatibility)
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
              communicationPreferences: serverUserData.communicationPreferences || null,
              lastUpdated: new Date(),
              contextVersion: "1.0"
            };
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
      
      // Include additional context from user if provided
      let additionalContextStr = '';
      if (userData?.additionalContext) {
        // Check if additional context contains length-related instructions
        const additionalContextLower = userData.additionalContext.toLowerCase();
        const isLengthRequest = additionalContextLower.includes('short') || 
                                additionalContextLower.includes('shorter') || 
                                additionalContextLower.includes('brief') || 
                                additionalContextLower.includes('concise') ||
                                additionalContextLower.includes('long') || 
                                additionalContextLower.includes('longer') ||
                                additionalContextLower.includes('expand');
        
        let lengthInstruction = '';
        if (isLengthRequest) {
          if (additionalContextLower.includes('super short') || additionalContextLower.includes('very short') || additionalContextLower.includes('extremely short')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user explicitly requested a SUPER SHORT or VERY SHORT message. Your message MUST be 2-3 sentences maximum. Do NOT write a long message. Get straight to the point. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('short') || additionalContextLower.includes('shorter') || additionalContextLower.includes('brief') || additionalContextLower.includes('concise')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a SHORT/BRIEF message. Your message MUST be concise - 3-4 sentences maximum. Do NOT write a long message. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('long') || additionalContextLower.includes('longer') || additionalContextLower.includes('expand') || additionalContextLower.includes('more detail')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a LONGER message with more detail. Expand your message with additional context and details. This is a HARD REQUIREMENT.';
          }
        }
        
        // Build a simpler, more direct instruction
        let contextInstruction = '';
        
        if (lengthInstruction) {
          contextInstruction = `${lengthInstruction}\n\nALSO IMPORTANT: The user provided this additional context: "${userData.additionalContext}". This context MUST be naturally incorporated into the message. If it's a personal connection (like "we went to school together"), mention it early in the message.`;
        } else {
          contextInstruction = `\n\n🚨🚨🚨 CRITICAL ADDITIONAL CONTEXT FROM USER - DO NOT FORGET THIS 🚨🚨🚨\n\nThe user provided this additional context: "${userData.additionalContext}"\n\nYOU MUST include this information in your message. This is NOT optional. If you write a message without referencing this context, you have failed.\n\nSPECIFIC INSTRUCTIONS:\n- If it's a personal connection (like "we went to school together"), you MUST mention this in the opening or early in the message. Example: "Hi David, hope you're doing well! I remember we went to school together..."\n- Do NOT write a generic message - this context makes the message personal and specific\n\nThis context is ESSENTIAL and must appear in the final message.`;
        }
        
        additionalContextStr = contextInstruction;
      }
      
      // Adjust base prompt if length instruction is present
      const hasLengthInstruction = additionalContextStr.includes('🚨 CRITICAL LENGTH INSTRUCTION');
      const basePrompt = hasLengthInstruction
        ? `\n\nWrite a friendly message that naturally mentions your vibes and feels personal to your situation. Keep it short and sweet - you're a couple planning your wedding, not a wedding planner. Don't use placeholders like [Vendor Name] or [Your Name] - write as if you're speaking directly to them.`
        : `\n\nWrite a brief, friendly message (2-3 sentences max) that naturally mentions your vibes and feels personal to your situation. Keep it short and sweet - you're a couple planning your wedding, not a wedding planner. Don't use placeholders like [Vendor Name] or [Your Name] - write as if you're speaking directly to them.`;
      
      prompt = `${context}${additionalContextStr}${basePrompt}\n\nIMPORTANT: Your response MUST include a subject line at the very beginning in this exact format:\nSubject: [Your subject line here]\n\nThen write the message body below.`;

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
      
      // Include additional context from user if provided
      let additionalContextStr = '';
      if (userData?.additionalContext) {
        // Check if additional context contains length-related instructions
        const additionalContextLower = userData.additionalContext.toLowerCase();
        const isLengthRequest = additionalContextLower.includes('short') || 
                                additionalContextLower.includes('shorter') || 
                                additionalContextLower.includes('brief') || 
                                additionalContextLower.includes('concise') ||
                                additionalContextLower.includes('long') || 
                                additionalContextLower.includes('longer') ||
                                additionalContextLower.includes('expand');
        
        let lengthInstruction = '';
        if (isLengthRequest) {
          if (additionalContextLower.includes('super short') || additionalContextLower.includes('very short') || additionalContextLower.includes('extremely short')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user explicitly requested a SUPER SHORT or VERY SHORT message. Your message MUST be 2-3 sentences maximum. Do NOT write a long message. Get straight to the point. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('short') || additionalContextLower.includes('shorter') || additionalContextLower.includes('brief') || additionalContextLower.includes('concise')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a SHORT/BRIEF message. Your message MUST be concise - 3-4 sentences maximum. Do NOT write a long message. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('long') || additionalContextLower.includes('longer') || additionalContextLower.includes('expand') || additionalContextLower.includes('more detail')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a LONGER message with more detail. Expand your message with additional context and details. This is a HARD REQUIREMENT.';
          }
        }
        
        // Build a simpler, more direct instruction
        let contextInstruction = '';
        
        if (lengthInstruction) {
          contextInstruction = `${lengthInstruction}\n\nALSO IMPORTANT: The user provided this additional context: "${userData.additionalContext}". This context MUST be naturally incorporated into the response. If it's a personal connection (like "we went to school together"), mention it early in the response.`;
        } else {
          contextInstruction = `\n\n🚨🚨🚨 CRITICAL ADDITIONAL CONTEXT FROM USER - DO NOT FORGET THIS 🚨🚨🚨\n\nThe user provided this additional context: "${userData.additionalContext}"\n\nYOU MUST include this information in your message. This is NOT optional. If you write a message without referencing this context, you have failed.\n\nSPECIFIC INSTRUCTIONS:\n- If it's a personal connection (like "we went to school together"), you MUST mention this in the opening or early in the message. Example: "Hi David, hope you're doing well! I remember we went to school together..."\n- Do NOT write a generic message - this context makes the message personal and specific\n\nThis context is ESSENTIAL and must appear in the final message.`;
        }
        
        additionalContextStr = contextInstruction;
      }
      
      prompt = `${context}${additionalContextStr}\n\nWrite a thoughtful, professional response that addresses their message appropriately. Keep it friendly and engaging, and feel free to reference your wedding planning context if relevant.\n\nIMPORTANT: Your response MUST include a subject line at the very beginning in this exact format:\nSubject: [Your subject line here]\n\nThen write the message body below.`;
    } else if (messages?.length) {
      // Check if this is a regeneration request
      if (isRegeneration && originalDraft) {
        // Regenerating/modifying an existing draft
        let enhancedContext = `You are modifying an existing draft message. Here is the current draft:\n\n"${originalDraft}"\n\n`;
        
        // Add rich user context if available
        if (userContext) {
          enhancedContext += buildEnhancedContextString(userContext, contact);
        }
        
        context = enhancedContext;
        
        // Include additional context from user if provided (this includes action pills)
        let additionalContextStr = '';
        if (userData?.additionalContext) {
          // Check if additional context contains length-related instructions
          const additionalContextLower = userData.additionalContext.toLowerCase();
          const isLengthRequest = additionalContextLower.includes('short') || 
                                  additionalContextLower.includes('shorter') || 
                                  additionalContextLower.includes('brief') || 
                                  additionalContextLower.includes('concise') ||
                                  additionalContextLower.includes('long') || 
                                  additionalContextLower.includes('longer') ||
                                  additionalContextLower.includes('expand');
          
          let lengthInstruction = '';
          if (isLengthRequest) {
            if (additionalContextLower.includes('super short') || additionalContextLower.includes('very short') || additionalContextLower.includes('extremely short')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user explicitly requested a SUPER SHORT or VERY SHORT message. Your message MUST be 2-3 sentences maximum. Do NOT write a long message. Get straight to the point. This is a HARD REQUIREMENT.';
            } else if (additionalContextLower.includes('short') || additionalContextLower.includes('shorter') || additionalContextLower.includes('brief') || additionalContextLower.includes('concise')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a SHORT/BRIEF message. Your message MUST be concise - 3-4 sentences maximum. Do NOT write a long message. This is a HARD REQUIREMENT.';
            } else if (additionalContextLower.includes('long') || additionalContextLower.includes('longer') || additionalContextLower.includes('expand') || additionalContextLower.includes('more detail')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a LONGER message with more detail. Expand your message with additional context and details. This is a HARD REQUIREMENT.';
            }
          }
          
          // Build a simpler, more direct instruction
          let contextInstruction = '';
          
          if (lengthInstruction) {
            contextInstruction = `${lengthInstruction}\n\nMODIFICATION: The user wants to modify the draft with this context: "${userData.additionalContext}". Incorporate this naturally while keeping the core message intact. If it's a personal connection (like "we went to school together"), mention it early.`;
          } else {
            contextInstruction = `\n\n🚨🚨🚨 CRITICAL MODIFICATION INSTRUCTIONS - DO NOT FORGET THIS 🚨🚨🚨\n\nThe user wants to modify the draft with this context: "${userData.additionalContext}"\n\nYOU MUST incorporate this information into the message. This is NOT optional. If you modify the draft without including this context, you have failed.\n\nSPECIFIC INSTRUCTIONS:\n- If it's a personal connection (like "we went to school together"), you MUST mention this in the opening or early in the message. Example: "Hi David, hope you're doing well! I remember we went to school together..."\n- Keep the core message and intent intact, but ensure this context is included\n\nThis context is ESSENTIAL and must appear in the final message.`;
          }
          
          additionalContextStr = contextInstruction;
        }
        
        prompt = `${context}${additionalContextStr}\n\nModify the existing draft message according to the instructions above. Keep the same general content and intent, but adjust as requested. Write a friendly, professional message using email tone.\n\nIMPORTANT: Your response MUST include a subject line at the very beginning in this exact format:\nSubject: [Your subject line here]\n\nThen write the message body below.`;
      } else {
      // Ongoing conversation with enhanced context
      let enhancedContext = `Here is the ongoing conversation:\n${messages.map((m: any) => `- ${m}`).join("\n")}`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
        
        // Include additional context from user if provided
        let additionalContextStr = '';
        if (userData?.additionalContext) {
          // Check if additional context contains length-related instructions
          const additionalContextLower = userData.additionalContext.toLowerCase();
          const isLengthRequest = additionalContextLower.includes('short') || 
                                  additionalContextLower.includes('shorter') || 
                                  additionalContextLower.includes('brief') || 
                                  additionalContextLower.includes('concise') ||
                                  additionalContextLower.includes('long') || 
                                  additionalContextLower.includes('longer') ||
                                  additionalContextLower.includes('expand');
          
          let lengthInstruction = '';
          if (isLengthRequest) {
            if (additionalContextLower.includes('super short') || additionalContextLower.includes('very short') || additionalContextLower.includes('extremely short')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user explicitly requested a SUPER SHORT or VERY SHORT message. Your message MUST be 2-3 sentences maximum. Do NOT write a long message. Get straight to the point. This is a HARD REQUIREMENT.';
            } else if (additionalContextLower.includes('short') || additionalContextLower.includes('shorter') || additionalContextLower.includes('brief') || additionalContextLower.includes('concise')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a SHORT/BRIEF message. Your message MUST be concise - 3-4 sentences maximum. Do NOT write a long message. This is a HARD REQUIREMENT.';
            } else if (additionalContextLower.includes('long') || additionalContextLower.includes('longer') || additionalContextLower.includes('expand') || additionalContextLower.includes('more detail')) {
              lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a LONGER message with more detail. Expand your message with additional context and details. This is a HARD REQUIREMENT.';
            }
          }
          
          // Build a simpler, more direct instruction
          let contextInstruction = '';
          
          if (lengthInstruction) {
            contextInstruction = `${lengthInstruction}\n\nALSO IMPORTANT: The user provided this additional context: "${userData.additionalContext}". This context MUST be naturally incorporated into the message. If it's a personal connection (like "we went to school together"), mention it early in the message.`;
          } else {
            contextInstruction = `\n\n🚨🚨🚨 CRITICAL ADDITIONAL CONTEXT FROM USER - DO NOT FORGET THIS 🚨🚨🚨\n\nThe user provided this additional context: "${userData.additionalContext}"\n\nYOU MUST include this information in your message. This is NOT optional. If you write a message without referencing this context, you have failed.\n\nSPECIFIC INSTRUCTIONS:\n- If it's a personal connection (like "we went to school together"), you MUST mention this in the opening or early in the message. Example: "Hi David, hope you're doing well! I remember we went to school together..."\n- Do NOT write a generic message - this context makes the message personal and specific\n\nThis context is ESSENTIAL and must appear in the final message.`;
          }
          
          additionalContextStr = contextInstruction;
        }
        
        // Adjust base prompt if length instruction is present
        const hasLengthInstruction = additionalContextStr.includes('🚨 CRITICAL LENGTH INSTRUCTION');
        const basePrompt = hasLengthInstruction
          ? `\n\nWrite a friendly, professional message using email tone. Consider your wedding planning context when appropriate.`
          : `\n\nWrite a friendly, professional message using email tone. Consider your wedding planning context when appropriate.`;
        
        prompt = `${context}${additionalContextStr}${basePrompt}\n\nIMPORTANT: Your response MUST include a subject line at the very beginning in this exact format:\nSubject: [Your subject line here]\n\nThen write the message body below.`;
      }
    } else {
      // First message with enhanced context
      const contactCategory = contact.category || 'vendor'; // Default to 'vendor' if category is missing
      let enhancedContext = `You're writing the first message to a ${contactCategory} named ${contact.name}.`;
      
      // Add rich user context if available
      if (userContext) {
        enhancedContext += buildEnhancedContextString(userContext, contact);
      }
      
      context = enhancedContext;
      
      // Include additional context from user if provided
      let additionalContextStr = '';
      if (userData?.additionalContext) {
        // Check if additional context contains length-related instructions
        const additionalContextLower = userData.additionalContext.toLowerCase();
        const isLengthRequest = additionalContextLower.includes('short') || 
                                additionalContextLower.includes('shorter') || 
                                additionalContextLower.includes('brief') || 
                                additionalContextLower.includes('concise') ||
                                additionalContextLower.includes('long') || 
                                additionalContextLower.includes('longer') ||
                                additionalContextLower.includes('expand');
        
        let lengthInstruction = '';
        if (isLengthRequest) {
          if (additionalContextLower.includes('super short') || additionalContextLower.includes('very short') || additionalContextLower.includes('extremely short')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user explicitly requested a SUPER SHORT or VERY SHORT message. Your message MUST be 2-3 sentences maximum. Do NOT write a long message. Get straight to the point. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('short') || additionalContextLower.includes('shorter') || additionalContextLower.includes('brief') || additionalContextLower.includes('concise')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a SHORT/BRIEF message. Your message MUST be concise - 3-4 sentences maximum. Do NOT write a long message. This is a HARD REQUIREMENT.';
          } else if (additionalContextLower.includes('long') || additionalContextLower.includes('longer') || additionalContextLower.includes('expand') || additionalContextLower.includes('more detail')) {
            lengthInstruction = '\n\n🚨 CRITICAL LENGTH INSTRUCTION: The user requested a LONGER message with more detail. Expand your message with additional context and details. This is a HARD REQUIREMENT.';
          }
        }
        
        // Build a simpler, more direct instruction
        let contextInstruction = '';
        
        if (lengthInstruction) {
          // If there's a length instruction, prioritize it
          contextInstruction = `${lengthInstruction}\n\nALSO IMPORTANT: The user provided this additional context: "${userData.additionalContext}". This context MUST be naturally incorporated into the message. If it's a personal connection (like "we went to school together"), mention it early in the message. If it's important information, weave it throughout.`;
        } else {
        // No length instruction, focus on the context itself
        contextInstruction = `\n\n🚨🚨🚨 CRITICAL ADDITIONAL CONTEXT FROM USER - DO NOT FORGET THIS 🚨🚨🚨\n\nThe user provided this additional context: "${userData.additionalContext}"\n\nYOU MUST include this information in your message. This is NOT optional. If you write a message without referencing this context, you have failed.\n\nSPECIFIC INSTRUCTIONS:\n- If it's a personal connection (like "we went to school together"), you MUST mention this in the opening or early in the message. Example: "Hi David, hope you're doing well! I remember we went to school together..."\n- If it mentions urgency or constraints, make sure the message reflects that\n- If it contains emotional language, match that tone throughout\n- Do NOT write a generic message - this context makes the message personal and specific\n\nThis context is ESSENTIAL and must appear in the final message.`;
        }
        
        additionalContextStr = contextInstruction;
      }
      
      // Check if length instruction was added
      const hasLengthInstruction = additionalContextStr.includes('🚨 CRITICAL LENGTH INSTRUCTION');
      const basePrompt = hasLengthInstruction 
        ? `\n\nWrite a friendly, professional message using email tone. Make it personal to your wedding planning situation.`
        : `\n\nWrite a friendly, professional message using email tone. Make it personal to your wedding planning situation.`;
      
      prompt = `${context}${additionalContextStr}${basePrompt}\n\nIMPORTANT: Your response MUST include a subject line at the very beginning in this exact format:\nSubject: [Your subject line here]\n\nThen write the message body below.`;

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
        // const ragResult = // await ragService.processQuery({
        //   query: ragQuery,
        //   user_id: userId
        // });
        const ragResult = { answer: '', context: '' };
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

    // Add additional context to userContext for system prompt
    if (userData?.additionalContext && userContext) {
      userContext.additionalContext = userData.additionalContext;
    }
    
    const systemPromptContent = buildSystemPrompt(userContext, vibeContext, isReply);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPromptContent },
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
  // Get communication preferences from user context
  const commPrefs = userContext?.communicationPreferences;
  
  // Build tone description based on preferences
  let toneInstructions = '';
  if (commPrefs) {
    const { generalTone, negotiationStyle, formalityLevel } = commPrefs;
    
    // General tone mapping with specific instructions
    const toneMap: Record<string, string> = {
      'friendly': 'Write in a warm, friendly, and approachable tone. Use conversational language and be personable. NEVER use overly formal phrases like "I hope this message finds you well", "I am eager", "exquisite", "keen to explore", "invaluable", or "truly unforgettable". Instead, use natural, friendly expressions like "Hi", "Thanks", "We\'d love to", "Looking forward to".',
      'professional': 'Write in a business-like and polished tone. Be courteous and respectful while maintaining professionalism.',
      'casual': 'Write in a relaxed and informal tone. Use everyday language and be conversational. Avoid formal business phrases completely.',
      'formal': 'Write in a traditional and respectful tone. Use formal language and proper business etiquette.'
    };
    
    // Negotiation style mapping with specific instructions
    const negotiationMap: Record<string, string> = {
      'collaborative': 'Use a collaborative approach, working together to find solutions. Frame requests as partnerships rather than demands.',
      'diplomatic': 'Be tactful and considerate in your language. Show respect for the vendor\'s expertise and time.',
      'direct': 'Be clear and straightforward. Get to the point without unnecessary pleasantries.',
      'assertive': 'Be confident and firm in your requests while remaining respectful.'
    };
    
    // Formality level mapping with specific instructions
    const formalityMap: Record<string, string> = {
      'very-casual': 'Use very relaxed language. Write like you\'re texting a friend - use contractions freely (I\'m, we\'re, you\'re, we\'d, etc.), casual expressions, and keep it simple. Avoid all formal business language.',
      'casual': 'Use comfortable and friendly language. Write naturally and conversationally like you\'re talking to a friend. Use contractions (I\'m, we\'re, you\'re, we\'d, etc.) and everyday expressions. Avoid formal phrases entirely - no "I hope this finds you well", no "exquisite", no "keen to explore", no "invaluable".',
      'professional': 'Maintain a standard business tone. Balance friendliness with professionalism.',
      'very-formal': 'Use traditional and formal language. Avoid contractions and use proper business etiquette throughout.'
    };
    
    toneInstructions = `CRITICAL TONE INSTRUCTIONS: ${toneMap[generalTone] || toneMap['friendly']} ${negotiationMap[negotiationStyle] || negotiationMap['collaborative']} ${formalityMap[formalityLevel] || formalityMap['professional']} These tone preferences must be strictly followed - they override any default formal language.`;
  }
  
  let systemPrompt = '';
  
  // Apply communication preferences FIRST and prominently if available
  if (toneInstructions) {
    // Put tone instructions at the very beginning for maximum impact
    systemPrompt = `${toneInstructions} `;
  
  if (vibeContext) {
      systemPrompt += "You are a person planning your own wedding who writes short, personal messages to vendors. You're not a wedding planner - you're a couple reaching out to vendors for your special day. Keep messages brief, warm, and authentic.";
  } else if (isReply) {
      systemPrompt += "You are a person that's looking to get married that writes thoughtful email responses. When replying, be responsive to the original message content and maintain a conversational tone.";
    } else {
      systemPrompt += "You are a person that's looking to get married that writes thoughtful emails.";
    }
  } else {
    // Default friendly tone if no preferences set
    if (vibeContext) {
      systemPrompt = "You are a person planning your own wedding who writes short, personal messages to vendors. You're not a wedding planner - you're a couple reaching out to vendors for your special day. Keep messages brief, warm, and authentic.";
    } else if (isReply) {
      systemPrompt = "You are a person that's looking to get married that writes thoughtful email responses. When replying, be responsive to the original message content and maintain a conversational tone.";
    } else {
      systemPrompt = "You are a person that's looking to get married that writes thoughtful emails.";
    }
    systemPrompt += " Write with a warm and friendly tone, using a collaborative approach, and maintain a professional formality level.";
  }
  
  // Add context-aware instructions
  if (userContext) {
    systemPrompt += ` You have access to rich wedding planning context including your wedding date, location, budget, vibes, and planning progress. Use this information to make your messages more personal and relevant.`;
    
    // Emphasize additional context if provided
    if (userContext?.additionalContext) {
      systemPrompt += ` 🚨 CRITICAL: The user provided additional context: "${userContext.additionalContext}". This MUST be included in the message - it is NOT optional. If it's a personal connection (like "we went to school together"), you MUST mention this early in the message. Example opening: "Hi [Name], hope you're doing well! I remember we went to school together..." Do NOT write a generic message without this context.`;
    }
    
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
