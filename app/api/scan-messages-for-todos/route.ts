/**
 * Real-time Message Scanning API
 * 
 * Scans messages for todo updates and suggestions
 * Can be triggered by webhooks, scheduled tasks, or manual requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

interface ScanRequest {
  userId: string;
  contactId?: string; // Optional: scan specific contact
  messageIds?: string[]; // Optional: scan specific messages
  scanType: 'new_messages' | 'all_messages' | 'recent_messages';
  maxMessages?: number;
  enableRAG?: boolean;
}

interface ScanResult {
  success: boolean;
  messagesScanned: number;
  todosSuggested: number;
  todosUpdated: number;
  todosCompleted: number;
  errors: string[];
  processingTime: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ScanRequest = await request.json();
    const { 
      userId, 
      contactId, 
      messageIds, 
      scanType = 'recent_messages',
      maxMessages = 20,
      enableRAG = true
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get user's existing todos for context
    const existingTodos = await getExistingTodos(userId, adminDb);
    
    // Get wedding context
    const weddingContext = await getWeddingContext(userId, adminDb);

    // Get messages to scan
    const messages = await getMessagesToScan(
      userId, 
      contactId, 
      messageIds, 
      scanType, 
      maxMessages, 
      adminDb
    );

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        messagesScanned: 0,
        todosSuggested: 0,
        todosUpdated: 0,
        todosCompleted: 0,
        errors: [],
        processingTime: Date.now() - startTime
      });
    }

    // Process messages in batches
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    let totalTodosSuggested = 0;
    let totalTodosUpdated = 0;
    let totalTodosCompleted = 0;
    const errors: string[] = [];

    // Process each batch
    for (const batch of batches) {
      try {
        const batchResult = await processMessageBatch(
          batch,
          existingTodos,
          weddingContext,
          userId,
          adminDb,
          enableRAG
        );

        totalTodosSuggested += batchResult.todosSuggested;
        totalTodosUpdated += batchResult.todosUpdated;
        totalTodosCompleted += batchResult.todosCompleted;
      } catch (error) {
        console.error('Batch processing error:', error);
        errors.push(`Batch error: ${error.message}`);
      }
    }

    const result: ScanResult = {
      success: true,
      messagesScanned: messages.length,
      todosSuggested: totalTodosSuggested,
      todosUpdated: totalTodosUpdated,
      todosCompleted: totalTodosCompleted,
      errors,
      processingTime: Date.now() - startTime
    };

    // Log scan results
    console.log(`Message scan completed for user ${userId}:`, {
      messagesScanned: result.messagesScanned,
      todosSuggested: result.todosSuggested,
      todosUpdated: result.todosUpdated,
      processingTime: result.processingTime
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Message scanning error:', error);
    return NextResponse.json(
      { 
        error: 'Message scanning failed',
        details: error.message,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

async function getExistingTodos(userId: string, adminDb: any) {
  try {
    const todosSnapshot = await adminDb
      .collection('todoItems')
      .where('userId', '==', userId)
      .where('isCompleted', '==', false)
      .get();
    
    return todosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching existing todos:', error);
    return [];
  }
}

async function getWeddingContext(userId: string, adminDb: any) {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;

    const userData = userDoc.data();
    return {
      weddingDate: userData?.weddingDate,
      weddingLocation: userData?.weddingLocation,
      guestCount: userData?.guestCount,
      maxBudget: userData?.maxBudget,
      vibe: userData?.vibe
    };
  } catch (error) {
    console.error('Error fetching wedding context:', error);
    return null;
  }
}

async function getMessagesToScan(
  userId: string,
  contactId: string | undefined,
  messageIds: string[] | undefined,
  scanType: string,
  maxMessages: number,
  adminDb: any
) {
  try {
    // Get all contacts for the user to find messages
    const contactsSnapshot = await adminDb
      .collection(`users/${userId}/contacts`)
      .get();

    if (contactsSnapshot.empty) {
      return [];
    }

    let allMessages: any[] = [];

    // Check each contact for messages
    for (const contactDoc of contactsSnapshot.docs) {
      const contactData = contactDoc.data();
      const contactEmail = contactData.email;
      const contactDocId = contactDoc.id;
      
      if (!contactEmail) continue;

      // Check if we should scan this specific contact
      if (contactId && contactId !== contactEmail && contactId !== contactDocId) {
        continue;
      }

      // Check both possible message paths
      const pathsToCheck = [
        `users/${userId}/contacts/${contactDocId}/messages`, // Old format
        `users/${userId}/contacts/${contactEmail}/messages` // New format
      ];

      for (const path of pathsToCheck) {
        try {
          let query = adminDb.collection(path);

          // Filter by specific message IDs if provided
          if (messageIds && messageIds.length > 0) {
            query = query.where(admin.firestore.FieldPath.documentId(), 'in', messageIds);
          } else {
            // Apply time-based filtering based on scan type
            const now = new Date();
            let timeFilter: Date;

            switch (scanType) {
              case 'new_messages':
                // Messages from last 24 hours
                timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
              case 'recent_messages':
                // Messages from last 7 days
                timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case 'all_messages':
              default:
                // All messages (with limit)
                break;
            }

            if (timeFilter) {
              // Try both timestamp and date fields
              query = query.where('date', '>=', timeFilter);
            }
          }

          // Order by date and limit
          query = query
            .orderBy('date', 'desc')
            .limit(maxMessages);

          const snapshot = await query.get();
          const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            contactId: contactEmail, // Use contactEmail as contactId for consistency
            contactName: contactData.name || contactEmail
          }));

          allMessages = allMessages.concat(messages);
        } catch (error) {
          // Path might not exist, continue
          console.log(`Path ${path} does not exist or has no messages`);
        }
      }
    }

    // Sort all messages by date and limit
    allMessages.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return allMessages.slice(0, maxMessages);
  } catch (error) {
    console.error('Error fetching messages to scan:', error);
    return [];
  }
}

async function processMessageBatch(
  messages: any[],
  existingTodos: any[],
  weddingContext: any,
  userId: string,
  adminDb: any,
  enableRAG: boolean
) {
  let todosSuggested = 0;
  let todosUpdated = 0;
  let todosCompleted = 0;

  // Process messages in parallel for better performance
  const messagePromises = messages.map(async (message) => {
    try {
      const result = await analyzeMessageForTodos(
        message,
        existingTodos,
        weddingContext,
        userId,
        enableRAG
      );

      // Create suggested todos
      if (result.newTodos.length > 0) {
        for (const todo of result.newTodos) {
          await createSuggestedTodo(todo, message, userId, adminDb);
          todosSuggested++;
        }
      }

      // Update existing todos
      if (result.todoUpdates.length > 0) {
        for (const update of result.todoUpdates) {
          await updateExistingTodo(update, adminDb);
          todosUpdated++;
        }
      }

      // Mark todos as completed
      if (result.completedTodos.length > 0) {
        for (const completion of result.completedTodos) {
          await completeTodo(completion, adminDb);
          todosCompleted++;
        }
      }

      // Mark message as scanned to avoid re-processing
      await markMessageAsScanned(message.id, adminDb);

    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
    }
  });

  await Promise.all(messagePromises);

  return {
    todosSuggested,
    todosUpdated,
    todosCompleted
  };
}

async function analyzeMessageForTodos(
  message: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string,
  enableRAG: boolean
) {
  try {
    // Use RAG if enabled
    if (enableRAG) {
      // First, try to get relevant context from RAG
      const ragContext = await getRAGContext(message, userId);
      
      // Enhance the analysis with RAG context
      const enhancedMessage = {
        ...message,
        ragContext
      };

      return await callAnalysisAPI(enhancedMessage, existingTodos, weddingContext, userId);
    } else {
      return await callAnalysisAPI(message, existingTodos, weddingContext, userId);
    }
  } catch (error) {
    console.error('Error analyzing message:', error);
    return { newTodos: [], todoUpdates: [], completedTodos: [] };
  }
}

async function getRAGContext(message: any, userId: string) {
  try {
    // Query RAG system for relevant context
    // Use full URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/rag/process-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${message.subject} ${message.body}`,
        userId: userId,
        contextType: 'message_analysis'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.context || '';
    }
  } catch (error) {
    console.error('RAG context error:', error);
  }
  return '';
}

async function callAnalysisAPI(
  message: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    // Use the new n8n message analysis webhook
    const n8nWebhookUrl = process.env.N8N_MESSAGE_ANALYSIS_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.warn('N8N message analysis webhook URL not configured, using local analysis fallback');
      return await performLocalAnalysis(message, existingTodos, weddingContext, userId);
    }

    // Ensure all required fields are provided for N8N webhook
    const vendorName = message.contactName || message.from || message.contactEmail || 'Unknown Vendor';
    const vendorCategory = message.contactCategory || message.category || 'Unknown';
    
    console.log(`📤 Calling N8N webhook for message: "${message.subject}" from ${vendorName}`);
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_content: message.body || '',
        subject: message.subject || 'No subject',
        vendor_category: vendorCategory,
        vendor_name: vendorName,
        existing_todos: existingTodos.map(todo => ({
          id: todo.id,
          name: todo.name,
          note: todo.note || '',
          category: todo.category || 'general',
          deadline: todo.deadline,
          isCompleted: todo.isCompleted || false
        })),
        wedding_context: weddingContext || {},
        user_id: userId,
        message_id: message.id || `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }),
    });

    if (!response.ok) {
      throw new Error(`N8N Message Analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`📥 N8N webhook response:`, {
      success: result.success,
      hasAnalysis: !!result.analysis,
      error: result.error,
      newTodosCount: result.analysis?.newTodos?.length || 0
    });
    
    if (result.success && result.analysis) {
      console.log(`✅ N8N analysis successful: ${result.analysis.newTodos?.length || 0} new todos`);
      return result.analysis;
    } else {
      console.warn('⚠️ N8N analysis returned unsuccessful result:', result);
      console.warn('⚠️ Falling back to local analysis');
      return await performLocalAnalysis(message, existingTodos, weddingContext, userId);
    }
  } catch (error: any) {
    console.error('❌ N8N Message analysis error:', error.message);
    console.warn('⚠️ Falling back to local analysis');
    return await performLocalAnalysis(message, existingTodos, weddingContext, userId);
  }
}

async function createSuggestedTodo(
  todoData: any,
  message: any,
  userId: string,
  adminDb: any
) {
  try {
    // Get or create the "Suggested from Messages" list
    let defaultListId = await getOrCreateSuggestedList(userId, adminDb);

    // Create the suggested todo
    const todoRef = adminDb.collection('todoItems').doc();
    await todoRef.set({
      id: todoRef.id,
      name: todoData.name,
      note: todoData.description || todoData.notes || null,
      deadline: todoData.dueDate ? new Date(todoData.dueDate) : null,
      category: todoData.category || 'general',
      contactId: message.contactId,
      isCompleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      listId: defaultListId,
      userId: userId,
      orderIndex: 0,
      completedAt: null,
      justUpdated: false,
      assignedTo: null,
      assignedBy: null,
      assignedAt: null,
      notificationRead: false,
      suggestedFromMessage: true,
      suggestedAt: admin.firestore.FieldValue.serverTimestamp(),
      priority: todoData.priority || 'medium',
      sourceMessageId: message.id
    });

    console.log(`Created suggested todo: ${todoData.name}`);
  } catch (error) {
    console.error('Error creating suggested todo:', error);
  }
}

async function getOrCreateSuggestedList(userId: string, adminDb: any) {
  const listsSnapshot = await adminDb
    .collection('todoLists')
    .where('userId', '==', userId)
    .where('name', '==', 'Suggested from Messages')
    .limit(1)
    .get();

  if (listsSnapshot.empty) {
    const listRef = adminDb.collection('todoLists').doc();
    await listRef.set({
      id: listRef.id,
      name: 'Suggested from Messages',
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      orderIndex: 0
    });
    return listRef.id;
  } else {
    return listsSnapshot.docs[0].id;
  }
}

async function updateExistingTodo(update: any, adminDb: any) {
  try {
    const todoRef = adminDb.collection('todoItems').doc(update.todoId);
    const updateData: any = {
      justUpdated: true,
      lastUpdatedFromMessage: admin.firestore.FieldValue.serverTimestamp()
    };

    if (update.updates.note) {
      updateData.note = update.updates.note;
    }
    if (update.updates.deadline) {
      updateData.deadline = new Date(update.updates.deadline);
    }
    if (update.updates.category) {
      updateData.category = update.updates.category;
    }
    if (update.updates.isCompleted !== undefined) {
      updateData.isCompleted = update.updates.isCompleted;
      if (update.updates.isCompleted) {
        updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    await todoRef.update(updateData);
    console.log(`Updated todo ${update.todoId}`);
  } catch (error) {
    console.error('Error updating todo:', error);
  }
}

async function completeTodo(completion: any, adminDb: any) {
  try {
    const todoRef = adminDb.collection('todoItems').doc(completion.todoId);
    await todoRef.update({
      isCompleted: true,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completionReason: completion.completionReason,
      completedFromMessage: true,
      justUpdated: true
    });
    console.log(`Completed todo ${completion.todoId}`);
  } catch (error) {
    console.error('Error completing todo:', error);
  }
}

async function performLocalAnalysis(
  message: any,
  existingTodos: any[],
  weddingContext: any,
  userId: string
) {
  try {
    console.log('🔍 Performing AI-powered local analysis for message:', message.subject);
    
    // Use OpenAI for smart analysis
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Build context about existing todos
    const existingTodosContext = existingTodos.length > 0 
      ? `\n\nEXISTING TODO ITEMS:\n${existingTodos.map(todo => 
          `- ${todo.name}${todo.note ? ` (${todo.note})` : ''}${todo.deadline ? ` [Due: ${todo.deadline}]` : ''} ${todo.isCompleted ? '[COMPLETED]' : '[PENDING]'}`
        ).join('\n')}`
      : '\n\nNo existing todo items yet.';
    
    // Build wedding context
    const weddingCtx = weddingContext ? `\n\nWEDDING CONTEXT:\n- Date: ${weddingContext.weddingDate || 'Not set'}\n- Location: ${weddingContext.weddingLocation || 'Not set'}\n- Guest Count: ${weddingContext.guestCount || 'Not set'}\n- Budget: ${weddingContext.maxBudget || 'Not set'}` : '';
    
    const prompt = `You are analyzing an email message for a wedding planning app. Extract actionable todo items, identify updates to existing todos, and detect completed tasks.

EMAIL:
Subject: ${message.subject || 'No subject'}
From: ${message.contactName || 'Unknown'}
Category: ${message.contactCategory || 'Unknown'}
Body: ${message.body || 'No content'}
${existingTodosContext}${weddingCtx}

INSTRUCTIONS:
1. Identify NEW actionable todo items that should be created
2. Identify if any EXISTING todos should be UPDATED with new information
3. Identify if any EXISTING todos have been COMPLETED based on the message
4. Be specific and actionable - avoid generic todos like "Review message"
5. Only suggest todos if there are clear action items

Return ONLY valid JSON (no markdown, no code blocks):
{
  "newTodos": [{"name": "string", "note": "string", "category": "string", "deadline": "YYYY-MM-DD or null", "priority": "low|medium|high"}],
  "todoUpdates": [{"todoId": "existing_todo_id", "updates": {"note": "string", "deadline": "YYYY-MM-DD"}}],
  "completedTodos": [{"todoId": "existing_todo_id", "completionReason": "string"}]
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

    console.log(`✅ AI local analysis results: ${analysis.newTodos?.length || 0} new todos, ${analysis.todoUpdates?.length || 0} updates, ${analysis.completedTodos?.length || 0} completed`);
    
    return {
      newTodos: analysis.newTodos || [],
      todoUpdates: analysis.todoUpdates || [],
      completedTodos: analysis.completedTodos || []
    };
  } catch (error) {
    console.error('❌ AI local analysis error:', error);
    
    // Ultra-simple fallback - only create a todo if the message is clearly actionable
    const messageText = `${message.subject || ''} ${message.body || ''}`.toLowerCase();
    const actionKeywords = ['need to', 'please', 'can you', 'should', 'must', 'deadline', 'by when', 'confirm', 'send', 'provide'];
    const hasAction = actionKeywords.some(keyword => messageText.includes(keyword));
    
    if (hasAction && message.subject && message.subject.length > 5) {
      return {
        newTodos: [{
          name: `Follow up: ${message.subject}`,
          description: message.body?.substring(0, 200) || '',
          category: message.contactCategory || 'general',
          priority: 'medium'
        }],
        todoUpdates: [],
        completedTodos: []
      };
    }
    
    return { newTodos: [], todoUpdates: [], completedTodos: [] };
  }
}

async function markMessageAsScanned(messageId: string, adminDb: any) {
  try {
    // Find the message document and mark it as scanned
    const messagesSnapshot = await adminDb
      .collectionGroup('messages')
      .where(admin.firestore.FieldPath.documentId(), '==', messageId)
      .limit(1)
      .get();

    if (!messagesSnapshot.empty) {
      const messageRef = messagesSnapshot.docs[0].ref;
      await messageRef.update({
        todoScanned: true,
        todoScannedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error marking message as scanned:', error);
  }
}
