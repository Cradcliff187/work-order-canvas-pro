-- Add approval status to employee_reports
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
    END IF;
END $$;

-- Add approval_status column if it doesn't exist
ALTER TABLE employee_reports 
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create time_entry_audits table for audit logging
CREATE TABLE IF NOT EXISTS time_entry_audits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    time_entry_id uuid NOT NULL REFERENCES employee_reports(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'flagged'
    old_values jsonb,
    new_values jsonb,
    changed_by uuid REFERENCES profiles(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- Create receipt_time_entries junction table for materials cost calculation
CREATE TABLE IF NOT EXISTS receipt_time_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    time_entry_id uuid NOT NULL REFERENCES employee_reports(id) ON DELETE CASCADE,
    allocated_amount numeric(10,2) NOT NULL,
    allocation_percentage numeric(5,2),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES profiles(id),
    UNIQUE(receipt_id, time_entry_id)
);

-- Enable RLS on new tables
ALTER TABLE time_entry_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entry_audits
CREATE POLICY "admins_can_view_time_entry_audits" ON time_entry_audits
    FOR SELECT USING (jwt_is_admin());

CREATE POLICY "system_can_insert_time_entry_audits" ON time_entry_audits
    FOR INSERT WITH CHECK (true);

-- RLS policies for receipt_time_entries
CREATE POLICY "admins_can_manage_receipt_time_entries" ON receipt_time_entries
    FOR ALL USING (jwt_is_admin());

CREATE POLICY "employees_can_view_own_receipt_allocations" ON receipt_time_entries
    FOR SELECT USING (
        time_entry_id IN (
            SELECT id FROM employee_reports 
            WHERE employee_user_id = auth_profile_id_safe()
        )
    );

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_time_entry_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log actual changes
    IF TG_OP = 'UPDATE' THEN
        -- Skip if no meaningful changes (just updated_at timestamp)
        IF OLD.* IS NOT DISTINCT FROM NEW.* THEN
            RETURN NEW;
        END IF;
        
        INSERT INTO time_entry_audits (
            time_entry_id,
            action,
            old_values,
            new_values,
            changed_by
        ) VALUES (
            NEW.id,
            CASE 
                WHEN OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
                    CASE NEW.approval_status
                        WHEN 'approved' THEN 'approved'
                        WHEN 'rejected' THEN 'rejected'
                        WHEN 'flagged' THEN 'flagged'
                        ELSE 'updated'
                    END
                ELSE 'updated'
            END,
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth_profile_id_safe()
        );
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO time_entry_audits (
            time_entry_id,
            action,
            new_values,
            changed_by
        ) VALUES (
            NEW.id,
            'created',
            to_jsonb(NEW),
            auth_profile_id_safe()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS employee_reports_audit_trigger ON employee_reports;
CREATE TRIGGER employee_reports_audit_trigger
    AFTER INSERT OR UPDATE ON employee_reports
    FOR EACH ROW
    EXECUTE FUNCTION audit_time_entry_changes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_audits_time_entry_id ON time_entry_audits(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_audits_created_at ON time_entry_audits(created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_time_entries_time_entry_id ON receipt_time_entries(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_receipt_time_entries_receipt_id ON receipt_time_entries(receipt_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_approval_status ON employee_reports(approval_status);