-- Phase C: Add Health Check Cron Job
-- Create system_alerts table for health monitoring

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON public.system_alerts(alert_type);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "admins_can_manage_system_alerts" ON public.system_alerts
  FOR ALL USING (jwt_is_admin()) WITH CHECK (jwt_is_admin());

CREATE POLICY "employees_can_select_system_alerts" ON public.system_alerts
  FOR SELECT USING (jwt_user_type() = 'employee');

-- Create function to check email queue health and generate alerts
CREATE OR REPLACE FUNCTION public.check_email_queue_health()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_data jsonb;
  queue_health text;
  pending_count integer;
  failed_count integer;
  alert_message text;
BEGIN
  -- Call the existing monitor_email_queue function
  SELECT public.monitor_email_queue() INTO health_data;
  
  -- Extract health metrics
  queue_health := health_data->>'queue_health';
  pending_count := (health_data->>'pending_count')::integer;
  failed_count := (health_data->>'failed_count')::integer;
  
  -- Check for unhealthy conditions and generate alerts
  IF queue_health = 'delayed' THEN
    alert_message := format('Email queue is delayed. Pending: %s, Failed: %s', pending_count, failed_count);
    
    INSERT INTO public.system_alerts (alert_type, severity, message)
    VALUES ('email_queue_delayed', 'medium', alert_message);
    
  ELSIF pending_count > 50 THEN
    alert_message := format('High pending email count: %s emails in queue', pending_count);
    
    INSERT INTO public.system_alerts (alert_type, severity, message)
    VALUES ('email_queue_high_pending', 'high', alert_message);
    
  ELSIF failed_count > 10 THEN
    alert_message := format('High failed email count: %s failed emails', failed_count);
    
    INSERT INTO public.system_alerts (alert_type, severity, message)
    VALUES ('email_queue_high_failures', 'high', alert_message);
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  INSERT INTO public.system_alerts (alert_type, severity, message)
  VALUES ('email_queue_monitor_error', 'critical', format('Failed to monitor email queue: %s', SQLERRM));
END;
$$;

-- Create the cron job to run every 30 minutes
SELECT cron.schedule(
  'monitor-email-queue-health',
  '*/30 * * * *',
  $$SELECT public.check_email_queue_health();$$
);