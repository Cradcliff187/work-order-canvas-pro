// ============= Supabase Edge Functions CORS Utilities =============

/**
 * Standard CORS headers for all Edge Functions
 * Allows requests from any origin with common HTTP methods
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

/**
 * Handle CORS preflight requests
 * Returns a preflight response if the request is an OPTIONS request
 * 
 * @param request - The incoming request object
 * @returns Response object for preflight or null if not a preflight request
 */
export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }
  return null
}

/**
 * Create a success response with CORS headers
 * 
 * @param data - The data to return in the response
 * @param status - HTTP status code (default: 200)
 * @returns Response object with CORS headers
 */
export function createCorsResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Create an error response with CORS headers
 * 
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 * @param code - Optional error code
 * @returns Response object with CORS headers and error details
 */
export function createCorsErrorResponse(
  error: string, 
  status: number = 400, 
  code?: string
): Response {
  const errorData: any = { error }
  if (code) {
    errorData.code = code
  }
  
  return new Response(JSON.stringify(errorData), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Create CORS headers for specific allowed origins
 * Use this when you need to restrict access to specific domains
 * 
 * @param allowedOrigins - Array of allowed origin URLs
 * @returns CORS headers object with restricted origins
 */
export function createRestrictedCorsHeaders(allowedOrigins: string[]) {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.join(', '),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }
}