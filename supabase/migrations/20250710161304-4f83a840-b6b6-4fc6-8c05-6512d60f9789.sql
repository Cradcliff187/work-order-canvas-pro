-- RLS Policies for WorkOrderPro
-- Comprehensive Row Level Security for all tables based on user types

-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions (Security Definer to avoid recursive RLS issues)

-- Get current user's type
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS public.user_type AS $$
  SELECT user_type FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get organizations current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(organization_id UUID) AS $$
  SELECT uo.organization_id 
  FROM public.user_organizations uo
  JOIN public.profiles p ON p.id = uo.user_id
  WHERE p.user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user can access a work order
CREATE OR REPLACE FUNCTION public.can_access_work_order(work_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_type_val public.user_type;
  user_profile_id UUID;
BEGIN
  SELECT user_type, id INTO user_type_val, user_profile_id 
  FROM public.profiles WHERE user_id = auth.uid();
  
  -- Admin can access all
  IF user_type_val = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Partner can access work orders in their organizations
  IF user_type_val = 'partner' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = work_order_id
      AND wo.organization_id IN (SELECT organization_id FROM public.get_user_organizations())
    );
  END IF;
  
  -- Subcontractor can access assigned work orders
  IF user_type_val = 'subcontractor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = work_order_id
      AND wo.assigned_to = user_profile_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ORGANIZATIONS TABLE POLICIES

CREATE POLICY "Admins can manage all organizations"
ON public.organizations FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'partner' 
  AND id IN (SELECT organization_id FROM public.get_user_organizations())
);

CREATE POLICY "Subcontractors can view organizations they work for"
ON public.organizations FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND id IN (
    SELECT DISTINCT wo.organization_id 
    FROM public.work_orders wo 
    JOIN public.profiles p ON p.id = wo.assigned_to 
    WHERE p.user_id = auth.uid()
  )
);

-- USER_ORGANIZATIONS TABLE POLICIES

CREATE POLICY "Admins can manage all user organizations"
ON public.user_organizations FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Users can view their own organization relationships"
ON public.user_organizations FOR SELECT
TO authenticated
USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- PROFILES TABLE POLICIES (Update existing policies)

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can view profiles in their organizations"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND (
    id IN (
      SELECT uo.user_id FROM public.user_organizations uo
      WHERE uo.organization_id IN (SELECT organization_id FROM public.get_user_organizations())
    )
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Subcontractors can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.get_current_user_type() = 'subcontractor');

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- PROJECTS TABLE POLICIES

DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;

CREATE POLICY "Admins can manage all projects"
ON public.projects FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can manage projects in their organizations"
ON public.projects FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.project_id = id
    AND wo.organization_id IN (SELECT organization_id FROM public.get_user_organizations())
  )
)
WITH CHECK (
  public.get_current_user_type() = 'partner'
);

CREATE POLICY "Subcontractors can view assigned projects"
ON public.projects FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo
    JOIN public.profiles p ON p.id = wo.assigned_to
    WHERE wo.project_id = id AND p.user_id = auth.uid()
  )
);

-- TRADES TABLE POLICIES

CREATE POLICY "Admins can manage all trades"
ON public.trades FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners and subcontractors can view trades"
ON public.trades FOR SELECT
TO authenticated
USING (public.get_current_user_type() IN ('partner', 'subcontractor'));

-- WORK_ORDERS TABLE POLICIES

DROP POLICY IF EXISTS "Users can view all work orders" ON public.work_orders;

CREATE POLICY "Admins can manage all work orders"
ON public.work_orders FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can manage work orders in their organizations"
ON public.work_orders FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND organization_id IN (SELECT organization_id FROM public.get_user_organizations())
)
WITH CHECK (
  public.get_current_user_type() = 'partner'
  AND organization_id IN (SELECT organization_id FROM public.get_user_organizations())
);

