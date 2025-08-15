import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { corsHeaders, createCorsResponse, createCorsErrorResponse, handleCors } from '../_shared/cors.ts';

interface SetPasswordRequest {
  targetEmail: string;
  newPassword: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return createCorsErrorResponse('Server configuration error', 500);
    }

    // Health check
    if (req.method === 'GET') {
      return createCorsResponse({ status: 'healthy', service: 'admin-set-password' });
    }

    if (req.method !== 'POST') {
      return createCorsErrorResponse('Method not allowed', 405);
    }

    // Check authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return createCorsErrorResponse('Unauthorized: No authorization header', 401);
    }

    // Create authenticated client for verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User verification failed:', userError);
      return createCorsErrorResponse('Unauthorized: Invalid token', 401);
    }

    console.log('Authenticated user:', user.email);

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        organization_members!inner(
          role,
          organization:organizations!inner(
            organization_type
          )
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (adminError) {
      console.error('Admin check failed:', adminError);
      return createCorsErrorResponse('Failed to verify admin status', 500);
    }

    if (!adminCheck) {
      console.error('No profile found for user');
      return createCorsErrorResponse('User profile not found', 404);
    }

    // Verify admin role in internal organization
    const isAdmin = adminCheck.organization_members.some((membership: any) =>
      membership.organization.organization_type === 'internal' &&
      membership.role === 'admin'
    );

    if (!isAdmin) {
      console.error('User is not an admin:', user.email);
      return createCorsErrorResponse('Forbidden: Admin access required', 403);
    }

    console.log('Admin verification successful for:', user.email);

    // Parse request body
    const requestBody: SetPasswordRequest = await req.json();
    const { targetEmail, newPassword } = requestBody;

    // Validate input
    if (!targetEmail || !newPassword) {
      return createCorsErrorResponse('Missing required fields: targetEmail and newPassword', 400);
    }

    if (newPassword.length < 6) {
      return createCorsErrorResponse('Password must be at least 6 characters long', 400);
    }

    console.log('Setting password for user:', targetEmail);

    // Create admin client for user operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Find target user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Failed to list users:', listError);
      return createCorsErrorResponse('Failed to find target user', 500);
    }

    const targetUser = users.find(u => u.email === targetEmail);

    if (!targetUser) {
      console.error('Target user not found:', targetEmail);
      return createCorsErrorResponse('User not found', 404);
    }

    console.log('Found target user:', targetUser.id);

    // Update user password
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return createCorsErrorResponse('Failed to update password: ' + updateError.message, 500);
    }

    console.log('Password updated successfully for:', targetEmail);

    // Get target user's profile ID for audit log
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', targetUser.id)
      .single();

    // Insert audit log (non-blocking - log warning if it fails but don't fail the password reset)
    try {
      if (targetProfile) {
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            table_name: 'password_reset',
            record_id: targetProfile.id,
            action: 'PASSWORD_RESET',
            user_id: adminCheck.id,
            old_values: null,
            new_values: {
              admin_email: user.email,
              target_email: targetEmail,
              timestamp: new Date().toISOString(),
              reset_method: 'admin_forced'
            }
          });
        console.log('Audit log created for password reset');
      }
    } catch (auditError) {
      console.warn('Failed to create audit log for password reset:', auditError);
    }

    return createCorsResponse({
      success: true,
      message: 'Password updated successfully',
      targetUser: {
        id: targetUser.id,
        email: targetEmail
      }
    });

  } catch (error) {
    console.error('Unexpected error in admin-set-password:', error);
    return createCorsErrorResponse('Internal server error: ' + (error as Error).message, 500);
  }
});