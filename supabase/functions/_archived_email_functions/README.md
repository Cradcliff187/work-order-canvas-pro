

# Archived Email Edge Functions

This directory contains email-related edge functions that have been archived but preserved for potential future use.

## Archived Functions

- `email-work-order-created/` - Sends notifications when new work orders are created
- `email-work-order-assigned/` - Sends notifications when work orders are assigned to contractors
- `email-work-order-completed/` - Sends notifications when work orders are completed
- `email-report-submitted/` - Sends notifications when work reports are submitted
- `email-report-reviewed/` - Sends notifications when reports are approved/rejected
- `email-welcome-user/` - Sends welcome emails to new users

## Archive Date
July 20, 2025

## Archive Status
**COMPLETE** - All legacy email functions have been successfully archived. The new `send-email` function using IONOS SMTP is now the active email system.

## Restoration Instructions

To restore any of these functions:

1. Move the desired function directory from `_archived_email_functions/` back to `supabase/functions/`
2. Add the function configuration back to `supabase/config.toml`:
   ```toml
   [functions.function-name]
   verify_jwt = false
   ```
3. Deploy the functions

## Technology Notes

These functions use:
- IONOS SMTP for email delivery
- SMTPClient from denomailer
- HTML email templates with proper MIME headers
- Comprehensive error logging to email_logs table

All functions are preserved with their complete implementation and can be restored without modification.

## Current Active Email System

The active email system is now handled by the `send-email` function located in `supabase/functions/send-email/`, which uses IONOS SMTP for reliable email delivery.

