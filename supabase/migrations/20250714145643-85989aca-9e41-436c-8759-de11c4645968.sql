-- Allow email logging from Edge Functions and system operations

-- Allow service role operations for email logging
CREATE POLICY "Service role can insert email logs" 
ON email_logs 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Allow system operations for email logging  
CREATE POLICY "System can log emails" 
ON email_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);