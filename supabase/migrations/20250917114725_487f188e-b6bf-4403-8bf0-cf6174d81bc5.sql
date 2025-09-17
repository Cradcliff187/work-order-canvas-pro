-- Create project_status enum type with all necessary values
CREATE TYPE project_status AS ENUM (
  'draft',
  'quoted', 
  'approved',
  'active',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled'
);