# Edge Functions Deployment Guide

This guide covers deploying and managing Supabase Edge Functions for the WorkOrderPro application.

## Prerequisites

### 1. Install Supabase CLI
```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux/macOS (Direct download)
curl -fsSL https://supabase.com/install.sh | sh
```

### 2. Install Deno (Required for Edge Functions)
```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

### 3. Authenticate with Supabase
```bash
supabase login
```

## Local Development Setup

### 1. Initialize Local Environment
```bash
# Start local Supabase stack
supabase start

# Serve Edge Functions locally
supabase functions serve --debug
```

### 2. Environment Variables Setup
Create `.env.local` in your project root:
```bash
# Required for email functions
RESEND_API_KEY=your_resend_api_key_here

# Auto-populated by Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```

### 3. Test Functions Locally

**Test Email Notification:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/email-work-order-created' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"work_order_id": "test-work-order-uuid"}'
```

**Test Webhook Processing:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/resend-webhook' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "email.delivered",
    "data": {
      "email_id": "test-email-id",
      "message_id": "test-message-id"
    }
  }'
```

## Production Deployment

### 1. Set Production Secrets
```bash
# Set required environment variables
supabase secrets set RESEND_API_KEY=your_production_resend_key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_production_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
supabase secrets set SUPABASE_DB_URL=your_production_db_url
```

### 2. Deploy Functions

#### Deploy All Functions
```bash
supabase functions deploy
```

#### Deploy Specific Function
```bash
# Deploy individual functions
supabase functions deploy email-work-order-created
supabase functions deploy email-work-order-assigned
supabase functions deploy resend-webhook
```

### 3. Verify Deployment
```bash
# Check function status
supabase status

# List all functions
supabase functions list

# Test deployed function
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-created \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"work_order_id": "real-work-order-uuid"}'
```

## Function Configuration

### Configure in supabase/config.toml
```toml
project_id = "inudoymofztrvxhrlrek"

# Email notification functions
[functions.email-work-order-created]
verify_jwt = false

[functions.email-work-order-assigned]
verify_jwt = false

[functions.email-work-order-completed]
verify_jwt = false

[functions.email-report-submitted]
verify_jwt = false

[functions.email-report-reviewed]
verify_jwt = false

[functions.email-welcome]
verify_jwt = false

[functions.invoice-submitted]
verify_jwt = false

[functions.invoice-status-changed]
verify_jwt = false

[functions.resend-webhook]
verify_jwt = false
```

### CORS Configuration
All functions include CORS headers for web app compatibility:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Monitoring and Logs

### View Function Logs
```bash
# View logs for specific function
supabase functions logs email-work-order-created

# Stream logs in real-time
supabase functions logs --follow

# Filter logs by level
supabase functions logs email-work-order-created --level error
```

### Check Function Health
```bash
# Test function endpoint
curl -i 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-created' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'

# Check function status in Supabase Dashboard
# https://supabase.com/dashboard/project/inudoymofztrvxhrlrek/functions
```

## Troubleshooting

### Common Deployment Issues

#### 1. Function Not Found Error
```bash
Error: Function "function-name" not found
```
**Solution**: Ensure function directory exists and contains `index.ts`
```bash
ls -la supabase/functions/function-name/
```

#### 2. Environment Variable Missing
```bash
Error: Environment variable "RESEND_API_KEY" is not set
```
**Solution**: Set the required secret
```bash
supabase secrets set RESEND_API_KEY=your_key_here
```

#### 3. JWT Verification Error
```bash
Error: JWT verification failed
```
**Solution**: Check if function should be public in `config.toml`
```toml
[functions.your-function]
verify_jwt = false
```

#### 4. CORS Issues
```bash
Error: CORS policy blocked request
```
**Solution**: Ensure CORS headers are included in function response
```javascript
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

#### 5. Import Resolution Errors
```bash
Error: Cannot resolve import
```
**Solution**: Use full URLs for imports in Edge Functions
```javascript
// ✅ Correct
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ❌ Incorrect
import { serve } from "std/http/server.ts"
```

### Development Issues

#### 1. Local Function Server Won't Start
```bash
# Check if ports are available
netstat -an | grep 54321

# Kill existing processes
pkill -f supabase

# Restart with debug
supabase functions serve --debug
```

#### 2. Database Connection Issues
```bash
# Verify local database is running
supabase status

# Reset local environment
supabase stop
supabase start
```

### Production Issues

#### 1. Function Timeout
- Edge Functions have a 10-minute timeout limit
- Optimize long-running operations
- Consider breaking into smaller functions

#### 2. Memory Limits
- Edge Functions have 150MB memory limit
- Optimize data processing
- Stream large datasets

#### 3. Rate Limiting
- Implement proper rate limiting in functions
- Monitor function usage in Supabase dashboard

## Best Practices

### 1. Security
- Never expose secrets in function code
- Use environment variables for all sensitive data
- Validate all input parameters
- Implement proper error handling

### 2. Performance
- Minimize cold start time
- Cache frequently used data
- Use appropriate HTTP status codes
- Implement proper logging

### 3. Maintenance
- Keep functions focused and single-purpose
- Use consistent error response formats
- Document function APIs
- Monitor function performance

## Available Functions

| Function Name | Purpose | Public | Dependencies |
|---------------|---------|--------|--------------|
| email-work-order-created | New work order notifications | Yes | Resend API |
| email-work-order-assigned | Assignment notifications | Yes | Resend API |
| email-work-order-completed | Completion notifications | Yes | Resend API |
| email-report-submitted | Report submission alerts | Yes | Resend API |
| email-report-reviewed | Report review notifications | Yes | Resend API |
| email-welcome | Welcome email for new users | Yes | Resend API |
| invoice-submitted | Invoice submission notifications | Yes | Resend API |
| invoice-status-changed | Invoice status updates | Yes | Resend API |
| resend-webhook | Email delivery webhooks | Yes | None |

All functions are configured as public (no JWT verification) to support database trigger integration.

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/manual)
- [Function Development Guide](./README.md)
- [Project Deployment Guide](../docs/DEPLOYMENT.md)