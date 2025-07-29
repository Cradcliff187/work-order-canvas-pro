/**
 * Phase 8 Step 4: Migration Complete - Organization-Based System Active
 * This compatibility layer provides minimal error handling only.
 * Legacy user_type references removed - system uses organization-based data.
 */

// Profile data fallback for error handling (organization-based)
export const getProfileFallback = () => ({
  id: '',
  user_id: '',
  email: '',
  first_name: '',
  last_name: '',
  is_active: true,
  is_employee: false,
  // Organization-based fields only
  organization_memberships: [],
  primary_organization: null
});

// Safe data access helper (organization-aware)
export const safeProfileAccess = (profile: any) => {
  if (!profile || typeof profile === 'string' || profile.error) {
    return getProfileFallback();
  }
  return profile;
};