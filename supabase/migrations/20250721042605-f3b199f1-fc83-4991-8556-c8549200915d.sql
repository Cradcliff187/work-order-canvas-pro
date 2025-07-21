
-- Documentation Migration: Work Order Numbering System - Current Working State
-- This migration documents the current working state of the work order numbering system
-- Created: 2025-01-21
-- Purpose: Record tested and verified work order numbering configuration

-- =============================================================================
-- CURRENT WORKING STATE DOCUMENTATION
-- =============================================================================

-- This migration serves as documentation for the current working state of the
-- work order numbering system as of 2025-01-21. All functionality has been
-- tested and verified to work correctly.

-- =============================================================================
-- BUSINESS LOGIC SUMMARY
-- =============================================================================

-- Work order numbers follow the format: {ORG_INITIALS}-{LOCATION_CODE}-WO
-- 
-- Two modes of operation:
-- 1. Manual Location Mode (uses_partner_location_numbers = true):
--    - Uses exact location numbers provided by partners
--    - Format: ABC-BLDG-A-WO, XYZ-STORE-504-WO
--    - Increments next_sequence_number (not used in current format)
--
-- 2. Auto-Generated Location Mode (uses_partner_location_numbers = false):
--    - Auto-generates 3-digit padded location codes
--    - Format: ABC-001-WO, ABC-002-WO, ABC-003-WO
--    - Increments next_location_sequence for location codes

-- =============================================================================
-- CURRENT ORGANIZATION SETTINGS (Verified Working)
-- =============================================================================

-- Partner Organizations (uses_partner_location_numbers varies by business need):
-- - ABC Property Management: ABC, uses_partner_location_numbers = false (auto-gen)
-- - XYZ Commercial Properties: XYZ, uses_partner_location_numbers = true (manual)
-- - Premium Facilities Group: PFG, uses_partner_location_numbers = false (auto-gen)
-- - Test Property Management: TPM, uses_partner_location_numbers = true (manual)

-- Internal Organizations (always uses_partner_location_numbers = false):
-- - WorkOrderPro Internal: WOP, uses_partner_location_numbers = false
-- - Internal Test Organization: ITO, uses_partner_location_numbers = false

-- Subcontractor Organizations (always uses_partner_location_numbers = false):
-- - Pipes & More Plumbing: PMP, uses_partner_location_numbers = false
-- - Sparks Electric: SPE, uses_partner_location_numbers = false
-- - Cool Air HVAC: CAH, uses_partner_location_numbers = false
-- - Wood Works Carpentry: WWC, uses_partner_location_numbers = false
-- - Brush Strokes Painting: BSP, uses_partner_location_numbers = false
-- - Fix-It Maintenance: FIM, uses_partner_location_numbers = false
-- - Green Thumb Landscaping: GTL, uses_partner_location_numbers = false

-- =============================================================================
-- CURRENT FUNCTION STATE (Verified Working)
-- =============================================================================

-- The generate_work_order_number_v2 function is working correctly with:
-- ✅ Proper business logic for both manual and auto-generated modes
-- ✅ No truncation issues (uses exact location codes as provided)
-- ✅ Comprehensive error handling and fallback mechanisms
-- ✅ Returns JSONB with detailed metadata
-- ✅ Proper sequence counter management
-- ✅ RLS-compatible security model

-- =============================================================================
-- TESTING VERIFICATION
-- =============================================================================

-- Test cases that have been verified to work:
-- 1. XYZ with manual location "BLDG-A" → "XYZ-BLDG-A-WO"
-- 2. ABC with no location (auto-gen) → "ABC-001-WO", "ABC-002-WO", etc.
-- 3. Organizations without initials → Fallback number + warning
-- 4. Error conditions → Proper fallback handling

-- =============================================================================
-- SEQUENCE COUNTER STATUS
-- =============================================================================

-- Current sequence counters are properly maintained:
-- - Organizations with uses_partner_location_numbers = true use next_sequence_number
-- - Organizations with uses_partner_location_numbers = false use next_location_sequence
-- - All counters start at 1 and increment properly

-- =============================================================================
-- SYSTEM HEALTH CHECK
-- =============================================================================

-- Verify all organizations have initials (should return 0 rows)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE is_active = true AND (initials IS NULL OR initials = '')
  ) THEN
    RAISE WARNING 'Some active organizations are missing initials - this will cause fallback numbering';
  ELSE
    RAISE NOTICE 'All active organizations have initials - system healthy';
  END IF;
END $$;

-- Verify proper organization type settings
DO $$
BEGIN
  -- Check internal orgs don't use partner location numbers
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE organization_type = 'internal' AND uses_partner_location_numbers = true
  ) THEN
    RAISE WARNING 'Internal organizations should not use partner location numbers';
  END IF;
  
  -- Check subcontractor orgs don't use partner location numbers
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE organization_type = 'subcontractor' AND uses_partner_location_numbers = true
  ) THEN
    RAISE WARNING 'Subcontractor organizations should not use partner location numbers';
  END IF;
  
  RAISE NOTICE 'Organization type settings verification complete';
END $$;

-- =============================================================================
-- MIGRATION COMPLETION
-- =============================================================================

-- This documentation migration records the current working state as of 2025-01-21
-- No functional changes are made - this is purely documentation
-- All work order numbering functionality is working correctly
-- System is ready for production use

COMMENT ON FUNCTION generate_work_order_number_v2(uuid, text) IS 
'Work order numbering function - Current working state documented 2025-01-21. 
Handles both manual location numbers and auto-generated location codes. 
Returns JSONB with work_order_number and metadata.';

-- Mark this migration as documentation only
SELECT 'Work order numbering system documentation migration completed successfully' as status;
