-- Add comprehensive debug logging to the user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_user_type user_type;
  v_organization_ids uuid[];
  v_debug_id text;
  v_app_metadata jsonb;
  v_user_metadata jsonb;
BEGIN
  -- Generate debug ID for tracking
  v_debug_id := 'TRIGGER_' || substr(NEW.id::text, 1, 8) || '_' || extract(epoch from now())::text;
  
  RAISE LOG '[%] 🚀 handle_new_user_bulletproof triggered for user: %', v_debug_id, NEW.id;
  
  -- Extract metadata from NEW record
  v_app_metadata := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb);
  v_user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  RAISE LOG '[%] 📊 Raw metadata extracted - app_metadata: %, user_metadata: %', 
    v_debug_id, v_app_metadata, v_user_metadata;
  
  -- Extract user_type with debug logging
  v_user_type := COALESCE(
    (v_app_metadata ->> 'user_type')::user_type,
    'subcontractor'::user_type
  );
  
  RAISE LOG '[%] 👤 User type determination - from_app_metadata: %, final_user_type: %, fallback_used: %', 
    v_debug_id, 
    v_app_metadata ->> 'user_type', 
    v_user_type,
    (v_app_metadata ->> 'user_type') IS NULL;
  
  -- Extract organization IDs with debug logging
  v_organization_ids := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(v_app_metadata -> 'organization_ids'))::uuid[],
    '{}'::uuid[]
  );
  
  RAISE LOG '[%] 🏢 Organization IDs extracted - raw_json: %, parsed_array: %, array_length: %', 
    v_debug_id,
    v_app_metadata -> 'organization_ids',
    v_organization_ids,
    array_length(v_organization_ids, 1);
  
  -- Generate profile ID
  v_profile_id := gen_random_uuid();
  
  RAISE LOG '[%] 🆔 Generated profile ID: %', v_debug_id, v_profile_id;
  
  -- Insert profile with comprehensive logging
  BEGIN
    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      first_name,
      last_name,
      user_type,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_profile_id,
      NEW.id,
      NEW.email,
      COALESCE(v_user_metadata ->> 'first_name', ''),
      COALESCE(v_user_metadata ->> 'last_name', ''),
      v_user_type,
      true,
      now(),
      now()
    );
    
    RAISE LOG '[%] ✅ Profile inserted successfully with ID: %, user_type: %, email: %', 
      v_debug_id, v_profile_id, v_user_type, NEW.email;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[%] ❌ Profile insertion failed - SQLSTATE: %, SQLERRM: %', 
      v_debug_id, SQLSTATE, SQLERRM;
    RAISE;
  END;
  
  -- Update auth.users with comprehensive app_metadata
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = v_app_metadata || jsonb_build_object(
      'profile_id', v_profile_id,
      'user_type', v_user_type,
      'organization_ids', v_organization_ids,
      'is_active', true,
      'profile_created_at', now()
    )
    WHERE id = NEW.id;
    
    RAISE LOG '[%] ✅ Auth user app_metadata updated with profile_id: %, user_type: %, organization_ids: %', 
      v_debug_id, v_profile_id, v_user_type, v_organization_ids;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[%] ❌ Auth user metadata update failed - SQLSTATE: %, SQLERRM: %', 
      v_debug_id, SQLSTATE, SQLERRM;
    -- Don't raise here as this is less critical
  END;
  
  -- Create organization relationships if any exist
  IF array_length(v_organization_ids, 1) > 0 THEN
    RAISE LOG '[%] 🔗 Creating organization relationships for % organizations', 
      v_debug_id, array_length(v_organization_ids, 1);
      
    FOR i IN 1..array_length(v_organization_ids, 1) LOOP
      BEGIN
        INSERT INTO public.user_organizations (user_id, organization_id)
        VALUES (v_profile_id, v_organization_ids[i]);
        
        RAISE LOG '[%] ✅ Organization relationship created: profile_id=%, organization_id=%', 
          v_debug_id, v_profile_id, v_organization_ids[i];
          
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG '[%] ❌ Organization relationship creation failed for org %: SQLSTATE=%, SQLERRM=%', 
          v_debug_id, v_organization_ids[i], SQLSTATE, SQLERRM;
        -- Continue with other organizations
      END;
    END LOOP;
  ELSE
    RAISE LOG '[%] ⚠️ No organization IDs provided - user will have no organization relationships', v_debug_id;
  END IF;
  
  RAISE LOG '[%] 🎉 handle_new_user_bulletproof completed successfully for user: %', v_debug_id, NEW.id;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[%] 💥 CRITICAL ERROR in handle_new_user_bulletproof: SQLSTATE=%, SQLERRM=%', 
    v_debug_id, SQLSTATE, SQLERRM;
  RAISE;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created_bulletproof ON auth.users;
CREATE TRIGGER on_auth_user_created_bulletproof
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Create debug helper function for manual testing
CREATE OR REPLACE FUNCTION public.debug_user_creation_state(p_email text DEFAULT NULL, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_auth_user jsonb;
  v_profile jsonb;
  v_user_orgs jsonb;
BEGIN
  -- Find user by email or ID
  IF p_email IS NOT NULL THEN
    SELECT to_jsonb(au.*) INTO v_auth_user
    FROM auth.users au
    WHERE au.email = p_email;
  ELSIF p_user_id IS NOT NULL THEN
    SELECT to_jsonb(au.*) INTO v_auth_user
    FROM auth.users au
    WHERE au.id = p_user_id;
  ELSE
    RETURN jsonb_build_object('error', 'Must provide either email or user_id');
  END IF;
  
  IF v_auth_user IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Get profile
  SELECT to_jsonb(p.*) INTO v_profile
  FROM profiles p
  WHERE p.user_id = (v_auth_user ->> 'id')::uuid;
  
  -- Get user organizations
  SELECT jsonb_agg(
    jsonb_build_object(
      'organization_id', uo.organization_id,
      'organization_name', o.name,
      'organization_type', o.organization_type,
      'created_at', uo.created_at
    )
  ) INTO v_user_orgs
  FROM user_organizations uo
  JOIN organizations o ON o.id = uo.organization_id
  WHERE uo.user_id = (v_profile ->> 'id')::uuid;
  
  RETURN jsonb_build_object(
    'auth_user', v_auth_user,
    'profile', v_profile,
    'user_organizations', COALESCE(v_user_orgs, '[]'::jsonb),
    'debug_analysis', jsonb_build_object(
      'profile_exists', v_profile IS NOT NULL,
      'user_type_from_profile', v_profile ->> 'user_type',
      'user_type_from_auth_metadata', v_auth_user -> 'raw_app_meta_data' ->> 'user_type',
      'user_types_match', (v_profile ->> 'user_type') = (v_auth_user -> 'raw_app_meta_data' ->> 'user_type'),
      'organization_count', jsonb_array_length(COALESCE(v_user_orgs, '[]'::jsonb)),
      'has_app_metadata', (v_auth_user -> 'raw_app_meta_data') IS NOT NULL,
      'profile_id_in_metadata', v_auth_user -> 'raw_app_meta_data' ->> 'profile_id'
    )
  );
END;
$$;