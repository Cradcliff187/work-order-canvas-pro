-- Add is_retroactive flag to employee_reports table
ALTER TABLE public.employee_reports 
ADD COLUMN is_retroactive boolean DEFAULT false NOT NULL;

-- Add index for retroactive entries for better query performance
CREATE INDEX idx_employee_reports_retroactive ON public.employee_reports(is_retroactive);

-- Add comment to document the field
COMMENT ON COLUMN public.employee_reports.is_retroactive IS 'Indicates if this time entry was added retroactively after the fact';