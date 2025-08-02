-- Create comprehensive user creation function that handles everything atomically
CREATE OR REPLACE FUNCTION public.create_new_user(
  email text,
  first_name text,
  last_name text,
  organization_id uuid,
  organization_role text,
  phone text DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  new_profile_id UUID;
  caller_profile_id UUID;
  is_authorized BOOLEAN := false;
  temp_password TEXT;
BEGIN
  -- Get caller's profile ID
  SELECT auth_profile_id_safe() INTO caller_profile_id;
  
  IF caller_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify that the caller is an admin of an internal organization
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.organizations o ON om.organization_id = o.id
    WHERE om.user_id = caller_profile_id
      AND o.organization_type = 'internal'
      AND om.role = 'admin'
  ) INTO is_authorized;

  IF NOT is_authorized THEN
    RAISE EXCEPTION 'You are not authorized to create new users. Admin access required.';
  END IF;

  -- Verify target organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = organization_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid organization specified';
  END IF;

  -- Generate a temporary password (user will be prompted to set their own)
  temp_password := gen_random_uuid()::text;

  -- Create the user in auth.users using admin client
  -- This bypasses RLS and uses service role permissions
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    email_confirm_token,
    recovery_token,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    recovery_sent_at,
    invited_at,
    action_link,
    email_change,
    email_change_token_new,
    email_change_confirm_status,
    banned_until,
    email_change_token_current,
    email_change_sent_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email,
    crypt(temp_password, gen_salt('bf')),
    now(),
    '',
    '',
    null,
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'organization_id', organization_id,
      'organization_role', organization_role
    ),
    jsonb_build_object(
      'first_name', first_name,
      'last_name', last_name,
      'email', email
    ),
    now(),
    now(),
    phone,
    CASE WHEN phone IS NOT NULL THEN now() ELSE NULL END,
    '',
    null,
    now(),
    '',
    '',
    '',
    0,
    null,
    '',
    null
  )
  RETURNING id INTO new_user_id;

  -- Create the user profile
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    phone,
    is_active,
    is_employee
  )
  VALUES (
    new_user_id,
    email,
    first_name,
    last_name,
    phone,
    true,
    false
  )
  RETURNING id INTO new_profile_id;

  -- Create the organization membership
  INSERT INTO public.organization_members (
    user_id,
    organization_id,
    role
  )
  VALUES (
    new_profile_id,
    organization_id,
    organization_role::public.organization_role
  );

  -- Log the successful creation
  RAISE LOG 'Successfully created user: email=%, profile_id=%, auth_id=%', 
    email, new_profile_id, new_user_id;

  -- Return success with user details
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'profile_id', new_profile_id,
    'email', email,
    'message', 'User created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error and re-raise with context
  RAISE LOG 'User creation failed for email %: %', email, SQLERRM;
  RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;