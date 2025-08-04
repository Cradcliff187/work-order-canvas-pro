# Production Deployment Checklist

## Pre-Deployment Verification

### Database & Migrations
- [ ] All database migrations have been applied successfully
- [ ] Database functions are deployed (check `public.validate_security_setup()`)
- [ ] Audit logs table and triggers are active
- [ ] Organization_members table relationships are properly configured
- [ ] All RLS policies are enabled and tested (run `SELECT validate_security_setup()`)
- [ ] Test data cleanup completed (`/admin/utilities` - clear test data)
- [ ] Database connection pooling configured for production load

### Environment Configuration
- [ ] Supabase project environment variables verified
- [ ] Service role key configured in Edge Functions secrets
- [ ] Anon key properly set in client configuration
- [ ] Database URL accessible from deployment environment
- [ ] CORS settings configured for production domain

### Email System Setup
- [ ] Resend API key configured in Supabase secrets (`RESEND_API_KEY`)
- [ ] Resend domain verified and DNS configured
- [ ] Email templates exist and are marked as active in `email_templates` table
- [ ] pg_cron extension enabled and email queue processor scheduled (5-minute intervals)
- [ ] Email queue health check function deployed (`check_email_queue_health()`)

### Edge Functions Deployment
- [ ] `send-email` function deployed and JWT verification disabled
- [ ] `password-reset-email` function deployed
- [ ] `process-email-queue` function deployed
- [ ] `create-admin-user` function deployed with JWT verification enabled
- [ ] `setup-test-environment` function deployed (disable for production)
- [ ] All edge functions have proper CORS headers configured

### Storage & File Management
- [ ] Supabase storage buckets created and configured
- [ ] File upload policies properly set for work order attachments
- [ ] Storage bucket permissions align with RLS policies
- [ ] File size limits configured appropriately
- [ ] CDN/storage URL accessible from production domain

### Security Configuration
- [ ] Site URL configured in Supabase Auth settings
- [ ] Redirect URLs configured for production domain
- [ ] API rate limiting enabled
- [ ] RLS policies tested with production-like data volume
- [ ] JWT secret rotation schedule established
- [ ] Database backup schedule configured

## Post-Deployment Verification

### Authentication & Authorization Testing
- [ ] Admin user can log in successfully
- [ ] Partner organization users can access their work orders only
- [ ] Subcontractor users can view assigned work orders only
- [ ] Internal organization users can access all work orders
- [ ] User registration flow works end-to-end
- [ ] Password reset flow functions correctly
- [ ] JWT metadata sync working (`force_jwt_sync_for_current_user()`)

### Email Queue System Verification
- [ ] pg_cron job running every 5 minutes (check `pg_cron.job` table)
- [ ] Email queue processing logs show successful runs
- [ ] Test email sent and delivered successfully
- [ ] Failed email retry logic functioning
- [ ] Email delivery status tracking working (Resend webhooks)
- [ ] Queue monitoring returns healthy status

### Core Functionality Testing
- [ ] Work order creation by partners working
- [ ] Work order assignment to subcontractors functional
- [ ] Work order status transitions triggering emails correctly
- [ ] File uploads and downloads working
- [ ] Organization management (CRUD operations) functional
- [ ] User management by admins working
- [ ] Audit logs capturing all required changes

### Database Performance & Health
- [ ] Database query performance acceptable under load
- [ ] Connection pooling working effectively
- [ ] Database indexes optimized for production queries
- [ ] RLS policy performance acceptable
- [ ] Database backup/restore tested
- [ ] Real-time subscriptions working (work order updates)

### Real-time Features
- [ ] Work order message system functioning
- [ ] Real-time status updates working
- [ ] Message read receipts functional
- [ ] Push notifications working (if implemented)

## Monitoring & Alerting Setup

### Email System Monitoring
- [ ] Failed email alerts configured (retry_count >= 3)
- [ ] Email queue size monitoring (pending > 50 items alert)
- [ ] Email processing time alerts (> 15 minutes for oldest pending)
- [ ] Resend API error rate monitoring
- [ ] Email delivery rate tracking dashboard

### Authentication & Security Monitoring
- [ ] Failed login attempt monitoring
- [ ] RLS policy violation alerts
- [ ] Unusual authentication pattern detection
- [ ] JWT token expiration monitoring
- [ ] API rate limit breach alerts

### System Health Monitoring
- [ ] Database connection monitoring
- [ ] Edge function error rate tracking
- [ ] Storage bucket usage monitoring
- [ ] System performance metrics dashboard
- [ ] Uptime monitoring for all critical endpoints

### Application-Specific Monitoring
- [ ] Work order creation rate monitoring
- [ ] Organization member sync health
- [ ] File upload success rate tracking
- [ ] Message delivery confirmation monitoring
- [ ] Audit log integrity checks

### Dashboard Configuration
- [ ] System health dashboard accessible at `/admin/system-health`
- [ ] Email queue status visible in admin interface
- [ ] Organization activity monitoring enabled
- [ ] User activity tracking functional
- [ ] Error log aggregation working

## Emergency Response Setup

### Rollback Procedures
- [ ] Database migration rollback procedures documented
- [ ] Edge function rollback process tested
- [ ] Email queue manual processing procedure documented
- [ ] Emergency contact list for Supabase/Resend support established

### Backup Verification
- [ ] Automated database backups working
- [ ] File storage backups configured
- [ ] Configuration backup procedures in place
- [ ] Disaster recovery plan documented and tested

## Go-Live Checklist

### Final Verification
- [ ] All items above completed and verified
- [ ] Production domain DNS configured
- [ ] SSL certificates valid and auto-renewal configured
- [ ] All test accounts removed or disabled
- [ ] Production admin account created and secured
- [ ] Monitoring dashboards accessible
- [ ] Emergency procedures communicated to team
- [ ] Go-live communication sent to stakeholders

### Post Go-Live (First 24 Hours)
- [ ] Monitor email queue processing logs
- [ ] Verify user registrations and logins
- [ ] Check system performance metrics
- [ ] Monitor error rates and alerts
- [ ] Verify real-time features working
- [ ] Confirm backup procedures executed successfully

---

**Notes:**
- Use `/admin/system-health` for real-time system monitoring
- Check email queue status with `SELECT monitor_email_queue()`
- Test RLS policies with `SELECT test_rls_for_user('test@email.com')`
- View processing logs in `email_queue_processing_log` table
- Use DevTools (`/dev-tools`) for debugging authentication issues

**Critical Support URLs:**
- Supabase Dashboard: https://supabase.com/dashboard/project/inudoymofztrvxhrlrek
- Resend Dashboard: https://resend.com/emails
- Edge Function Logs: https://supabase.com/dashboard/project/inudoymofztrvxhrlrek/functions