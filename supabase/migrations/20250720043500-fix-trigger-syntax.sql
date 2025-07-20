
-- Update all trigger functions to use correct PostgreSQL syntax for net.http_post
-- PostgreSQL uses => for named parameters, not :=

CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body => jsonb_build_object(
      'template_name', 'welcome_email',
      'record_id', NEW.id::text,
      'record_type', 'profile'
    ),
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Welcome email trigger failed for profile %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_created_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body => jsonb_build_object(
      'template_name', 'work_order_created',
      'record_id', NEW.id::text,
      'record_type', 'work_order'
    ),
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Work order created email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_assignment_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body => jsonb_build_object(
      'template_name', 'work_order_assigned',
      'record_id', NEW.id::text,
      'record_type', 'work_order_assignment'
    ),
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Assignment email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_report_submitted_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body => jsonb_build_object(
      'template_name', 'report_submitted',
      'record_id', NEW.id::text,
      'record_type', 'work_order_report'
    ),
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Report submitted email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_report_reviewed_email()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM net.http_post(
      url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      body => jsonb_build_object(
        'template_name', 'report_reviewed',
        'record_id', NEW.id::text,
        'record_type', 'work_order_report'
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Report reviewed email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_completed_email()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM net.http_post(
      url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      body => jsonb_build_object(
        'template_name', 'work_order_completed',
        'record_id', NEW.id::text,
        'record_type', 'work_order'
      ),
      headers => jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Work order completed email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
