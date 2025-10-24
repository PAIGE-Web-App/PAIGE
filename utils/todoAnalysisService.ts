/**
 * Todo Analysis Service
 * 
 * Extracted from the enhanced Gmail import route to be reusable
 * and run asynchronously after email import
 */

import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export interface TodoAnalysisResult {
  messagesAnalyzed: number;
  newTodosSuggested: number;
  todosUpdated: number;
  todosCompleted: number;
  totalSuggestions: number;
  analysisResults: {
    newTodos: any[];
    todoUpdates: any[];
    completedTodos: any[];
    messagesAnalyzed: number;
  };
}

export async function performTodoAnalysis(
  userId: string, 
  contacts: any[], 
  storeSuggestionsMode: boolean = false
): Promise<TodoAnalysisResult> {
  try {
    console.log('🔍 Starting todo analysis for user:', userId);
    console.log('🔍 Contacts to analyze:', contacts?.map(c => ({ id: c.id, name: c.name, email: c.email })));
    console.log('🔍 Store suggestions mode:', storeSuggestionsMode);
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }

    // Get recent messages for analysis
    const targetContactIds = contacts?.map(c => c.id) || [];
    let allMessages: any[] = [];
    let messagesPerContact: Map<string, any[]> = new Map();
    
    // Get contacts to analyze
    const contactsToAnalyze = targetContactIds.length > 0 
      ? targetContactIds 
      : (await adminDb.collection(`users/${userId}/contacts`).get()).docs.map(d => d.id);
    
    console.log('🔍 Analyzing messages for contacts:', contactsToAnalyze);
    
    // Check each contact's message collection
    for (const contactId of contactsToAnalyze) {
      // For client-side Gmail import, contactId is actually the email
      // Try to find messages directly using the contactId (which is the email)
      let messagesSnapshot;
      let contactData = null;
      
      try {
        // First try the direct path (contactId is email for client-side import)
        messagesSnapshot = await adminDb
          .collection(`users/${userId}/contacts/${contactId}/messages`)
          .orderBy('date', 'desc')
          .limit(10)
          .get();
        
        // If we found messages, try to get contact data
        if (!messagesSnapshot.empty) {
          try {
            const contactDoc = await adminDb.collection(`users/${userId}/contacts`).doc(contactId).get();
            if (contactDoc.exists) {
              contactData = contactDoc.data();
            }
          } catch (error) {
            // Contact document might not exist, that's okay
            contactData = { email: contactId, name: contactId };
          }
        }
      } catch (error) {
        // If direct path fails, try to find contact by email
        try {
          const contactsSnapshot = await adminDb
            .collection(`users/${userId}/contacts`)
            .where('email', '==', contactId)
            .limit(1)
            .get();
          
          if (!contactsSnapshot.empty) {
            const contactDoc = contactsSnapshot.docs[0];
            contactData = contactDoc.data();
            
            // Try the contact document ID path
            messagesSnapshot = await adminDb
              .collection(`users/${userId}/contacts/${contactDoc.id}/messages`)
              .orderBy('date', 'desc')
              .limit(10)
              .get();
          } else {
            console.log(`No contact found for ${contactId}`);
            continue;
          }
        } catch (error2) {
          console.log(`No messages found for contact ${contactId}`);
          continue;
        }
      }
      
      const contactMessages = messagesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        contactId: contactId,
        contactName: contactData?.name || contactData?.email || 'Unknown',
        contactEmail: contactData?.email,
        contactCategory: contactData?.category,
        ...doc.data()
      }));
      
      messagesPerContact.set(contactId, contactMessages);
      allMessages = allMessages.concat(contactMessages);
    }
    
    // Sort by date and limit to 25 most recent
    allMessages.sort((a, b) => {
      const dateA = a.date?.seconds || a.date?.getTime?.() || 0;
      const dateB = b.date?.seconds || b.date?.getTime?.() || 0;
      return dateB - dateA;
    });
    const messages = allMessages.slice(0, 25);

    console.log(`🔍 Found ${messages.length} messages for analysis from ${contactsToAnalyze.length} contacts`);
    console.log('🔍 Sample messages:', messages.slice(0, 3).map(m => ({ 
      subject: m.subject, 
      from: m.from, 
      contactName: m.contactName,
      hasBody: !!m.body,
      bodyLength: m.body?.length || 0,
      direction: m.direction
    })));
    
    if (messages.length === 0) {
      console.warn('⚠️ No messages found to analyze!');
      return {
        messagesAnalyzed: 0,
        newTodosSuggested: 0,
        todosUpdated: 0,
        todosCompleted: 0,
        totalSuggestions: 0,
        analysisResults: {
          newTodos: [],
          todoUpdates: [],
          completedTodos: [],
          messagesAnalyzed: 0
        }
      };
    }
    
    // Get existing todos
    const todosSnapshot = await adminDb
      .collection(`users/${userId}/todoItems`)
      .get();
    
    const existingTodos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get wedding context
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const weddingContext = {
      weddingDate: userData?.weddingDate,
      weddingLocation: userData?.weddingLocation,
      guestCount: userData?.guestCount,
      maxBudget: userData?.maxBudget,
      vibe: userData?.vibe
    };

    let totalNewTodos = 0;
    let totalTodoUpdates = 0;
    let totalCompletedTodos = 0;

    // Batch analyze messages for better performance
    const batchSize = 5; // Process 5 messages at a time
    const batches = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }
    
    console.log(`🔍 Processing ${messages.length} messages in ${batches.length} batches of ${batchSize}`);
    
    let allNewTodos: any[] = [];
    let allTodoUpdates: any[] = [];
    let allCompletedTodos: any[] = [];
    
    // Track suggestions per contact for storage mode
    const suggestionsPerContact: Map<string, any> = new Map();
    
    for (const batch of batches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (message) => {
        try {
          console.log(`🔍 Analyzing message: "${message.subject}" from ${message.contactEmail}`, {
            bodyLength: message.body?.length || 0,
            hasBody: !!message.body,
            direction: message.direction,
            source: message.source
          });
          
          const analysisResult = await analyzeMessageForTodos(
            message.body || '',
            message.subject || '',
            {
              name: message.contactName,
              email: message.contactEmail,
              category: message.contactCategory
            },
            existingTodos,
            weddingContext,
            userId
          );
          
          console.log(`✅ Analysis result for "${message.subject}":`, {
            newTodos: analysisResult.newTodos?.length || 0,
            todoUpdates: analysisResult.todoUpdates?.length || 0,
            completedTodos: analysisResult.completedTodos?.length || 0
          });

          return { message, analysisResult };
        } catch (analysisError) {
          console.error('Error analyzing message for todos:', analysisError);
          return { message, analysisResult: { newTodos: [], todoUpdates: [], completedTodos: [] } };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results for review
      for (const { message, analysisResult } of batchResults) {
        // Add unique IDs to todos for tracking
        const todosWithIds = analysisResult.newTodos.map(todo => ({
          ...todo,
          id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceMessage: message.subject || 'Unknown Subject',
          sourceContact: message.contactEmail || message.from || 'unknown',
          sourceEmail: message.contactEmail || message.from || 'unknown',
          sourceMessageId: message.id || 'unknown'
        }));
        
        // Deduplicate newTodos before adding (check by name + source)
        const existingTodoKeys = new Set(
          allNewTodos.map(t => `${t.name}-${t.sourceContact}`.toLowerCase())
        );
        
        const uniqueNewTodos = todosWithIds.filter(todo => {
          const key = `${todo.name}-${todo.sourceContact}`.toLowerCase();
          if (existingTodoKeys.has(key)) {
            console.log(`⚠️ Skipping duplicate todo: ${todo.name}`);
            return false;
          }
          existingTodoKeys.add(key);
          return true;
        });
        
        allNewTodos = allNewTodos.concat(uniqueNewTodos);
        allTodoUpdates = allTodoUpdates.concat(analysisResult.todoUpdates);
        allCompletedTodos = allCompletedTodos.concat(analysisResult.completedTodos);
        
        // Group by contact for storage mode
        if (storeSuggestionsMode && message.contactId) {
          const contactId = message.contactId;
          if (!suggestionsPerContact.has(contactId)) {
            suggestionsPerContact.set(contactId, {
              newTodos: [],
              todoUpdates: [],
              completedTodos: []
            });
          }
          const contactSuggestions = suggestionsPerContact.get(contactId);
          contactSuggestions.newTodos = contactSuggestions.newTodos.concat(todosWithIds);
          contactSuggestions.todoUpdates = contactSuggestions.todoUpdates.concat(analysisResult.todoUpdates);
          contactSuggestions.completedTodos = contactSuggestions.completedTodos.concat(analysisResult.completedTodos);
        }
      }
    }
    
    // If storeSuggestionsMode is enabled, save suggestions to each contact document
    if (storeSuggestionsMode && adminDb) {
      for (const [contactId, suggestions] of suggestionsPerContact.entries()) {
        const totalSuggestions = suggestions.newTodos.length + suggestions.todoUpdates.length + suggestions.completedTodos.length;
        
        if (totalSuggestions > 0) {
          try {
            // Check if contact document exists first
            const contactDoc = await adminDb.collection(`users/${userId}/contacts`).doc(contactId).get();
            
            if (contactDoc.exists) {
              // Update existing contact document - always set status to 'pending' for new suggestions
              const updateData = {
                'pendingTodoSuggestions.count': suggestions.newTodos.length,
                'pendingTodoSuggestions.suggestions': suggestions.newTodos,
                'pendingTodoSuggestions.todoUpdates': suggestions.todoUpdates,
                'pendingTodoSuggestions.completedTodos': suggestions.completedTodos,
                'pendingTodoSuggestions.lastAnalyzedAt': admin.firestore.Timestamp.now(),
                'pendingTodoSuggestions.status': 'pending' // Always set to pending for new suggestions
              };
              
              await adminDb.collection(`users/${userId}/contacts`).doc(contactId).update(updateData);
            } else {
              // Check if a contact with this email already exists (different document ID)
              const existingContactQuery = await adminDb
                .collection(`users/${userId}/contacts`)
                .where('email', '==', contactId)
                .limit(1)
                .get();
              
              if (!existingContactQuery.empty) {
                // Update the existing contact document instead of creating a duplicate
                const existingContactDoc = existingContactQuery.docs[0];
                const updateData = {
                  'pendingTodoSuggestions.count': suggestions.newTodos.length,
                  'pendingTodoSuggestions.suggestions': suggestions.newTodos,
                  'pendingTodoSuggestions.todoUpdates': suggestions.todoUpdates,
                  'pendingTodoSuggestions.completedTodos': suggestions.completedTodos,
                  'pendingTodoSuggestions.lastAnalyzedAt': admin.firestore.Timestamp.now(),
                  'pendingTodoSuggestions.status': 'pending' // Always set to pending for new suggestions
                };
                
                await existingContactDoc.ref.update(updateData);
              } else {
                // Create contact document if it doesn't exist
                await adminDb.collection(`users/${userId}/contacts`).doc(contactId).set({
                  email: contactId,
                  name: contactId,
                  category: 'vendor',
                  pendingTodoSuggestions: {
                    count: suggestions.newTodos.length,
                    suggestions: suggestions.newTodos,
                    todoUpdates: suggestions.todoUpdates,
                    completedTodos: suggestions.completedTodos,
                    lastAnalyzedAt: admin.firestore.Timestamp.now(),
                    status: 'pending'
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Failed to store suggestions for contact ${contactId}:`, error);
            // Don't fail the entire analysis if we can't store suggestions
          }
        }
      }
    }
    
    // Return analysis results
    const result = {
      messagesAnalyzed: messages.length,
      newTodosSuggested: allNewTodos.length,
      todosUpdated: allTodoUpdates.length,
      todosCompleted: allCompletedTodos.length,
      totalSuggestions: allNewTodos.length + allTodoUpdates.length + allCompletedTodos.length,
      analysisResults: {
        newTodos: allNewTodos,
        todoUpdates: allTodoUpdates,
        completedTodos: allCompletedTodos,
        messagesAnalyzed: messages.length
      }
    };

    console.log('🔍 Todo analysis completed:', result);
    return result;

  } catch (error) {
    console.error('🔴 Todo analysis error:', error);
    throw error;
  }
}

async function analyzeMessageForTodos(
  messageBody: string,
  subject: string,
  contact: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    console.log(`🔍 Using OpenAI for direct AI analysis: "${subject}" from ${contact.name || contact.email}`);
    
    // Use OpenAI directly for smart analysis
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Build context about existing todos
    const existingTodosContext = existingTodos.length > 0 
      ? `\n\nEXISTING TODO ITEMS:\n${existingTodos.map(todo => 
          `- ID: ${todo.id} | ${todo.name}${todo.note ? ` (${todo.note})` : ''}${todo.deadline ? ` [Due: ${todo.deadline}]` : ''} ${todo.isCompleted ? '[COMPLETED]' : '[PENDING]'}`
        ).join('\n')}`
      : '\n\nNo existing todo items yet.';
    
    // Build wedding context
    const weddingCtx = weddingContext ? `\n\nWEDDING CONTEXT:\n- Date: ${weddingContext.weddingDate || 'Not set'}\n- Location: ${weddingContext.weddingLocation || 'Not set'}\n- Guest Count: ${weddingContext.guestCount || 'Not set'}\n- Budget: ${weddingContext.maxBudget || 'Not set'}` : '';
    
    const prompt = `You are analyzing an email message for a wedding planning app. Extract actionable todo items, identify updates to existing todos, and detect completed tasks.

EMAIL:
Subject: ${subject || 'No subject'}
From: ${contact.name || contact.email || 'Unknown'}
Category: ${contact.category || 'Unknown'}
Body: ${messageBody || 'No content'}
${existingTodosContext}${weddingCtx}

INSTRUCTIONS:
1. Identify NEW actionable todo items that should be created
2. Identify if any EXISTING todos should be UPDATED with new information (provide the exact todo ID)
3. Identify if any EXISTING todos have been COMPLETED based on the message (provide the exact todo ID)
4. Be specific and actionable - avoid generic todos like "Review message"
5. Only suggest todos if there are clear action items
6. For updates/completions, you MUST provide the exact ID from the existing todos list

Return ONLY valid JSON (no markdown, no code blocks):
{
  "newTodos": [{"name": "string", "note": "string", "category": "string", "deadline": "YYYY-MM-DD or null", "priority": "low|medium|high"}],
  "todoUpdates": [{"todoId": "exact_existing_todo_id", "updates": {"note": "string", "deadline": "YYYY-MM-DD"}}],
  "completedTodos": [{"todoId": "exact_existing_todo_id", "completionReason": "string"}]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a wedding planning assistant. Extract actionable todos from emails. Be specific and practical. Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Try to parse directly
      analysis = JSON.parse(response);
    } catch (parseError) {
      // Try to extract JSON from markdown blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find any JSON object
        const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          analysis = JSON.parse(jsonObjectMatch[0]);
        } else {
          throw new Error('No valid JSON found in OpenAI response');
        }
      }
    }

    // Transform to expected format
    const transformedAnalysis = {
      newTodos: (analysis.newTodos || []).map((todo: any) => ({
        name: todo.name,
        note: todo.note || '',
        category: todo.category || 'other',
        deadline: todo.deadline ? new Date(todo.deadline) : null,
        sourceMessage: subject || 'Unknown Subject',
        sourceContact: contact.name || contact.email || 'Unknown',
        sourceEmail: contact.email || contact.name || 'Unknown',
        confidenceScore: 0.8
      })),
      todoUpdates: analysis.todoUpdates || [],
      completedTodos: analysis.completedTodos || []
    };
    
    console.log(`✅ OpenAI analysis completed: ${transformedAnalysis.newTodos.length} new todos, ${transformedAnalysis.todoUpdates.length} updates, ${transformedAnalysis.completedTodos.length} completed`);
    return transformedAnalysis;
    
  } catch (error) {
    console.error('❌ OpenAI analysis error, using fallback:', error);
    return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
  }
}

async function analyzeMessageLocally(
  messageBody: string,
  subject: string,
  contact: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    console.log(`🔍 Analyzing message locally: "${subject}" from ${contact.name || contact.email}`);
    
    const newTodos = [];
    const todoUpdates = [];
    const completedTodos = [];
    
    const messageText = `${subject} ${messageBody}`.toLowerCase();
    const contactName = contact.name || contact.email || 'Unknown';
    
    console.log(`🔍 Contact info - Name: ${contact.name}, Email: ${contact.email}, Category: ${contact.category}`);
    
    // Only create todos for messages that actually contain actionable content
    const hasActionableContent = (
      messageText.includes('please') || 
      messageText.includes('need to') || 
      messageText.includes('deadline') || 
      messageText.includes('due by') || 
      messageText.includes('confirm') || 
      messageText.includes('payment') || 
      messageText.includes('invoice') || 
      messageText.includes('$') ||
      messageText.includes('schedule') ||
      messageText.includes('timeline') ||
      messageText.includes('wedding') ||
      messageText.includes('venue') ||
      messageText.includes('catering') ||
      messageText.includes('photography') ||
      messageText.includes('flowers') ||
      messageText.includes('music') ||
      messageText.includes('dress') ||
      messageText.includes('cake') ||
      messageText.includes('hi') || // Add more lenient keywords for testing
      messageText.includes('hello') ||
      messageText.includes('reply') ||
      messageText.includes('logic')
    ) && (
      // Additional check: message must be longer than 10 characters to avoid spam/auto-replies (reduced from 50)
      messageBody.length > 10
    );
    
    if (!hasActionableContent) {
      return { newTodos, todoUpdates, completedTodos };
    }
    
    // Extract specific action items from the message
    const actionItems = extractActionItems(messageText, subject, contactName);
    
    for (const action of actionItems) {
      newTodos.push({
        name: action.name,
        note: action.description || '', // Use 'note' field to match TodoItem structure
        category: action.category || 'general',
        deadline: action.dueDate ? new Date(action.dueDate) : null,
        sourceMessage: subject || 'Unknown Subject',
        sourceContact: contactName,
        sourceEmail: contact.email || contactName,
        confidenceScore: calculateConfidenceScore(messageText, action.name),
      });
    }
    
    // Only create generic todos for messages with very specific actionable content
    // Don't create generic todos for every message to avoid duplicates
    if (actionItems.length === 0 && hasActionableContent && (
      messageText.includes('please') || 
      messageText.includes('need to') || 
      messageText.includes('deadline') || 
      messageText.includes('due by') || 
      messageText.includes('confirm') || 
      messageText.includes('payment') || 
      messageText.includes('invoice') || 
      messageText.includes('$')
    )) {
      newTodos.push({
        name: `Follow up with ${contactName}`,
        note: `Message from ${contactName}: "${subject}" - ${messageBody.substring(0, 100)}...`,
        category: contact.category || 'vendor',
        deadline: null,
        sourceMessage: subject || 'Unknown Subject',
        sourceContact: contactName,
        sourceEmail: contact.email || contactName,
        confidenceScore: 0.3, // Lower confidence for generic todos
      });
    }
    
    return {
      newTodos,
      todoUpdates,
      completedTodos
    };
    
  } catch (error) {
    console.error('Local message analysis error:', error);
    return { newTodos: [], todoUpdates: [], completedTodos: [] };
  }
}

function extractActionItems(messageText: string, subject: string, contactName: string) {
  const actionItems = [];
  
  // Only extract very specific, clear action items
  // Be much more conservative - only create todos for obvious action items
  
  // Payment-related items (very specific)
  if (messageText.includes('payment') || messageText.includes('invoice') || messageText.includes('$')) {
    const amount = extractAmount(messageText);
    actionItems.push({
      name: `Process vendor payment${amount ? ` (${amount})` : ''}`,
      description: `Payment request from ${contactName} - ${subject}`,
      priority: 'high',
      category: 'payment',
      notes: `From message: "${subject}" - Review invoice details and process payment`,
      dueDate: extractDate(messageText),
      estimatedTime: '15 minutes'
    });
  }
  
  // Deadline-related items (very specific)
  if (messageText.includes('deadline') || messageText.includes('due by') || messageText.includes('urgent')) {
    actionItems.push({
      name: `Complete urgent vendor task`,
      description: `Urgent deadline from ${contactName} - ${subject}`,
      priority: 'high',
      category: 'timeline',
      notes: `From message: "${subject}" - Review deadline requirements and prioritize completion`,
      dueDate: extractDate(messageText),
      estimatedTime: '2 hours'
    });
  }
  
  // Confirmation requests (very specific)
  if (messageText.includes('please confirm') || messageText.includes('confirm by')) {
    actionItems.push({
      name: `Confirm vendor details and requirements`,
      description: `Confirmation needed from ${contactName} - ${subject}`,
      priority: 'medium',
      category: 'vendor',
      notes: `From message: "${subject}" - Review and confirm all details before proceeding`,
      dueDate: extractDate(messageText),
      estimatedTime: '15 minutes'
    });
  }
  
  return actionItems;
}

function extractAmount(text: string): string | null {
  const amountPatterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars?/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD/i
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Helper function to extract dates from message text
function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Calculate confidence score based on message content and action relevance
function calculateConfidenceScore(messageText: string, actionName: string): number {
  let score = 0.5; // Base score
  
  // Increase score for specific keywords
  if (messageText.includes('please') || messageText.includes('need to')) score += 0.2;
  if (messageText.includes('urgent') || messageText.includes('asap')) score += 0.2;
  if (messageText.includes('deadline') || messageText.includes('due by')) score += 0.15;
  if (messageText.includes('confirm') || messageText.includes('verify')) score += 0.1;
  
  // Increase score for payment-related content
  if (actionName.includes('payment') && (messageText.includes('$') || messageText.includes('invoice'))) {
    score += 0.2;
  }
  
  // Increase score for deadline-related content
  if (actionName.includes('deadline') && (messageText.includes('deadline') || messageText.includes('due'))) {
    score += 0.2;
  }
  
  // Increase score for confirmation-related content
  if (actionName.includes('confirm') && (messageText.includes('confirm') || messageText.includes('verify'))) {
    score += 0.2;
  }
  
  // Cap at 1.0
  return Math.min(1.0, score);
}
