-- Phase 2: Create storage bucket and policies for partner invoice PDFs

-- Create partner-invoices storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partner-invoices', 'partner-invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for partner invoice PDFs

-- Policy: Allow authenticated users to view partner invoices (admins and partners)
CREATE POLICY "Partner invoice PDFs are viewable by admins and partners" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'partner-invoices' AND 
  (
    -- Allow admins to view all
    jwt_is_admin() OR
    -- Allow partners to view their own invoices (path contains their org initials)
    EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'partner'
      AND name LIKE '%' || o.initials || '%'
    )
  )
);

-- Policy: Allow admins to upload partner invoice PDFs
CREATE POLICY "Admins can upload partner invoice PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'partner-invoices' AND 
  jwt_is_admin()
);

-- Policy: Allow admins to update partner invoice PDFs
CREATE POLICY "Admins can update partner invoice PDFs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'partner-invoices' AND 
  jwt_is_admin()
);

-- Policy: Allow admins to delete partner invoice PDFs
CREATE POLICY "Admins can delete partner invoice PDFs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'partner-invoices' AND 
  jwt_is_admin()
);