import { NextRequest, NextResponse } from 'next/server';
import { creditService } from './creditService';
import { AIFeature } from '@/types/credits';

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
      // Extract userId from request
      let userId: string | undefined;
      
      if (options.userIdField) {
        // Try to get userId from request body
        try {
          const body = await request.json().catch(() => ({}));
          userId = body[options.userIdField];
          
          // Reconstruct request since we consumed the body
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body)
          });
          request = newRequest;
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
        
        if (!validation.canProceed) {
          return NextResponse.json(
            { 
              error: 'Insufficient credits',
              message: options.errorMessage || validation.message || 'Not enough credits for this feature',
              credits: {
                required: validation.requiredCredits,
                current: validation.currentCredits,
                remaining: validation.remainingCredits
              },
              feature: options.feature,
              upgradeRequired: true
            },
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

        // Add credit info to headers for the handler to use
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            'x-credits-required': validation.requiredCredits.toString(),
            'x-credits-remaining': validation.remainingCredits.toString(),
            'x-user-id': userId
          },
          body: request.body
        });

        // Call the handler
        const response = await handler(newRequest);

        // If the request was successful, deduct credits
        if (response.ok) {
          try {
            await creditService.deductCredits(userId, options.feature, {
              requestId: request.headers.get('x-request-id') || undefined,
              timestamp: new Date().toISOString(),
              userAgent: request.headers.get('user-agent') || undefined
            });
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
