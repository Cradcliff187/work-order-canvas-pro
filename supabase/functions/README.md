# Supabase Edge Functions

This directory contains Supabase Edge Functions that provide server-side capabilities for the WorkOrderPro application. Edge Functions run on Supabase's global infrastructure and provide secure, scalable serverless computing.

## Function Overview

### Email Functions
- **email-work-order-created**: Sends notifications when new work orders are created
- **email-work-order-assigned**: Notifies subcontractors when work orders are assigned
- **email-work-order-completed**: Sends completion notifications to partners
- **email-report-submitted**: Notifies admins when work reports are submitted
- **email-report-reviewed**: Notifies subcontractors of report review status
- **email-welcome**: Sends welcome emails to new users
- **invoice-status-changed**: Handles invoice status change notifications
- **invoice-submitted**: Processes invoice submission notifications
- **resend-webhook**: Handles Resend email delivery webhooks

### Database Functions
- **seed-database**: Secure database seeding with RLS bypass capabilities

## Architecture

### Shared Components (`_shared/`)

**types.ts**: Comprehensive TypeScript interfaces for all edge functions
- Database entity types (Organization, Profile, WorkOrder, etc.)
- Seeding-specific types and progress tracking
- Edge function response structures
- Authentication context interfaces

**cors.ts**: Standardized CORS utilities
- Standard headers for web application compatibility
- Preflight request handling
- Success/error response helpers
- Domain-specific security configurations

**seed-data.ts**: Centralized test data definitions
- Organizations (Partners, Subcontractors, Internal)
- User profiles for all user types
- Trade categories and email templates
- Helper functions for data access

## Security Model

### Authentication
- **Email Functions**: Use Supabase JWT authentication
- **Database Functions**: Service role access with admin validation
- **Webhooks**: Signature verification for external services

### Row-Level Security (RLS)
- Edge functions bypass RLS using service role key
- Essential for administrative operations (user creation, seeding)
- Maintains data security through function-level access control

### Access Control
- Admin functions require explicit authorization
- User context validation for sensitive operations
- Comprehensive audit logging

## Local Development

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Install Deno (required for edge functions)
curl -fsSL https://deno.land/x/install/install.sh | sh
```

### Setup Local Environment
```bash
# Start Supabase local development
supabase start

# Serve functions locally
supabase functions serve

# Test specific function
supabase functions serve --debug seed-database
```

### Environment Variables
Create `.env.local` in your project root:
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
```

### Testing Functions

**Test Database Seeding:**
```bash
curl -X POST http://localhost:54321/functions/v1/seed-database \
  -H "Content-Type: application/json" \
  -d '{"admin_key": "test", "options": {"clear_existing": true}}'
```

**Test Email Function:**
```bash
curl -X POST http://localhost:54321/functions/v1/email-work-order-created \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"work_order_id": "test-id"}'
```

### Debugging
```bash
# View function logs
supabase functions logs seed-database

# Real-time log streaming
supabase functions logs --follow
```

## Deployment

### Automatic Deployment
Functions are automatically deployed when:
- Code is pushed to main branch
- Lovable rebuilds the preview
- Manual deployment via Supabase CLI

### Manual Deployment
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy seed-database

# Deploy with environment variables
supabase secrets set RESEND_API_KEY=your_key
supabase functions deploy
```

### Production Considerations
- **CORS Configuration**: Restrict origins for production
- **Rate Limiting**: Implement function-level rate limits
- **Error Monitoring**: Set up alerting for function failures
- **Secret Management**: Use Supabase secrets for API keys

## Function Development Guidelines

### File Structure
```
functions/function-name/
├── index.ts          # Main function code (required)
└── README.md         # Function-specific documentation
```

### Best Practices
1. **Error Handling**: Always wrap operations in try-catch blocks
2. **CORS**: Use shared CORS utilities for consistency
3. **Logging**: Include comprehensive console logging for debugging
4. **Types**: Import shared types from `_shared/types.ts`
5. **Validation**: Validate all input parameters
6. **Security**: Never expose sensitive data in responses

### Code Example
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Function logic here
    const result = { success: true, data: {} };
    return createCorsResponse(result);
  } catch (error) {
    console.error('Function error:', error);
    return createCorsErrorResponse('Internal error', 500);
  }
});
```

## Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure CORS headers are properly set
- Check browser developer tools for specific CORS issues
- Verify OPTIONS request handling

**Authentication Failures:**
- Verify JWT token validity
- Check user permissions and RLS policies
- Ensure correct service role key usage

**Function Timeouts:**
- Optimize database queries
- Implement proper error handling
- Consider breaking large operations into smaller chunks

**Import Errors:**
- Use exact Deno-compatible import URLs
- Check for typos in shared module imports
- Verify file paths and extensions

### Getting Help
- Check function logs via Supabase dashboard
- Use local development for debugging
- Refer to [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions)

## Monitoring

### Production Monitoring
- Function execution logs in Supabase dashboard
- Error rates and performance metrics
- Custom alerting for critical functions

### Local Monitoring
```bash
# Monitor function performance
supabase functions logs --follow

# Check function status
supabase status
```

---

*For specific function documentation, see individual README files in each function directory.*