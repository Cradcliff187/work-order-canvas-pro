-- DISABLE ALL RLS - YOUR APP WILL WORK IMMEDIATELY
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable RLS on ALL tables
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;