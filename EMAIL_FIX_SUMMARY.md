# Email System Fix Summary

## Quick Steps for Loveable:

### 1. Update Edge Function
**File:** `supabase/functions/send-email/index.ts`

**Key Changes:**
- Fixed column names: `template_used`, `recipient_email`, `sent_at`
- Fixed non-existent `reports` table → `work_order_reports`
- Changed from domain: `noreply@workorderportal.com` (not `akcllc.com`)
- Added check for missing RESEND_API_KEY
- Better error handling and logging

### 2. Add Migration File
**File:** `supabase/migrations/20250722120000_fix_email_logs_columns.sql`

**What it does:**
- Adds missing columns to email_logs table
- Creates performance indexes
- Documents the fix for version control

### 3. Environment Variables Needed in Supabase
Go to Supabase Dashboard → Edge Functions → send-email → Secrets:
```
RESEND_API_KEY = [your-resend-api-key]
EMAIL_FROM_DOMAIN = workorderportal.com
PUBLIC_SITE_URL = https://workorderportal.com
```

## DNS Records for IONOS
Add these for workorderportal.com:
1. **SPF**: TXT record `v=spf1 include:amazonses.com ~all`
2. **DKIM**: CNAME records from Resend dashboard
3. **DMARC**: TXT `_dmarc` → `v=DMARC1; p=none;`

## Test Command (after fixes):
```typescript
// In src/scripts/testEmailSend.ts
// Change test_recipient to your email
// Run: npx tsx testEmailSend.ts
```

## What Was Wrong:
1. Edge function expected different column names than database had
2. Missing Resend API key (causing 403 errors)
3. Wrong from domain (akcllc.com not verified)
4. Referenced non-existent `reports` table