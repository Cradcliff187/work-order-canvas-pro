-- Add new values to project_status enum
ALTER TYPE project_status ADD VALUE 'approved' AFTER 'quoted';
ALTER TYPE project_status ADD VALUE 'on_hold' AFTER 'in_progress';