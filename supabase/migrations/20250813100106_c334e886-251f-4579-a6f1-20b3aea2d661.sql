-- Fix replica identity for work_order_messages table to improve real-time reliability
ALTER TABLE work_order_messages REPLICA IDENTITY DEFAULT;