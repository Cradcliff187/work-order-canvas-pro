-- Fix legacy Big Boy bills - Robust approach with SECURITY DEFINER
-- Create a security definer function to handle the update with elevated privileges

CREATE OR REPLACE FUNCTION fix_legacy_big_boy_bills()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  bill_record RECORD;
  result jsonb;
BEGIN
  -- Log the operation start
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'subcontractor_bills',
    gen_random_uuid(),
    'fix_legacy_bills_start',
    jsonb_build_object(
      'operation', 'fix_legacy_big_boy_bills',
      'target_bills', ARRAY[
        'INV-2025-00001', 'INV-2025-00002', 'INV-2025-00003', 'INV-2025-00004', 'INV-2025-00005',
        'INV-2025-00006', 'INV-2025-00007', 'INV-2025-00008', 'INV-2025-00012', 'INV-2025-00013'
      ]
    ),
    auth_profile_id_safe()
  );

  -- Update the bills and count affected rows
  UPDATE subcontractor_bills 
  SET 
    partner_billing_status = 'ready',
    updated_at = now()
  WHERE internal_bill_number IN (
    'INV-2025-00001', 'INV-2025-00002', 'INV-2025-00003', 'INV-2025-00004', 'INV-2025-00005',
    'INV-2025-00006', 'INV-2025-00007', 'INV-2025-00008', 'INV-2025-00012', 'INV-2025-00013'
  )
  AND partner_billing_status = 'billed';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log each updated bill for audit trail
  FOR bill_record IN 
    SELECT id, internal_bill_number, external_bill_number, total_amount
    FROM subcontractor_bills 
    WHERE internal_bill_number IN (
      'INV-2025-00001', 'INV-2025-00002', 'INV-2025-00003', 'INV-2025-00004', 'INV-2025-00005',
      'INV-2025-00006', 'INV-2025-00007', 'INV-2025-00008', 'INV-2025-00012', 'INV-2025-00013'
    )
    AND partner_billing_status = 'ready'
  LOOP
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      user_id
    ) VALUES (
      'subcontractor_bills',
      bill_record.id,
      'partner_billing_status_fixed',
      jsonb_build_object(
        'internal_bill_number', bill_record.internal_bill_number,
        'external_bill_number', bill_record.external_bill_number,
        'total_amount', bill_record.total_amount,
        'new_status', 'ready',
        'operation', 'fix_legacy_big_boy_bills'
      ),
      auth_profile_id_safe()
    );
  END LOOP;
  
  -- Build result summary
  result := jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'operation', 'fix_legacy_big_boy_bills',
    'timestamp', now(),
    'message', 
      CASE 
        WHEN updated_count = 10 THEN 'All 10 Big Boy bills successfully updated to ready status'
        WHEN updated_count > 0 THEN format('%s Big Boy bills updated to ready status', updated_count)
        ELSE 'No bills were updated (may already be in ready status)'
      END
  );
  
  -- Log the final result
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'subcontractor_bills',
    gen_random_uuid(),
    'fix_legacy_bills_complete',
    result,
    auth_profile_id_safe()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'subcontractor_bills',
    gen_random_uuid(),
    'fix_legacy_bills_error',
    jsonb_build_object(
      'error', SQLERRM,
      'operation', 'fix_legacy_big_boy_bills'
    ),
    auth_profile_id_safe()
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'operation', 'fix_legacy_big_boy_bills'
  );
END;
$$;

-- Execute the function to fix the bills
SELECT fix_legacy_big_boy_bills();

-- Verification query to confirm the fix
DO $$
DECLARE
  verification_result jsonb;
  ready_count integer;
  billed_count integer;
BEGIN
  -- Count bills in each status
  SELECT COUNT(*) INTO ready_count
  FROM subcontractor_bills 
  WHERE internal_bill_number IN (
    'INV-2025-00001', 'INV-2025-00002', 'INV-2025-00003', 'INV-2025-00004', 'INV-2025-00005',
    'INV-2025-00006', 'INV-2025-00007', 'INV-2025-00008', 'INV-2025-00012', 'INV-2025-00013'
  )
  AND partner_billing_status = 'ready';
  
  SELECT COUNT(*) INTO billed_count
  FROM subcontractor_bills 
  WHERE internal_bill_number IN (
    'INV-2025-00001', 'INV-2025-00002', 'INV-2025-00003', 'INV-2025-00004', 'INV-2025-00005',
    'INV-2025-00006', 'INV-2025-00007', 'INV-2025-00008', 'INV-2025-00012', 'INV-2025-00013'
  )
  AND partner_billing_status = 'billed';
  
  -- Log verification results
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'subcontractor_bills',
    gen_random_uuid(),
    'fix_legacy_bills_verification',
    jsonb_build_object(
      'bills_ready_count', ready_count,
      'bills_billed_count', billed_count,
      'expected_ready', 10,
      'verification_passed', (ready_count = 10 AND billed_count = 0)
    ),
    auth_profile_id_safe()
  );
  
  RAISE NOTICE 'Verification: % bills now ready, % bills still billed', ready_count, billed_count;
END;
$$;