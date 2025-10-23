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
      bodyLength: m.body?.length || 0
    })));
    
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
          console.log(`🔍 Analyzing message: "${message.subject}" from ${message.contactEmail}`);
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
        
        allNewTodos = allNewTodos.concat(todosWithIds);
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
              // Update existing contact document
              await adminDb.collection(`users/${userId}/contacts`).doc(contactId).update({
                pendingTodoSuggestions: {
                  count: suggestions.newTodos.length,
                  suggestions: suggestions.newTodos,
                  todoUpdates: suggestions.todoUpdates,
                  completedTodos: suggestions.completedTodos,
                  lastAnalyzedAt: admin.firestore.Timestamp.now(),
                  status: 'pending'
                }
              });
              console.log(`[TODO SUGGESTIONS] Stored ${totalSuggestions} suggestions for contact ${contactId}`);
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
                await existingContactDoc.ref.update({
                  pendingTodoSuggestions: {
                    count: suggestions.newTodos.length,
                    suggestions: suggestions.newTodos,
                    todoUpdates: suggestions.todoUpdates,
                    completedTodos: suggestions.completedTodos,
                    lastAnalyzedAt: admin.firestore.Timestamp.now(),
                    status: 'pending'
                  }
                });
                console.log(`[TODO SUGGESTIONS] Updated existing contact document and stored ${totalSuggestions} suggestions for contact ${contactId}`);
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
                console.log(`[TODO SUGGESTIONS] Created contact document and stored ${totalSuggestions} suggestions for contact ${contactId}`);
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
    // Use the N8N workflow for proper AI analysis
    const n8nWebhookUrl = process.env.N8N_MESSAGE_ANALYSIS_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.warn('N8N message analysis webhook URL not configured, using local analysis');
      return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
    }

    console.log(`🔍 Calling N8N webhook for analysis`);
    console.log(`🔍 Subject: "${subject}", Vendor: ${contact.name || contact.email}, Existing todos: ${existingTodos.length}`);
    
    const requestData = {
      message_content: messageBody,
      subject: subject,
      vendor_category: contact.category || 'Unknown',
      vendor_name: contact.name || contact.email || 'Unknown Vendor',
      vendorName: contact.name || contact.email || 'Unknown Vendor',
      existing_todos: existingTodos.map(todo => ({
        id: todo.id,
        name: todo.name,
        note: todo.note,
        category: todo.category,
        deadline: todo.deadline,
        isCompleted: todo.isCompleted || false
      })),
      wedding_context: weddingContext,
      user_id: userId,
      message_id: `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('🔍 N8N request data:', JSON.stringify(requestData, null, 2));

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`N8N Message Analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.analysis) {
      // Transform N8N response to match TodoItem structure
      const transformedAnalysis = {
        newTodos: result.analysis.newTodos?.map((todo: any) => ({
          name: todo.name,
          note: todo.description || todo.notes,
          category: todo.category,
          deadline: todo.dueDate ? new Date(todo.dueDate) : null,
        })) || [],
        todoUpdates: result.analysis.todoUpdates || [],
        completedTodos: result.analysis.completedTodos || []
      };
      return transformedAnalysis;
    } else {
      console.warn('N8N analysis returned unsuccessful result, using local analysis:', result);
      return await analyzeMessageLocally(messageBody, subject, contact, existingTodos, weddingContext, userId);
    }
  } catch (error) {
    console.error('N8N Message analysis error, using local analysis:', error);
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
      console.log(`🔍 No actionable content found in message: ${subject} (length: ${messageBody.length})`);
      return { newTodos, todoUpdates, completedTodos };
    }
    
    console.log(`🔍 Found actionable content in message: ${subject}`);
    
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
    
    // If no specific action items found, create a generic todo for basic messages
    if (actionItems.length === 0 && hasActionableContent) {
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
