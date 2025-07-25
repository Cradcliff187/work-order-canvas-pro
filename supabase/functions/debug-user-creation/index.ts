import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] 🔍 DEBUG - User creation debug endpoint accessed`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      return createCorsErrorResponse('Server configuration error', 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const email = url.searchParams.get('email');
    
    console.log(`[${requestId}] 🎯 Debug action requested:`, { action, userId, email });

    switch (action) {
      case 'profile':
        if (!userId) {
          return createCorsErrorResponse('userId parameter required', 400);
        }
        
        // Get profile details
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        // Get auth user details
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        // Get organization relationships
        const { data: userOrgs, error: userOrgsError } = await supabaseAdmin
          .from('user_organizations')
          .select(`
            organization_id,
            organization:organizations(*)
          `)
          .eq('user_id', profile?.id);
          
        return createCorsResponse({
          profile: profile,
          profileError: profileError,
          authUser: authUser?.user,
          authUserAppMetadata: authUser?.user?.app_metadata,
          authUserUserMetadata: authUser?.user?.user_metadata,
          authError: authError,
          userOrganizations: userOrgs,
          userOrgsError: userOrgsError,
          debug: {
            profileFound: !!profile,
            authUserFound: !!authUser?.user,
            organizationCount: userOrgs?.length || 0,
            profileUserType: profile?.user_type,
            authAppMetadataUserType: authUser?.user?.app_metadata?.user_type
          }
        });
        
      case 'email':
        if (!email) {
          return createCorsErrorResponse('email parameter required', 400);
        }
        
        // Find user by email
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const foundUser = users?.users?.find(u => u.email === email);
        
        if (!foundUser) {
          return createCorsResponse({
            found: false,
            message: `No user found with email: ${email}`
          });
        }
        
        // Get profile for this user
        const { data: emailProfile, error: emailProfileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', foundUser.id)
          .single();
          
        return createCorsResponse({
          found: true,
          authUser: foundUser,
          authUserAppMetadata: foundUser.app_metadata,
          authUserUserMetadata: foundUser.user_metadata,
          profile: emailProfile,
          profileError: emailProfileError,
          debug: {
            authUserId: foundUser.id,
            authUserEmail: foundUser.email,
            profileFound: !!emailProfile,
            profileUserType: emailProfile?.user_type,
            authAppMetadataUserType: foundUser.app_metadata?.user_type,
            metadataMatch: emailProfile?.user_type === foundUser.app_metadata?.user_type
          }
        });
        
      case 'organizations':
        // Get all organizations with their types
        const { data: allOrgs, error: allOrgsError } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .order('organization_type', { ascending: true });
          
        return createCorsResponse({
          organizations: allOrgs,
          error: allOrgsError,
          summary: {
            total: allOrgs?.length || 0,
            byType: allOrgs?.reduce((acc, org) => {
              acc[org.organization_type] = (acc[org.organization_type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {},
            active: allOrgs?.filter(org => org.is_active).length || 0,
            inactive: allOrgs?.filter(org => !org.is_active).length || 0
          }
        });
        
      case 'user-orgs':
        // Get all user-organization relationships
        const { data: allUserOrgs, error: allUserOrgsError } = await supabaseAdmin
          .from('user_organizations')
          .select(`
            *,
            user:profiles(*),
            organization:organizations(*)
          `);
          
        return createCorsResponse({
          userOrganizations: allUserOrgs,
          error: allUserOrgsError,
          summary: {
            total: allUserOrgs?.length || 0,
            uniqueUsers: new Set(allUserOrgs?.map(uo => uo.user_id)).size,
            uniqueOrganizations: new Set(allUserOrgs?.map(uo => uo.organization_id)).size
          }
        });
        
      case 'recent-profiles':
        // Get recent profiles
        const { data: recentProfiles, error: recentProfilesError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        return createCorsResponse({
          recentProfiles: recentProfiles,
          error: recentProfilesError,
          summary: {
            total: recentProfiles?.length || 0,
            byUserType: recentProfiles?.reduce((acc, profile) => {
              acc[profile.user_type] = (acc[profile.user_type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {}
          }
        });
        
      default:
        return createCorsResponse({
          availableActions: [
            'profile?userId=UUID',
            'email?email=EMAIL',
            'organizations',
            'user-orgs',
            'recent-profiles'
          ],
          message: 'Specify an action parameter to debug user creation issues'
        });
    }
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Debug endpoint error:`, error);
    return createCorsErrorResponse(`Debug error: ${error.message}`, 500);
  }
});