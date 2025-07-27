
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { CreateUserForm } from "@/components/auth/CreateUserForm";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Auth = () => {
  const [view, setView] = useState<'sign_in' | 'sign_up' | 'password_reset' | 'create_user'>('sign_in');
  const navigate = useNavigate();
  const { toast } = useToast();
  const branding = useBranding();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Get user profile to determine redirect
        supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              const userType = profile.user_type;
              switch (userType) {
                case 'admin':
                  navigate('/admin/dashboard');
                  break;
                case 'partner':
                  navigate('/partner/dashboard');
                  break;
                case 'subcontractor':
                  navigate('/subcontractor/dashboard');
                  break;
                case 'employee':
                  navigate('/employee/dashboard');
                  break;
                default:
                  navigate('/admin/dashboard');
              }
            } else {
              navigate('/admin/dashboard');
            }
          });
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const getTitle = () => {
    switch (view) {
      case 'sign_up':
        return 'Create Account';
      case 'password_reset':
        return 'Reset Password';
      case 'create_user':
        return 'Create New User';
      default:
        return 'Sign In';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'sign_up':
        return 'Join WorkOrderPortal to manage your construction projects';
      case 'password_reset':
        return 'Enter your email to receive a password reset link';
      case 'create_user':
        return 'Create a new user account for your organization';
      default:
        return 'Access your construction management dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img 
            src={branding.assets.logos.horizontal} 
            alt={branding.company.name}
            className="mx-auto h-38 w-auto mb-8"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <HardHat className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              {branding.getProductDisplayName()}
            </h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {branding.getCompanyDisplayName()}
          </h2>
          <h3 className="text-lg font-medium text-foreground">
            {getTitle()}
          </h3>
          <p className="text-muted-foreground mt-2">
            {getSubtitle()}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          {view === 'password_reset' ? (
            <PasswordResetForm onBack={() => setView('sign_in')} />
          ) : view === 'create_user' ? (
            <CreateUserForm onBack={() => setView('sign_in')} />
          ) : (
            <AuthForm 
              view={view} 
              onViewChange={setView}
            />
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Powered by WorkOrderPortal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
