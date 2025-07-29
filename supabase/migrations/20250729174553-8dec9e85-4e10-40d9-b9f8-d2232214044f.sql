-- Fix assignment system by syncing work_orders.assigned_organization_id with work_order_assignments
UPDATE work_orders 
SET assigned_organization_id = (
  SELECT woa.assigned_organization_id 
  FROM work_order_assignments woa 
  WHERE woa.work_order_id = work_orders.id 
  LIMIT 1
)
WHERE id IN (
  SELECT DISTINCT work_order_id 
  FROM work_order_assignments 
  WHERE assigned_organization_id IS NOT NULL
);

-- Assign actual users to work order assignments where assigned_to is null
UPDATE work_order_assignments 
SET assigned_to = (
  SELECT p.id 
  FROM profiles p 
  JOIN user_organizations uo ON p.id = uo.user_id 
  WHERE uo.organization_id = work_order_assignments.assigned_organization_id 
  AND p.user_type = 'subcontractor'
  LIMIT 1
)
WHERE assigned_to IS NULL AND assigned_organization_id IS NOT NULL;

-- Create function to auto-update work order assigned_organization_id when assignments change
CREATE OR REPLACE FUNCTION sync_work_order_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT or UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE work_orders 
    SET assigned_organization_id = NEW.assigned_organization_id
    WHERE id = NEW.work_order_id;
    RETURN NEW;
  END IF;
  
  -- For DELETE
  IF TG_OP = 'DELETE' THEN
    -- Check if there are any remaining assignments
    IF NOT EXISTS (
      SELECT 1 FROM work_order_assignments 
      WHERE work_order_id = OLD.work_order_id 
      AND id != OLD.id
    ) THEN
      UPDATE work_orders 
      SET assigned_organization_id = NULL
      WHERE id = OLD.work_order_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;