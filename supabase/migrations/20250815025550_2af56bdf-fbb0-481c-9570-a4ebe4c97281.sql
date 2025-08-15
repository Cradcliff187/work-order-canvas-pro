-- Add test estimate data to the current work order for demonstration
INSERT INTO public.work_order_estimates (
  work_order_id,
  estimate_type,
  amount,
  description,
  markup_percentage,
  internal_notes,
  status,
  created_by_user_id,
  created_at
) VALUES (
  'bfebafa1-9478-40e8-a520-8d5d3d31ea03',
  'internal',
  850.00,
  'Complete HVAC system inspection and repair. Includes cleaning filters, checking refrigerant levels, and replacing worn components.',
  15.0,
  'Standard markup applied. Customer has been responsive to previous service calls.',
  'pending_approval',
  (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1),
  now()
);