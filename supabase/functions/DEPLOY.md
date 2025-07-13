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
```bash
# Test seed database function
curl -X POST http://localhost:54321/functions/v1/seed-database \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Test email functions
curl -X POST http://localhost:54321/functions/v1/email-work-order-created \
  -H "Content-Type: application/json" \
  -d '{"work_order_id": "test-id"}'
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
supabase functions deploy seed-database
supabase functions deploy email-work-order-created
supabase functions deploy clear-test-data
```

### 3. Verify Deployment
```bash
# Check function status
supabase status

# List all functions
supabase functions list

# Test deployed function
curl -X POST https://your-project.supabase.co/functions/v1/seed-database \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## Function Configuration

### JWT Verification Settings
Functions are configured in `supabase/config.toml`:

```toml
# Email functions (public access)
[functions.email-work-order-created]
verify_jwt = false

[functions.email-work-order-assigned]
verify_jwt = false

# Database functions (protected - default verify_jwt = true)
# seed-database and clear-test-data require authentication
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
supabase functions logs seed-database

# Stream logs in real-time
supabase functions logs seed-database --tail

# View logs for all functions
supabase functions logs --tail
```

### Check Function Health
```bash
# Get function status
supabase status

# Check database connectivity
supabase db ping
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

| Function | Purpose | Authentication |
|----------|---------|----------------|
| `seed-database` | Populate database with test data | Required |
| `clear-test-data` | Remove test data from database | Required |
| `email-work-order-created` | Send work order creation notifications | Public |
| `email-work-order-assigned` | Send assignment notifications | Public |
| `email-work-order-completed` | Send completion notifications | Public |
| `email-report-submitted` | Send report submission notifications | Public |
| `email-report-reviewed` | Send report review notifications | Public |
| `email-welcome` | Send welcome emails to new users | Public |
| `invoice-submitted` | Handle invoice submission events | Public |
| `invoice-status-changed` | Handle invoice status updates | Public |
| `resend-webhook` | Handle Resend email service webhooks | Public |

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/manual)
- [Function Development Guide](./README.md)
- [Project Deployment Guide](../docs/DEPLOYMENT.md)