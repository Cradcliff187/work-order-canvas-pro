-- Phase 3: Advanced User Experience - Full-text Search & Filter Presets

-- Create full-text search index for time entries
ALTER TABLE employee_reports ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_employee_reports_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.work_performed, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_employee_reports_search_trigger ON employee_reports;
CREATE TRIGGER update_employee_reports_search_trigger
  BEFORE INSERT OR UPDATE ON employee_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_reports_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_employee_reports_search_vector 
  ON employee_reports USING GIN(search_vector);

-- Update existing records with search vectors
UPDATE employee_reports 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(work_performed, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'B')
WHERE search_vector IS NULL;

-- Create table for saved filter presets
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for filter presets
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own filter presets"
  ON filter_presets FOR SELECT
  USING (user_id = auth_profile_id_safe());

CREATE POLICY "Users can create their own filter presets"
  ON filter_presets FOR INSERT
  WITH CHECK (user_id = auth_profile_id_safe());

CREATE POLICY "Users can update their own filter presets"
  ON filter_presets FOR UPDATE
  USING (user_id = auth_profile_id_safe());

CREATE POLICY "Users can delete their own filter presets"
  ON filter_presets FOR DELETE
  USING (user_id = auth_profile_id_safe());

-- Admins can view global presets
CREATE POLICY "Admins can view global filter presets"
  ON filter_presets FOR SELECT
  USING (is_global = true AND has_internal_role(ARRAY['admin', 'manager']));

-- Create function for full-text search query
CREATE OR REPLACE FUNCTION search_employee_reports(
  search_query text,
  filters jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id uuid,
  report_date date,
  hours_worked numeric,
  work_performed text,
  notes text,
  ts_rank_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.report_date,
    er.hours_worked,
    er.work_performed,
    er.notes,
    ts_rank(er.search_vector, plainto_tsquery('english', search_query)) as ts_rank_score
  FROM employee_reports er
  WHERE er.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank_score DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create indexes for filter presets
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_global ON filter_presets(is_global) WHERE is_global = true;