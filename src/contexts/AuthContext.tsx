
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const forgotPassword = async (email: string) => {
    try {
      console.log('🔑 Initiating password reset for:', email);
      
      // Use our custom password reset edge function
      const { data, error } = await supabase.functions.invoke('password-reset-email', {
        body: { email }
      });
      
      if (error) {
        console.error('❌ Password reset error:', error);
        return { error };
      }
      
      console.log('✅ Password reset initiated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
