-- Add "Other" trade option to trades table
INSERT INTO trades (name, description, is_active)
VALUES ('Other', 'Other trade or service type', true)
ON CONFLICT (name) DO NOTHING;