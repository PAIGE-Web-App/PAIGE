import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    console.log('🔵 START: /api/start-gmail-import-enhanced route hit');
    
    const requestBody = await req.json();
    const { enableTodoScanning = false, storeSuggestionsMode = false, ...originalParams } = requestBody;
    
    console.log('🔵 Enhanced route - Request params:', {
      userId: originalParams.userId,
      contactsCount: originalParams.contacts?.length,
      enableTodoScanning,
      storeSuggestionsMode,
      config: originalParams.config
    });
    
    // Call the original Gmail import API (same foundation)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''); // Remove trailing slash
    const apiUrl = `${baseUrl}/api/start-gmail-import`;
    console.log('🔵 Enhanced route - Calling original API:', apiUrl);
    
    const originalResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(originalParams)
    });
    
    console.log('🔵 Enhanced route - Original API response:', {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      ok: originalResponse.ok
    });
    
    if (!originalResponse.ok) {
      let errorData;
      try {
        errorData = await originalResponse.json();
      } catch (jsonError) {
        // If response is not JSON, return a generic error
        errorData = { 
          error: 'Request failed', 
          message: `HTTP ${originalResponse.status}: ${originalResponse.statusText}` 
        };
      }
      return NextResponse.json(errorData, { status: originalResponse.status });
    }
    
    let originalResult;
    try {
      originalResult = await originalResponse.json();
    } catch (jsonError) {
      console.error('Error parsing original response JSON:', jsonError);
      return NextResponse.json({ 
        error: 'Invalid response format', 
        message: 'The original API returned invalid JSON' 
      }, { status: 500 });
    }
    
    // If todo scanning is enabled, add analysis (optional feature)
    if (enableTodoScanning && originalResult.success) {
      try {
        console.log('🔵 Starting todo analysis for imported messages...');
        // Add a delay to ensure messages are fully committed to Firestore
        await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced from 5s to 2s
        
        // Add timeout to prevent hanging
        const analysisPromise = performTodoAnalysis(
          requestBody.userId, 
          requestBody.contacts,
          storeSuggestionsMode
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Todo analysis timeout after 30 seconds')), 30000)
        );
        
        const todoAnalysis = await Promise.race([analysisPromise, timeoutPromise]);
        console.log('🔵 Todo analysis completed:', todoAnalysis);
        
        // If storeSuggestionsMode is enabled, suggestions are already stored
        // Return success without the full analysis data
        if (storeSuggestionsMode) {
          return NextResponse.json({
            ...originalResult,
            todoSuggestionsStored: true,
            suggestionsCount: todoAnalysis.totalSuggestions || 0
          }, { status: 200 });
        }
        
        // Legacy behavior: return analysis in response for immediate modal
        return NextResponse.json({
          ...originalResult,
          todoAnalysis: todoAnalysis
        }, { status: 200 });
      } catch (todoError) {
        console.error('🔴 Todo analysis failed:', todoError);
        // Don't fail the entire import if todo analysis fails
        return NextResponse.json({
          ...originalResult,
          todoAnalysis: { 
            error: 'Todo analysis failed', 
            message: todoError.message,
            timeout: todoError.message.includes('timeout')
          }
        }, { status: 200 });
      }
    }
    
    // Return original result (same foundation, same response)
    return NextResponse.json(originalResult, { status: 200 });
    
  } catch (error: any) {
    console.error('API Error in start-gmail-import-enhanced:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An unexpected server error occurred during Gmail import.' 
    }, { status: 500 });
  }
}