CREATE POLICY "Subcontractors can view assigned work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- WORK_ORDER_REPORTS TABLE POLICIES

CREATE POLICY "Admins can manage all work order reports"
ON public.work_order_reports FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can view reports for their organization work orders"
ON public.work_order_reports FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND work_order_id IN (
    SELECT id FROM public.work_orders 
    WHERE organization_id IN (SELECT organization_id FROM public.get_user_organizations())
  )
);

CREATE POLICY "Subcontractors can manage their own reports"
ON public.work_order_reports FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND subcontractor_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  public.get_current_user_type() = 'subcontractor'
  AND subcontractor_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- WORK_ORDER_ATTACHMENTS TABLE POLICIES

CREATE POLICY "Admins can manage all work order attachments"
ON public.work_order_attachments FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can view attachments for their organization work orders"
ON public.work_order_attachments FOR SELECT
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND (
    work_order_id IN (
      SELECT id FROM public.work_orders 
      WHERE organization_id IN (SELECT organization_id FROM public.get_user_organizations())
    )
    OR work_order_report_id IN (
      SELECT wor.id FROM public.work_order_reports wor
      JOIN public.work_orders wo ON wo.id = wor.work_order_id
      WHERE wo.organization_id IN (SELECT organization_id FROM public.get_user_organizations())
    )
  )
);

CREATE POLICY "Subcontractors can manage attachments for their work"
ON public.work_order_attachments FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND (
    uploaded_by_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR work_order_id IN (
      SELECT wo.id FROM public.work_orders wo
      JOIN public.profiles p ON p.id = wo.assigned_to
      WHERE p.user_id = auth.uid()
    )
    OR work_order_report_id IN (
      SELECT id FROM public.work_order_reports
      WHERE subcontractor_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
)
WITH CHECK (
  public.get_current_user_type() = 'subcontractor'
  AND uploaded_by_user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- WORK_ORDER_COMMENTS TABLE POLICIES

DROP POLICY IF EXISTS "Users can view all comments" ON public.work_order_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.work_order_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.work_order_comments;

CREATE POLICY "Admins can manage all work order comments"
ON public.work_order_comments FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

CREATE POLICY "Partners can manage comments on their organization work orders"
ON public.work_order_comments FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'partner'
  AND work_order_id IN (
    SELECT id FROM public.work_orders 
    WHERE organization_id IN (SELECT organization_id FROM public.get_user_organizations())
  )
)
WITH CHECK (
  public.get_current_user_type() = 'partner'
  AND work_order_id IN (
    SELECT id FROM public.work_orders 
    WHERE organization_id IN (SELECT organization_id FROM public.get_user_organizations())
  )
  AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Subcontractors can manage comments on assigned work orders"
ON public.work_order_comments FOR ALL
TO authenticated
USING (
  public.get_current_user_type() = 'subcontractor'
  AND work_order_id IN (
    SELECT wo.id FROM public.work_orders wo
    JOIN public.profiles p ON p.id = wo.assigned_to
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  public.get_current_user_type() = 'subcontractor'
  AND work_order_id IN (
    SELECT wo.id FROM public.work_orders wo
    JOIN public.profiles p ON p.id = wo.assigned_to
    WHERE p.user_id = auth.uid()
  )
  AND author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- EMAIL_TEMPLATES TABLE POLICIES

CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

-- EMAIL_LOGS TABLE POLICIES

CREATE POLICY "Admins can view email logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (public.get_current_user_type() = 'admin');

-- EMAIL_SETTINGS TABLE POLICIES

CREATE POLICY "Admins can manage email settings"
ON public.email_settings FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

-- SYSTEM_SETTINGS TABLE POLICIES

CREATE POLICY "Admins can manage system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (public.get_current_user_type() = 'admin')
WITH CHECK (public.get_current_user_type() = 'admin');

-- AUDIT_LOGS TABLE POLICIES

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.get_current_user_type() = 'admin');