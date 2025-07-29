/**
 * Temporary compatibility layer during Phase 3 migration
 * This provides fallback types and functions to prevent build errors
 * while the migration is in progress.
 */

// Temporary user type fallback
export const getTempUserType = (profile: any): string => {
  if (profile?.is_employee) return 'employee';
  return 'partner'; // Default fallback
};

// Temporary company name fallback
export const getTempCompanyName = (profile: any): string => {
  return ''; // Empty during migration
};

// Bypass type errors temporarily
export const bypassTypeError = (data: any): any => {
  return data;
};

// Temporary compatibility for missing database functions
export const tempFunctionFallback = {
  get_unread_message_counts: () => [],
  update_user_profile_and_auth: () => ({ success: false }),
  get_current_user_type: () => 'partner',
  is_admin: () => false,
};