async function performTodoAnalysis(userId: string, contacts: any[], storeSuggestionsMode: boolean = false) {
  try {
    // Get recent messages for analysis
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firestore Admin DB not initialized');
    }
    
    // Only analyze messages for the specific contacts being imported
    // This is more efficient than checking all contacts
    const targetContactIds = contacts?.map(c => c.id) || [];
    
    let allMessages: any[] = [];
    let messagesPerContact: Map<string, any[]> = new Map();
    
    // Get contacts to analyze (either specific ones or all)
    const contactsToAnalyze = targetContactIds.length > 0 
      ? targetContactIds 
      : (await adminDb.collection(`users/${userId}/contacts`).get()).docs.map(d => d.id);
    
    // Check each contact's message collection
    for (const contactId of contactsToAnalyze) {
      const contactDoc = await adminDb.collection(`users/${userId}/contacts`).doc(contactId).get();
      if (!contactDoc.exists) continue;
      
      const contactData = contactDoc.data();
      
      const messagesSnapshot = await adminDb
        .collection(`users/${userId}/contacts/${contactId}/messages`)
        .orderBy('timestamp', 'desc')
        .limit(10) // Only check last 10 messages per contact for efficiency
        .get();
      
      const contactMessages = messagesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        contactId: contactId,
        contactName: contactData.name || contactData.email || 'Unknown',
        contactEmail: contactData.email,
        contactCategory: contactData.category,
        ...doc.data()
      }));
      
      messagesPerContact.set(contactId, contactMessages);
      allMessages = allMessages.concat(contactMessages);
    }
    
    // Sort by timestamp and limit to 25 most recent
    allMessages.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    const messages = allMessages.slice(0, 25);

    console.log(`DEBUG: Found ${messages.length} messages for analysis from ${contactsToAnalyze.length} contacts`);
    console.log(`DEBUG: Collection paths: users/${userId}/contacts/*/messages`);
    console.log(`DEBUG: Message IDs found:`, messages.map(m => m.id));
    console.log(`DEBUG: Message subjects:`, messages.map(m => m.subject));
    
    // Get existing todos
    const todosSnapshot = await adminDb
      .collection(`users/${userId}/todos`)
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
    
    console.log(`DEBUG: Processing ${messages.length} messages in ${batches.length} batches of ${batchSize}`);
    
    let allNewTodos: any[] = [];
    let allTodoUpdates: any[] = [];
    let allCompletedTodos: any[] = [];
    
    // Track suggestions per contact for storage mode
    const suggestionsPerContact: Map<string, any> = new Map();
    
    for (const batch of batches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (message) => {
        try {
          console.log(`DEBUG: Analyzing message: "${message.subject}" from ${message.contactEmail}`);
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
          sourceMessage: message.subject,
          sourceContact: message.contactEmail || message.from || 'unknown',
          sourceMessageId: message.id
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
        }
      }
    }
    
    // Return analysis results for review (legacy mode) or summary (store mode)
    return {
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

  } catch (error) {
    console.error('Todo analysis error:', error);
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

    console.log(`DEBUG: Calling N8N webhook for analysis`);
    console.log(`DEBUG: Subject: "${subject}", Vendor: ${contact.name || contact.email}, Existing todos: ${existingTodos.length}`);

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_content: messageBody,
        subject: subject,
        vendor_category: contact.category || 'Unknown',
        vendor_name: contact.name || contact.email,
        vendorName: contact.name || contact.email,
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
      }),
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
          // Remove fields that don't exist in TodoItem structure
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
    console.log(`DEBUG: Analyzing message locally: "${subject}" from ${contact.name || contact.email}`);
    
    const newTodos = [];
    const todoUpdates = [];
    const completedTodos = [];
    
    const messageText = `${subject} ${messageBody}`.toLowerCase();
    const contactName = contact.name || contact.email || 'Unknown';
    
    console.log(`DEBUG: Contact info - Name: ${contact.name}, Email: ${contact.email}, Category: ${contact.category}`);
    
    // Only create todos for messages that actually contain actionable content
    // Be much more strict - only create todos for messages with clear action items
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
      messageText.includes('cake')
    ) && (
      // Additional check: message must be longer than 50 characters to avoid spam/auto-replies
      messageBody.length > 50
    );
    
    if (!hasActionableContent) {
      console.log(`DEBUG: No actionable content found in message: ${subject} (length: ${messageBody.length})`);
      return { newTodos, todoUpdates, completedTodos };
    }
    
    console.log(`DEBUG: Found actionable content in message: ${subject}`);
    
    // Extract specific action items from the message
    const actionItems = extractActionItems(messageText, subject, contactName);
    
    for (const action of actionItems) {
      newTodos.push({
        name: action.name,
        note: action.description, // Use 'note' field to match TodoItem structure
        category: action.category,
        deadline: action.dueDate ? new Date(action.dueDate) : null,
        sourceMessage: subject,
        sourceContact: contactName,
        sourceEmail: contact.email,
        confidenceScore: calculateConfidenceScore(messageText, action.name),
        // Remove fields that don't exist in TodoItem structure
        // priority, estimatedTime, description are not part of TodoItem
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
  
  // Only create todos for very specific, clear action items
  // Removed generic wedding-related suggestions that create fake todos
  
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

async function createSuggestedTodo(
  todoData: any,
  message: any,
  userId: string,
  adminDb: any
) {
  try {
    const todoRef = await adminDb.collection(`users/${userId}/todos`).add({
      name: todoData.name,
      description: todoData.description || '',
      priority: todoData.priority || 'medium',
      category: todoData.category || 'other',
      dueDate: todoData.dueDate || null,
      estimatedTime: todoData.estimatedTime || null,
      notes: todoData.notes || '',
      isCompleted: false,
      createdAt: admin.firestore.Timestamp.now(),
      source: 'gmail_analysis',
      sourceMessageId: message.id,
      sourceContact: message.contactEmail || message.from || 'unknown'
    });

    console.log(`Created suggested todo: ${todoData.name} (ID: ${todoRef.id})`);
    return todoRef.id;
  } catch (error) {
    console.error('Error creating suggested todo:', error);
    throw error;
  }
}

async function updateExistingTodo(
  update: any,
  userId: string,
  adminDb: any
) {
  try {
    const updateData: any = {};
    
    if (update.updates.note) updateData.note = update.updates.note;
    if (update.updates.deadline) updateData.deadline = update.updates.deadline;
    if (update.updates.category) updateData.category = update.updates.category;
    if (update.updates.isCompleted !== undefined) updateData.isCompleted = update.updates.isCompleted;
    
    updateData.updatedAt = admin.firestore.Timestamp.now();

    await adminDb.collection(`users/${userId}/todos`).doc(update.todoId).update(updateData);
    console.log(`Updated todo: ${update.todoId}`);
  } catch (error) {
    console.error('Error updating todo:', error);
    throw error;
  }
}

async function markTodoCompleted(
  completed: any,
  userId: string,
  adminDb: any
) {
  try {
    await adminDb.collection(`users/${userId}/todos`).doc(completed.todoId).update({
      isCompleted: true,
      completedAt: admin.firestore.Timestamp.now(),
      completionReason: completed.completionReason
    });
    console.log(`Marked todo as completed: ${completed.todoId}`);
  } catch (error) {
    console.error('Error marking todo as completed:', error);
    throw error;
  }
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
