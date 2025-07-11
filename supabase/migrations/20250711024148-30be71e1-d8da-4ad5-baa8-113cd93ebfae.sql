-- Add employee support to WorkOrderPro
-- This migration extends the user system to support internal employees with rate tracking

-- Add 'employee' to user_type enum
ALTER TYPE public.user_type ADD VALUE 'employee';

-- Add employee-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN hourly_cost_rate DECIMAL(10,2) NULL,
ADD COLUMN hourly_billable_rate DECIMAL(10,2) NULL,
ADD COLUMN is_employee BOOLEAN DEFAULT false NOT NULL;

-- Update existing admin users to be employees (general contractor staff)
UPDATE public.profiles 
SET is_employee = true 
WHERE user_type = 'admin';

-- Add indexes for performance on new columns
CREATE INDEX idx_profiles_is_employee ON public.profiles(is_employee);
CREATE INDEX idx_profiles_employee_rates ON public.profiles(hourly_cost_rate, hourly_billable_rate) WHERE is_employee = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hourly_cost_rate IS 'Internal cost rate for employee hours';
COMMENT ON COLUMN public.profiles.hourly_billable_rate IS 'Rate charged to clients for employee hours';
COMMENT ON COLUMN public.profiles.is_employee IS 'Flag to identify employees vs external users';