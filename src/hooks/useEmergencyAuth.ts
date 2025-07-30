import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Phase 2: Emergency Database Function Approach
// This hook provides emergency access using security definer functions
// when normal RLS policies fail due to session context issues

interface EmergencyAuthResult {
  profile: any | null;
  organizations: any[] | null;
  debugInfo: any | null;
  loading: boolean;
  error: string | null;
}

export const useEmergencyAuth = () => {
  const [result, setResult] = useState<EmergencyAuthResult>({
    profile: null,
    organizations: null,
    debugInfo: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const testEmergencyAccess = async () => {
      try {
        console.log('🔧 Emergency Auth: Testing session context...');
        
        // Phase 1: Test session context
        const { data: debugData, error: debugError } = await supabase.rpc('debug_session_context');
        
        if (debugError) {
          console.error('❌ Emergency Auth: Debug function failed:', debugError);
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Debug failed: ${debugError.message}` 
          }));
          return;
        }

        console.log('🔍 Emergency Auth: Session context debug:', debugData);
        
        // Phase 2: Try emergency admin access if session context failed
        const debugResponse = debugData as any;
        const sessionContextWorking = debugResponse?.session_propagation?.context_available;
        
        if (!sessionContextWorking) {
          console.log('⚠️ Emergency Auth: Session context failed, using emergency bypass...');
          
          // Test basic database operations
          const { data: dbTest, error: dbError } = await supabase.rpc('test_basic_db_operations');
          
          if (dbError) {
            console.error('❌ Emergency Auth: Database test failed:', dbError);
            setResult(prev => ({ 
              ...prev, 
              loading: false, 
              error: `Database test failed: ${dbError.message}` 
            }));
            return;
          }
          
          console.log('✅ Emergency Auth: Database accessible:', dbTest);
          
          // Emergency admin profile access
          const { data: profileData, error: profileError } = await supabase.rpc('get_admin_profile_emergency');
          
          if (profileError) {
            console.error('❌ Emergency Auth: Admin profile access failed:', profileError);
            setResult(prev => ({ 
              ...prev, 
              loading: false, 
              error: `Profile access failed: ${profileError.message}` 
            }));
            return;
          }
          
          console.log('🆘 Emergency Auth: Admin profile accessed:', profileData);
          
          // Emergency organization access
          const { data: orgData, error: orgError } = await supabase.rpc('get_admin_organizations_emergency');
          
          if (orgError) {
            console.error('❌ Emergency Auth: Organization access failed:', orgError);
            const profileResponse = profileData as any;
            setResult(prev => ({ 
              ...prev, 
              organizations: [], 
              profile: profileResponse?.profile || null,
              debugInfo: debugData,
              loading: false, 
              error: `Organization access failed: ${orgError.message}` 
            }));
            return;
          }
          
          console.log('🏢 Emergency Auth: Organizations accessed:', orgData);
          
          const profileResponse = profileData as any;
          const orgResponse = orgData as any;
          setResult({
            profile: profileResponse?.profile || null,
            organizations: orgResponse?.memberships || [],
            debugInfo: debugData,
            loading: false,
            error: null
          });
          
        } else {
          console.log('✅ Emergency Auth: Session context working normally');
          setResult({
            profile: null,
            organizations: null,
            debugInfo: debugData,
            loading: false,
            error: null
          });
        }
        
      } catch (error) {
        console.error('💥 Emergency Auth: Unexpected error:', error);
        setResult(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Unexpected error: ${error}` 
        }));
      }
    };

    testEmergencyAccess();
  }, []);

  return result;
};