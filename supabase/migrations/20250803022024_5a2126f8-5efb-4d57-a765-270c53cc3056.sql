-- Add crew_member_name field to work_order_messages table
-- This allows subcontractors to identify which crew member is posting updates

ALTER TABLE work_order_messages 
ADD COLUMN crew_member_name VARCHAR(100) NULL;

COMMENT ON COLUMN work_order_messages.crew_member_name IS 'Optional field for subcontractors to identify which crew member posted the message';