-- Fix the syntax error in trades policy
DROP POLICY IF EXISTS "trades_admin_manage" ON public.trades;

CREATE POLICY "trades_admin_manage_insert" ON public.trades
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "trades_admin_manage_update" ON public.trades
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "trades_admin_manage_delete" ON public.trades
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);