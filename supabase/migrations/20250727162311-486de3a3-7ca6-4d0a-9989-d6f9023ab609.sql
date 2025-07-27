-- Phase 1: Enable pg_cron Extension for Automated Email Processing
-- ============================================================================
-- This migration enables the PostgreSQL cron extension to support scheduled
-- job processing for automated email queue management.
-- 
-- Purpose:
-- - Enables pg_cron extension for running scheduled database jobs
-- - Grants necessary permissions for cron job execution
-- - Sets up foundation for future automated email processing phases
--
-- What pg_cron enables:
-- - Scheduled execution of SQL commands at specified intervals
-- - Automated email queue processing without manual intervention
-- - Background job management for system maintenance tasks
--
-- Integration with Email System:
-- - Future phases will create cron jobs to process email_queue table
-- - Automated retry logic for failed email deliveries
-- - Scheduled cleanup of old email logs and processed queue items
--
-- Safety Notes:
-- - Uses IF NOT EXISTS to prevent errors if extension already installed
-- - Only grants minimal required permissions
-- - Does not modify any existing email functions or triggers
-- ============================================================================

-- Enable the pg_cron extension if it doesn't already exist
-- This extension allows scheduling of SQL commands to run at specified intervals
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage permissions on the cron schema to postgres user
-- This allows the postgres user to create and manage scheduled jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Verification comment: pg_cron extension is now available for automated email processing
-- Future phases will use this to create scheduled jobs for:
-- 1. Processing pending emails in email_queue table
-- 2. Retry failed email deliveries
-- 3. Cleanup old email logs and processed queue items
-- 4. System health monitoring and alerts