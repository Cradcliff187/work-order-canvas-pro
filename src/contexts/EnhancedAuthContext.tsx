/**
 * Enhanced Authentication Context
 * Provides unified authentication with automatic switching between legacy and organization-based systems
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import type { UserWithOrganizations, OrganizationMember, AuthState } from '@/types/auth.types';

interface EnhancedAuthContextType extends AuthState {
  // Enhanced authentication properties
  session: Session | null;
  
  // Authentication methods
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  
  // Impersonation (for admin users)
  isImpersonating: boolean;
  setImpersonation: (profile: any) => void;
  clearImpersonation: () => void;
  
  // Migration state
  isUsingOrganizationAuth: boolean;
  legacyProfile: any; // Fallback to legacy profile if needed
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

export const EnhancedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use organization-based authentication as the default
  const legacyAuth = useAuth();
  const organizationAuth = useOrganizationAuth();

  // Use organization auth as primary, with legacy as fallback
  const authState = {
    user: organizationAuth.user,
    isLoading: organizationAuth.isLoading,
    primaryOrganization: organizationAuth.primaryOrganization,
    hasInternalAccess: organizationAuth.hasInternalAccess,
    hasAdminAccess: organizationAuth.hasAdminAccess
  };

  const value: EnhancedAuthContextType = {
    // Core auth state (organization-based)
    user: authState.user,
    isLoading: authState.isLoading,
    primaryOrganization: authState.primaryOrganization,
    hasInternalAccess: authState.hasInternalAccess,
    hasAdminAccess: authState.hasAdminAccess,

    // Session from legacy system (always available)
    session: legacyAuth.session,
    
    // Authentication methods (delegate to legacy system)
    signIn: legacyAuth.signIn,
    signOut: legacyAuth.signOut,
    updateProfile: legacyAuth.updateProfile,
    refreshProfile: legacyAuth.refreshProfile,
    
    // Impersonation (from legacy system)
    isImpersonating: legacyAuth.isImpersonating,
    setImpersonation: legacyAuth.setImpersonation,
    clearImpersonation: legacyAuth.clearImpersonation,
    
    // Migration state (always true now)
    isUsingOrganizationAuth: true,
    legacyProfile: legacyAuth.profile
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};