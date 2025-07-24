-- Create function to update user profile and auth metadata atomically
CREATE OR REPLACE FUNCTION public.update_user_profile_and_auth(
  p_profile_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_user_type user_type,
  p_phone text DEFAULT NULL,
  p_company_name text DEFAULT NULL,
  p_hourly_billable_rate numeric DEFAULT NULL,
  p_hourly_cost_rate numeric DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_organization_ids uuid[];
  updated_profile profiles%ROWTYPE;
BEGIN
  -- Get the auth user_id from the profile
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Update the profiles table
  UPDATE profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    email = p_email,
    user_type = p_user_type,
    phone = p_phone,
    company_name = p_company_name,
    hourly_billable_rate = p_hourly_billable_rate,
    hourly_cost_rate = p_hourly_cost_rate,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_profile_id
  RETURNING * INTO updated_profile;
  
  -- Get user's organization IDs for app metadata
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = p_profile_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users raw_user_meta_data (for display names)
  UPDATE auth.users
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'user_type', p_user_type,
      'email', p_email
    ),
    -- Also update raw_app_meta_data (for JWT context)
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'user_type', p_user_type,
      'profile_id', p_profile_id,
      'organization_ids', v_organization_ids,
      'is_active', p_is_active
    ),
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Return success with updated profile data
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(updated_profile),
    'auth_updated', true,
    'organization_ids', v_organization_ids
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', 'Failed to update user profile and auth metadata'
  );
END;
$function$;