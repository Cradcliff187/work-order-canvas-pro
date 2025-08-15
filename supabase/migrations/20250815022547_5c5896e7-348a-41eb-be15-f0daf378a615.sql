-- Add estimate tracking columns to work_orders table
-- This migration adds support for three-party estimate workflow: subcontractor → internal team → partner

-- Add subcontractor estimate fields
ALTER TABLE work_orders ADD COLUMN subcontractor_estimate_amount DECIMAL(10,2);
ALTER TABLE work_orders ADD COLUMN subcontractor_estimate_description TEXT;
ALTER TABLE work_orders ADD COLUMN subcontractor_estimate_submitted_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN subcontractor_estimate_submitted_by UUID REFERENCES profiles(id);

-- Add internal team estimate fields  
ALTER TABLE work_orders ADD COLUMN internal_estimate_amount DECIMAL(10,2);
ALTER TABLE work_orders ADD COLUMN internal_estimate_description TEXT;
ALTER TABLE work_orders ADD COLUMN internal_estimate_notes TEXT;
ALTER TABLE work_orders ADD COLUMN internal_markup_percentage DECIMAL(5,2) DEFAULT 20.00;
ALTER TABLE work_orders ADD COLUMN internal_estimate_created_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN internal_estimate_created_by UUID REFERENCES profiles(id);

-- Add partner approval fields
ALTER TABLE work_orders ADD COLUMN partner_estimate_approved BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN partner_estimate_approved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN partner_estimate_rejection_notes TEXT;

-- Add performance indexes on timestamp fields
CREATE INDEX idx_work_orders_subcontractor_estimate_submitted_at ON work_orders(subcontractor_estimate_submitted_at);
CREATE INDEX idx_work_orders_internal_estimate_created_at ON work_orders(internal_estimate_created_at);
CREATE INDEX idx_work_orders_partner_estimate_approved_at ON work_orders(partner_estimate_approved_at);

-- Verification query (run after migration)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'work_orders' AND column_name LIKE '%estimate%'
-- ORDER BY ordinal_position;

-- Rollback commands (if needed):
-- DROP INDEX IF EXISTS idx_work_orders_partner_estimate_approved_at;
-- DROP INDEX IF EXISTS idx_work_orders_internal_estimate_created_at;
-- DROP INDEX IF EXISTS idx_work_orders_subcontractor_estimate_submitted_at;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS partner_estimate_rejection_notes;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS partner_estimate_approved_at;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS partner_estimate_approved;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_estimate_created_by;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_estimate_created_at;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_markup_percentage;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_estimate_notes;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_estimate_description;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS internal_estimate_amount;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS subcontractor_estimate_submitted_by;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS subcontractor_estimate_submitted_at;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS subcontractor_estimate_description;
-- ALTER TABLE work_orders DROP COLUMN IF EXISTS subcontractor_estimate_amount;