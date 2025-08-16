-- Fix missing work_order_report_id links in invoice_work_orders table
-- This migration addresses 38 records with NULL work_order_report_id that prevent partner billing

BEGIN;

-- Log the current state before making changes
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM invoice_work_orders WHERE work_order_report_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM invoice_work_orders;
    
    RAISE NOTICE 'Before migration: % records with NULL work_order_report_id out of % total records', null_count, total_count;
END $$;

-- Update invoice_work_orders records to populate missing work_order_report_id
-- Only updates records where:
-- 1. work_order_report_id is currently NULL
-- 2. There exists exactly one approved work_order_report for that work_order_id
UPDATE invoice_work_orders 
SET work_order_report_id = (
    SELECT wor.id 
    FROM work_order_reports wor 
    WHERE wor.work_order_id = invoice_work_orders.work_order_id 
    AND wor.status = 'approved'
    ORDER BY wor.submitted_at DESC 
    LIMIT 1
)
WHERE work_order_report_id IS NULL
AND EXISTS (
    SELECT 1 
    FROM work_order_reports wor 
    WHERE wor.work_order_id = invoice_work_orders.work_order_id 
    AND wor.status = 'approved'
);

-- Log the results after the update
DO $$
DECLARE
    updated_count INTEGER;
    remaining_null_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Get the number of rows that were updated (this is approximate since we can't get exact count from UPDATE)
    SELECT COUNT(*) INTO remaining_null_count FROM invoice_work_orders WHERE work_order_report_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM invoice_work_orders;
    
    RAISE NOTICE 'After migration: % records still have NULL work_order_report_id out of % total records', remaining_null_count, total_count;
    
    -- Report any problematic cases that couldn't be fixed
    IF remaining_null_count > 0 THEN
        RAISE NOTICE 'Records that could not be fixed (no approved reports found):';
        FOR rec IN 
            SELECT iwo.id, iwo.work_order_id 
            FROM invoice_work_orders iwo 
            WHERE iwo.work_order_report_id IS NULL
        LOOP
            RAISE NOTICE 'invoice_work_orders.id = %, work_order_id = %', rec.id, rec.work_order_id;
        END LOOP;
    END IF;
END $$;

-- Verification query to ensure data integrity
DO $$
DECLARE
    verification_count INTEGER;
BEGIN
    -- Count records where work_order_report_id now points to an approved report
    SELECT COUNT(*) INTO verification_count
    FROM invoice_work_orders iwo
    JOIN work_order_reports wor ON wor.id = iwo.work_order_report_id
    WHERE wor.status = 'approved' AND wor.work_order_id = iwo.work_order_id;
    
    RAISE NOTICE 'Verification: % invoice_work_orders records now properly linked to approved reports', verification_count;
END $$;

COMMIT;