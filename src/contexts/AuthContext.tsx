// This file is deprecated - using EmergencyAuthContext as the main auth provider
// due to Supabase session context failure (auth.uid() returns NULL)

export { useEmergencyAuthContext as useAuth } from './EmergencyAuthContext';
export type { EmergencyAuthContextType as AuthContextType } from './EmergencyAuthContext';