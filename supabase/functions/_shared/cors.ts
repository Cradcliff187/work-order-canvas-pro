/**
 * CORS utilities for Supabase Edge Functions
 * 
 * This module provides standardized Cross-Origin Resource Sharing (CORS) 
 * configuration for edge functions, ensuring proper browser compatibility
 * and security when called from web applications.
 * 
 * Security Considerations:
 * - Uses wildcard origin (*) for development flexibility
 * - In production, consider restricting to specific domains
 * - Includes necessary headers for Supabase client authentication
 */

/**
 * Standard CORS headers for edge functions
 * 
 * These headers allow:
 * - Requests from any origin (*)
 * - Standard authentication headers (authorization, apikey)
 * - Supabase client info headers (x-client-info)
 * - Content-Type for JSON payloads
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Handle CORS preflight requests
 * 
 * Browsers send OPTIONS requests before actual requests to check CORS policy.
 * This function provides a standard response for all edge functions.
 * 
 * @param request - The incoming HTTP request
 * @returns Response with CORS headers if OPTIONS, otherwise null
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

/**
 * Create a success response with CORS headers
 * 
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @returns Response with CORS headers and JSON data
 */
export function createCorsResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with CORS headers
 * 
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 * @param code - Optional error code
 * @returns Response with CORS headers and error data
 */
export function createCorsErrorResponse(
  error: string, 
  status: number = 400, 
  code?: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      code,
    }), 
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Domain-specific CORS configuration
 * 
 * For production deployments, use this function to restrict
 * CORS to specific domains for enhanced security.
 * 
 * @param allowedOrigins - Array of allowed origin domains
 * @returns CORS headers with restricted origins
 */
export function createRestrictedCorsHeaders(allowedOrigins: string[]) {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.join(', '),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}