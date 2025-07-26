-- Work order messaging tables
CREATE TABLE work_order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Read receipts for tracking
CREATE TABLE message_read_receipts (
  message_id UUID REFERENCES work_order_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Performance indexes
CREATE INDEX idx_work_order_messages_work_order ON work_order_messages(work_order_id);
CREATE INDEX idx_work_order_messages_created ON work_order_messages(created_at DESC);
CREATE INDEX idx_work_order_messages_sender ON work_order_messages(sender_id);

-- Enable RLS
ALTER TABLE work_order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- CORRECTED RLS Policies using existing auth functions

-- Admins see all messages (matches existing pattern)
CREATE POLICY "admins_can_select_messages" ON work_order_messages
FOR SELECT USING (jwt_is_admin());

CREATE POLICY "admins_can_insert_messages" ON work_order_messages
FOR INSERT WITH CHECK (jwt_is_admin());

-- Employees see all messages (matches existing pattern)
CREATE POLICY "employees_can_select_messages" ON work_order_messages
FOR SELECT USING (jwt_user_type() = 'employee');

CREATE POLICY "employees_can_insert_messages" ON work_order_messages
FOR INSERT WITH CHECK (jwt_user_type() = 'employee');

-- Partners see ONLY PUBLIC messages for their organization's work orders
CREATE POLICY "partners_see_public_messages" ON work_order_messages
FOR SELECT USING (
  jwt_user_type() = 'partner' 
  AND is_internal = false  -- PUBLIC messages only
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_id 
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- Partners can post ONLY PUBLIC messages to their work orders
CREATE POLICY "partners_insert_public_messages" ON work_order_messages
FOR INSERT WITH CHECK (
  jwt_user_type() = 'partner'
  AND is_internal = false  -- Can only create public messages
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_id 
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- Subcontractors see ONLY INTERNAL messages for assigned work orders
CREATE POLICY "subcontractors_see_internal_messages" ON work_order_messages
FOR SELECT USING (
  jwt_user_type() = 'subcontractor'
  AND is_internal = true  -- INTERNAL messages only
  AND work_order_id IN (
    SELECT work_order_id 
    FROM auth_user_organization_assignments()
  )
);

-- Subcontractors can post ONLY INTERNAL messages to assigned work orders
CREATE POLICY "subcontractors_insert_internal_messages" ON work_order_messages
FOR INSERT WITH CHECK (
  jwt_user_type() = 'subcontractor'
  AND is_internal = true  -- Can only create internal messages
  AND work_order_id IN (
    SELECT work_order_id 
    FROM auth_user_organization_assignments()
  )
);

-- Read receipts policies
CREATE POLICY "users_manage_own_receipts" ON message_read_receipts
FOR ALL USING (user_id = jwt_profile_id());

-- Add update trigger for updated_at
CREATE TRIGGER update_work_order_messages_updated_at
BEFORE UPDATE ON work_order_messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE work_order_messages IS 'Messaging system for work order communication with strict visibility control';
COMMENT ON COLUMN work_order_messages.is_internal IS 'FALSE = visible to partners + internal team, TRUE = visible to internal team + assigned subcontractors only';