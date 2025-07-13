-- Update clear_test_data function to be more aggressive while preserving real data
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb := '{}';
  deleted_counts jsonb := '{}';
  test_user_ids uuid[];
  test_org_ids uuid[];
  test_work_order_ids uuid[];
  real_admin_id uuid;
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can clear test data';
  END IF;

  -- Get the real admin profile ID (cradcliff@austinkunzconstruction.com)
  SELECT id INTO real_admin_id
  FROM public.profiles 
  WHERE email = 'cradcliff@austinkunzconstruction.com';

  -- Get ALL user IDs except the real admin
  SELECT array_agg(id) INTO test_user_ids
  FROM public.profiles 
  WHERE id != COALESCE(real_admin_id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Get ALL organization IDs (all are test data)
  SELECT array_agg(id) INTO test_org_ids
  FROM public.organizations;

  -- Get ALL work order IDs (all are test data)
  SELECT array_agg(id) INTO test_work_order_ids
  FROM public.work_orders;

  -- Delete email_logs
  WITH deleted AS (
    DELETE FROM public.email_logs 
    RETURNING *
  )
  SELECT jsonb_build_object('email_logs', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order attachments
  WITH deleted AS (
    DELETE FROM public.work_order_attachments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order reports
  WITH deleted AS (
    DELETE FROM public.work_order_reports 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order assignments
  WITH deleted AS (
    DELETE FROM public.work_order_assignments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_assignments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete employee reports
  WITH deleted AS (
    DELETE FROM public.employee_reports 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('employee_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice work orders
  WITH deleted AS (
    DELETE FROM public.invoice_work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice attachments
  WITH deleted AS (
    DELETE FROM public.invoice_attachments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipt work orders
  WITH deleted AS (
    DELETE FROM public.receipt_work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipt_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipts
  WITH deleted AS (
    DELETE FROM public.receipts 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipts', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoices
  WITH deleted AS (
    DELETE FROM public.invoices 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoices', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work orders
  WITH deleted AS (
    DELETE FROM public.work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete partner locations
  WITH deleted AS (
    DELETE FROM public.partner_locations 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('partner_locations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete user organization relationships (except real admin)
  WITH deleted AS (
    DELETE FROM public.user_organizations 
    WHERE user_id != COALESCE(real_admin_id, '00000000-0000-0000-0000-000000000000'::uuid)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('user_organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete organizations
  WITH deleted AS (
    DELETE FROM public.organizations 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test email templates (keep non-test ones)
  WITH deleted AS (
    DELETE FROM public.email_templates 
    WHERE template_name IN (
      'work_order_created',
      'work_order_assigned', 
      'work_order_completed',
      'report_submitted',
      'report_reviewed'
    )
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('email_templates', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test trades (keep real ones)
  WITH deleted AS (
    DELETE FROM public.trades 
    WHERE name IN (
      'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 
      'Painting', 'General Maintenance', 'Landscaping',
      'Roofing', 'Flooring', 'Security Systems'
    )
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('trades', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test profiles (keep real admin)
  WITH deleted AS (
    DELETE FROM public.profiles 
    WHERE id != COALESCE(real_admin_id, '00000000-0000-0000-0000-000000000000'::uuid)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('profiles', count(*)) INTO deleted_counts
  FROM deleted;

  -- Reset organization sequence numbers for any remaining orgs
  UPDATE organizations SET next_sequence_number = 1;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test data cleared successfully, preserved real admin and data',
    'deleted_counts', deleted_counts,
    'preserved_admin', COALESCE(real_admin_id::text, 'not found'),
    'test_user_count', array_length(test_user_ids, 1),
    'test_org_count', array_length(test_org_ids, 1),
    'test_work_order_count', array_length(test_work_order_ids, 1)
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to clear test data'
  );
END;
$function$;