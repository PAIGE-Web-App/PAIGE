import { NextRequest, NextResponse } from 'next/server';
import { creditService } from './creditService';
import { creditEventEmitter } from '@/utils/creditEventEmitter';
import { AIFeature, getCreditCosts } from '@/types/credits';

export interface CreditValidationOptions {
  feature: AIFeature;
  userIdField?: string; // Field name containing userId in request body
  requireAuth?: boolean; // Whether to require authentication
  errorMessage?: string; // Custom error message
  handler?: (request: NextRequest) => Promise<NextResponse>; // Optional handler for createCreditValidator
}

/**
 * Middleware to validate credits before processing AI requests
 */
export function withCreditValidation(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CreditValidationOptions
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Check if this request has already been processed by credit middleware
      const creditProcessed = request.headers.get('x-credit-processed');
      
      if (creditProcessed === 'true') {
        // Already processed, just call the handler
        return handler(request);
      }
      
      // Mark this request as processed by credit middleware
      request.headers.set('x-credit-processed', 'true');
      
      // Extract userId from request
      let userId: string | undefined;
      
      let requestBody: any = {};
      if (options.userIdField) {
        // Try to get userId from request body
        try {
          // Check if it's FormData
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('multipart/form-data')) {
            // Handle FormData
            const formData = await request.formData();
            userId = formData.get(options.userIdField) as string;
            // Clone the FormData so it can be read again by the handler
            const clonedFormData = new FormData();
            for (const [key, value] of formData.entries()) {
              clonedFormData.append(key, value);
            }
            // Store cloned FormData for later use
            requestBody = { formData: clonedFormData };
          } else {
            // Handle JSON
            requestBody = await request.json().catch(() => ({}));
            userId = requestBody[options.userIdField];
          }
        } catch (error) {
          console.error('Error parsing request body for credit validation:', error);
        }
      } else {
        // Try to get userId from headers (for authenticated requests)
        userId = request.headers.get('x-user-id') || undefined;
      }

      if (!userId && options.requireAuth !== false) {
        return NextResponse.json(
          { 
            error: 'User ID required for credit validation',
            message: 'Please provide a valid user ID'
          },
          { status: 400 }
        );
      }

      if (userId) {
        // Validate credits
        const validation = await creditService.validateCredits(userId, options.feature);
        
        console.log('Credit middleware: Validation result:', validation);
        
        if (!validation.canProceed) {
          const errorResponse = { 
            error: 'Insufficient credits',
            message: options.errorMessage || validation.message || 'Not enough credits for this feature',
            credits: {
              required: validation.requiredCredits,
              current: validation.currentCredits,
              remaining: validation.remainingCredits
            },
            feature: options.feature,
            upgradeRequired: true
          };
          
          console.log('Credit middleware: Returning 402 response:', errorResponse);
          
          return NextResponse.json(
            errorResponse,
            { status: 402 } // Payment Required
          );
        }

        // Check if user has access to this feature
        const hasAccess = await creditService.hasFeatureAccess(userId, options.feature);
        if (!hasAccess) {
          return NextResponse.json(
            { 
              error: 'Feature not available',
              message: 'This AI feature is not available with your current plan',
              feature: options.feature,
              upgradeRequired: true
            },
            { status: 403 } // Forbidden
          );
        }

        // Set credit headers
        request.headers.set('x-credits-required', validation.requiredCredits.toString());
        request.headers.set('x-credits-remaining', validation.remainingCredits.toString());
        request.headers.set('x-user-id', userId);
        
        // Reconstruct the request with the parsed body if we read it
        let requestToPass = request;
        if (requestBody && !requestBody.formData) {
          // For JSON requests, we need to reconstruct the request with the parsed body
          const reconstructedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(requestBody)
          });
          requestToPass = reconstructedRequest;
        } else if (requestBody && requestBody.formData) {
          // For FormData requests, use the cloned FormData
          const reconstructedRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: requestBody.formData
          });
          requestToPass = reconstructedRequest;
        }
        
        // Call the handler with the reconstructed request
        const response = await handler(requestToPass);
        
        // If the request was successful, deduct credits
        if (response.ok) {
          try {
            // Check if we already deducted credits for this request
            const alreadyDeducted = request.headers.get('x-credits-deducted');
            if (alreadyDeducted === 'true') {
              return response;
            }
            
            // Build metadata object, filtering out undefined values
            const metadata: Record<string, any> = {
              timestamp: new Date().toISOString(),
              requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            
            const requestId = request.headers.get('x-request-id');
            if (requestId) {
              metadata.requestId = requestId;
            }
            
            const userAgent = request.headers.get('user-agent');
            if (userAgent) {
              metadata.userAgent = userAgent;
            }
            
            console.log('Attempting to deduct credits:', { userId, feature: options.feature, metadata });
            
            // Get credits before deduction for event data
            const userCredits = await creditService.getUserCredits(userId);
            const creditCosts = getCreditCosts(userCredits?.userType || 'couple');
            const requiredCredits = creditCosts[options.feature] || 1;
            const creditsBeforeDeduction = userCredits ? (userCredits.dailyCredits || 0) + (userCredits.bonusCredits || 0) : 0;
            
            console.log('🎯 Credit middleware - Before deduction:', {
              userId,
              feature: options.feature,
              creditsBeforeDeduction,
              requiredCredits,
              userCredits: userCredits ? {
                dailyCredits: userCredits.dailyCredits,
                bonusCredits: userCredits.bonusCredits,
                userType: userCredits.userType
              } : null
            });
            
            const success = await creditService.deductCredits(userId, options.feature, metadata);
            console.log('Credit deduction result:', success);
            
            if (success) {
              // Mark this request as having credits deducted
              request.headers.set('x-credits-deducted', 'true');
              
              // Update the x-credits-remaining header to reflect the new balance
              const newRemainingCredits = creditsBeforeDeduction - requiredCredits;
              request.headers.set('x-credits-remaining', newRemainingCredits.toString());
              
              console.log('🎯 Credits deducted successfully on server-side');
              console.log('🎯 Updated credits remaining header:', newRemainingCredits);
              // Note: Credit event emission moved to client-side hooks
            } else {
              console.log('Credit deduction failed');
            }
          } catch (error) {
            console.error('Error deducting credits after successful request:', error);
            // Don't fail the request if credit deduction fails
          }
        }
        
        return response;
      }

      // If no userId and not required, proceed without credit validation
      return handler(request);
    } catch (error) {
      console.error('Credit validation middleware error:', error);
      return NextResponse.json(
        { 
          error: 'Credit validation failed',
          message: 'Unable to validate credits for this request'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to create credit validation wrapper for specific features
 */
export function createCreditValidator(feature: AIFeature) {
  return (options?: Partial<CreditValidationOptions>) => {
    return withCreditValidation(
      options?.handler || (() => Promise.resolve(new NextResponse())),
      {
        feature,
        ...options
      }
    );
  };
}

/**
 * Pre-configured credit validators for common AI features
 */
export const creditValidators = {
  draftMessaging: createCreditValidator('draft_messaging'),
  todoGeneration: createCreditValidator('todo_generation'),
  fileAnalysis: createCreditValidator('file_analysis'),
  messageAnalysis: createCreditValidator('message_analysis'),
  integratedPlanning: createCreditValidator('integrated_planning'),
  budgetGeneration: createCreditValidator('budget_generation'),
  vibeGeneration: createCreditValidator('vibe_generation'),
  vendorSuggestions: createCreditValidator('vendor_suggestions'),
  followUpQuestions: createCreditValidator('follow_up_questions'),
  
  // Planner features
  clientCommunication: createCreditValidator('client_communication'),
  vendorCoordination: createCreditValidator('vendor_coordination'),
  clientPlanning: createCreditValidator('client_planning'),
  vendorAnalysis: createCreditValidator('vendor_analysis'),
  clientPortalContent: createCreditValidator('client_portal_content'),
  businessAnalytics: createCreditValidator('business_analytics'),
  clientOnboarding: createCreditValidator('client_onboarding'),
  vendorContractReview: createCreditValidator('vendor_contract_review'),
  clientTimelineCreation: createCreditValidator('client_timeline_creation')
};

/**
 * Utility function to get credit info from response headers
 */
export function getCreditInfoFromHeaders(response: NextResponse) {
  return {
    required: parseInt(response.headers.get('x-credits-required') || '0'),
    remaining: parseInt(response.headers.get('x-credits-remaining') || '0'),
    userId: response.headers.get('x-user-id') || undefined
  };
}

/**
 * Utility function to add credit info to response headers
 */
export function addCreditInfoToHeaders(
  response: NextResponse,
  required: number,
  remaining: number,
  userId?: string
) {
  response.headers.set('x-credits-required', required.toString());
  response.headers.set('x-credits-remaining', remaining.toString());
  if (userId) {
    response.headers.set('x-user-id', userId);
  }
  return response;
}
