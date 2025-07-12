-- Add missing DELETE policies for email_logs and profiles
CREATE POLICY "Admins can delete email logs" 
ON public.email_logs 
FOR DELETE 
USING (auth_is_admin());

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (auth_is_admin());

-- Create secure function to clear test data with proper cascading
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  deleted_counts jsonb := '{}';
  test_user_ids uuid[];
  test_org_ids uuid[];
  test_work_order_ids uuid[];
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can clear test data';
  END IF;

  -- Get test user IDs (based on test email patterns)
  SELECT array_agg(id) INTO test_user_ids
  FROM public.profiles 
  WHERE email LIKE '%@testcompany%' 
     OR email LIKE '%@example.com' 
     OR email LIKE '%test%'
     OR first_name = 'Test';

  -- Get test organization IDs (based on test name patterns)
  SELECT array_agg(id) INTO test_org_ids
  FROM public.organizations 
  WHERE name IN (
    'ABC Property Management',
    'XYZ Commercial Properties', 
    'Premium Facilities Group',
    'Pipes & More Plumbing',
    'Sparks Electric',
    'Cool Air HVAC',
    'Wood Works Carpentry',
    'Brush Strokes Painting',
    'Fix-It Maintenance',
    'Green Thumb Landscaping'
  );

  -- Get test work order IDs
  SELECT array_agg(DISTINCT id) INTO test_work_order_ids
  FROM public.work_orders 
  WHERE created_by = ANY(test_user_ids)
     OR assigned_to = ANY(test_user_ids)
     OR organization_id = ANY(test_org_ids)
     OR assigned_organization_id = ANY(test_org_ids);

  -- Step 1: Delete email_logs that reference test data
  WITH deleted AS (
    DELETE FROM public.email_logs 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR recipient_email LIKE '%@testcompany%'
       OR recipient_email LIKE '%@example.com'
       OR recipient_email LIKE '%test%'
    RETURNING *
  )
  SELECT jsonb_build_object('email_logs', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 2: Delete work order attachments
  WITH deleted AS (
    DELETE FROM public.work_order_attachments 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR uploaded_by_user_id = ANY(test_user_ids)
       OR work_order_report_id IN (
         SELECT id FROM public.work_order_reports 
         WHERE work_order_id = ANY(test_work_order_ids)
            OR subcontractor_user_id = ANY(test_user_ids)
       )
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 3: Delete work order reports
  WITH deleted AS (
    DELETE FROM public.work_order_reports 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR subcontractor_user_id = ANY(test_user_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 4: Delete work order assignments
  WITH deleted AS (
    DELETE FROM public.work_order_assignments 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR assigned_to = ANY(test_user_ids)
       OR assigned_by = ANY(test_user_ids)
       OR assigned_organization_id = ANY(test_org_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_assignments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 5: Delete employee reports
  WITH deleted AS (
    DELETE FROM public.employee_reports 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR employee_user_id = ANY(test_user_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('employee_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 6: Delete receipts and receipt work orders
  WITH deleted AS (
    DELETE FROM public.receipt_work_orders 
    WHERE work_order_id = ANY(test_work_order_ids)
       OR receipt_id IN (SELECT id FROM public.receipts WHERE employee_user_id = ANY(test_user_ids))
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipt_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  WITH deleted AS (
    DELETE FROM public.receipts 
    WHERE employee_user_id = ANY(test_user_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipts', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 7: Delete work orders
  WITH deleted AS (
    DELETE FROM public.work_orders 
    WHERE id = ANY(test_work_order_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 8: Delete partner locations
  WITH deleted AS (
    DELETE FROM public.partner_locations 
    WHERE organization_id = ANY(test_org_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('partner_locations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 9: Delete user organization relationships
  WITH deleted AS (
    DELETE FROM public.user_organizations 
    WHERE user_id = ANY(test_user_ids)
       OR organization_id = ANY(test_org_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('user_organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 10: Delete organizations
  WITH deleted AS (
    DELETE FROM public.organizations 
    WHERE id = ANY(test_org_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Step 11: Delete profiles (this will cascade to auth.users)
  WITH deleted AS (
    DELETE FROM public.profiles 
    WHERE id = ANY(test_user_ids)
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('profiles', count(*)) INTO deleted_counts
  FROM deleted;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test data cleared successfully',
    'deleted_counts', deleted_counts,
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
$$;