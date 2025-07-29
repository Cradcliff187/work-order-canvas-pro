/**
 * Phase 3 Recovery: Emergency Stabilization Complete
 * Database columns and functions have been restored.
 * This compatibility layer is now minimal.
 */

// Profile data fallback for error handling
export const getProfileFallback = () => ({
  id: '',
  user_id: '',
  email: '',
  first_name: '',
  last_name: '',
  user_type: 'subcontractor' as const,
  company_name: null,
  is_active: true,
  is_employee: false
});

// Safe data access helper
export const safeProfileAccess = (profile: any) => {
  if (!profile || typeof profile === 'string' || profile.error) {
    return getProfileFallback();
  }
  return profile;
};