
-- 1) Ensure realtime works for DM messages and unread counters
ALTER TABLE public.work_order_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_read_receipts REPLICA IDENTITY FULL;

-- Add tables to the realtime publication (idempotent if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- 2) Add explicit internal employee RLS for work order messages (non-conversation)
-- Allow internal employees (admin/manager/employee) to read work-order-thread messages
CREATE POLICY internal_employees_select_work_order_messages
ON public.work_order_messages
FOR SELECT
USING (
  work_order_id IS NOT NULL
  AND has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
);

-- Allow internal employees to insert work-order-thread messages
CREATE POLICY internal_employees_insert_work_order_messages
ON public.work_order_messages
FOR INSERT
WITH CHECK (
  work_order_id IS NOT NULL
  AND has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
  AND sender_id = public.auth_profile_id_safe()
);
