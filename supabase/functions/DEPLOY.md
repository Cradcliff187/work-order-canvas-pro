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
# Auto-populated by Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```

### 3. Test Functions Locally

**Test Email Notification:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"template_name": "work_order_created", "record_id": "test-work-order-uuid", "record_type": "work_order"}'
```

**Test Welcome Email:**
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"template_name": "welcome_email", "record_id": "test-user-uuid", "record_type": "profile"}'
```

## Production Deployment

### 1. Set Production Secrets
```bash
# Functions are deployed automatically with Supabase
# Resend API key required for email sending
```

### 2. Deploy Functions

#### Deploy All Functions
```bash
supabase functions deploy
```

#### Deploy Specific Function
```bash
# Deploy individual functions
supabase functions deploy send-email
supabase functions deploy create-admin-user
```

### 3. Verify Deployment
```bash
# Check function status
supabase status

# List all functions
supabase functions list

# Test deployed function
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template_name": "work_order_created", "record_id": "real-work-order-uuid", "record_type": "work_order"}'
```

## Function Configuration

### Configure in supabase/config.toml
```toml
project_id = "inudoymofztrvxhrlrek"

# Unified email function
[functions.send-email]
verify_jwt = false

[functions.create-admin-user]
verify_jwt = true

[functions.create-test-users]
verify_jwt = false

# Functions use Resend API for emails
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
supabase functions logs send-email

# Stream logs in real-time
supabase functions logs --follow

# Filter logs by level
supabase functions logs send-email --level error
```

### Check Function Health
```bash
# Test function endpoint
curl -i 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email' \
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

#### 2. Authentication Error
```bash
Error: Authentication failed
```
**Solution**: Check your authorization headers
```bash
# Ensure you're using the correct API key
curl -H "Authorization: Bearer YOUR_ANON_KEY" ...
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

| Function Name | Purpose | Auth Required | Dependencies |
|---------------|---------|---------------|--------------|
| send-email | Unified email notifications | No (called by triggers) | Resend API |
| create-admin-user | Create users with admin privileges | Yes (admin) | Supabase Auth |
| create-test-users | Create test users for development | Yes (admin key) | Supabase Auth |

The send-email function is called by database triggers and uses the Resend API for reliable email delivery. User creation functions require authentication.

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Runtime Documentation](https://deno.land/manual)
- [Function Development Guide](./README.md)
- [Project Deployment Guide](../docs/DEPLOYMENT.md)