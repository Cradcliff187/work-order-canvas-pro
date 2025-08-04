-- Enable real-time for work_orders table
ALTER TABLE public.work_orders REPLICA IDENTITY FULL;

-- Add work_orders to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;