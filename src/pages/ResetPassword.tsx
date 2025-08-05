import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, EyeOff, Check, X, Clock, Link2, RefreshCw, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/useBranding';
import { supabase } from '@/integrations/supabase/client';

// Error types for better categorization
type ResetErrorType = 'EXPIRED_LINK' | 'INVALID_TOKEN' | 'ALREADY_USED' | 'MISSING_PARAMS' | 'SESSION_ERROR' | 'NETWORK_ERROR' | 'URL_CONFIG' | 'AUTH_ERROR' | 'OTP_EXPIRED' | 'UNKNOWN';

interface ResetError {
  type: ResetErrorType;
  title: string;
  message: string;
  canRetry: boolean;
  showRequestNewLink: boolean;
  showConfigHelp?: boolean;
}

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetError, setResetError] = useState<ResetError | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const { resetPassword } = useAuth();
  const branding = useBranding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Extract type parameter for different flows (signup vs recovery)
  const urlType = searchParams.get('type') || 
    new URLSearchParams(window.location.hash.substring(1)).get('type');

  // Error categorization helper
  const categorizeError = (error: any, context: string): ResetError => {
    const errorMessage = error?.message || error || '';
    
    console.log('Reset Password Error Details:', {
      error: errorMessage,
      context,
      currentURL: window.location.href,
      hasSearchParams: window.location.search.length > 0,
      hasHashParams: window.location.hash.length > 0
    });
    
    // Check for specific OTP expired error first
    if (context === 'otp_expired' || errorMessage.includes('otp_expired') || 
        errorMessage.includes('Email link is invalid or has expired')) {
      return {
        type: 'OTP_EXPIRED',
        title: 'Reset Link Expired',
        message: 'Your password reset link has expired for security reasons. Please request a new one.',
        canRetry: false,
        showRequestNewLink: true
      };
    }
    
    // Check for URL configuration issues
    if (errorMessage.includes('One-time token not found') || 
        errorMessage.includes('Email link is invalid') ||
        context === 'missing_params' && !window.location.search && !window.location.hash) {
      return {
        type: 'URL_CONFIG',
        title: 'URL Configuration Issue',
        message: 'The password reset link appears to be missing authentication parameters. This usually indicates that the Supabase URL configuration needs to be updated.',
        canRetry: false,
        showRequestNewLink: true,
        showConfigHelp: true
      };
    }
    
    // Check for specific error patterns
    if (errorMessage.includes('expired') || errorMessage.includes('Token has expired')) {
      return {
        type: 'EXPIRED_LINK',
        title: 'Reset Link Expired',
        message: 'Your password reset link has expired. Please request a new one to continue.',
        canRetry: false,
        showRequestNewLink: true
      };
    }
    
    if (errorMessage.includes('invalid') || errorMessage.includes('Invalid token')) {
      return {
        type: 'INVALID_TOKEN',
        title: 'Invalid Reset Link',
        message: 'This password reset link is not valid. Please check your email and use the most recent reset link.',
        canRetry: false,
        showRequestNewLink: true
      };
    }
    
    if (errorMessage.includes('already') || errorMessage.includes('used')) {
      return {
        type: 'ALREADY_USED',
        title: 'Reset Link Already Used',
        message: 'This password reset link has already been used. Please request a new one if you need to reset your password again.',
        canRetry: false,
        showRequestNewLink: true
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: 'NETWORK_ERROR',
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        canRetry: true,
        showRequestNewLink: false
      };
    }
    
    if (context === 'session_error') {
      return {
        type: 'SESSION_ERROR',
        title: 'Session Error',
        message: 'Unable to verify your reset session. This usually means the link has expired or been used.',
        canRetry: false,
        showRequestNewLink: true
      };
    }
    
    // Default error
    return {
      type: 'UNKNOWN',
      title: 'Reset Error',
      message: errorMessage || 'An unexpected error occurred. Please try requesting a new password reset link.',
      canRetry: false,
      showRequestNewLink: true
    };
  };

  const handleRequestNewLink = () => {
    navigate('/auth', { state: { showForgotPassword: true } });
  };

  const handleRetry = () => {
    setResetError(null);
    window.location.reload();
  };

  const handleGoToLogin = async () => {
    // Clear countdown timer
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    
    // Sign out and navigate
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getErrorIcon = (type: ResetErrorType) => {
    switch (type) {
      case 'EXPIRED_LINK':
      case 'OTP_EXPIRED':
        return <Clock className="h-5 w-5" />;
      case 'INVALID_TOKEN':
      case 'ALREADY_USED':
        return <Link2 className="h-5 w-5" />;
      case 'NETWORK_ERROR':
        return <RefreshCw className="h-5 w-5" />;
      case 'URL_CONFIG':
        return <Settings className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Password validation helper functions
  const validatePassword = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
  };

  const passwordRequirements = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean) && passwordsMatch;

  useEffect(() => {
    let recoveryModeFlag = false;

    // Check for URL error parameters first
    const checkForUrlErrors = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      const error = hashParams.get('error') || searchParams.get('error');
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      
      if (error === 'access_denied' && errorCode === 'otp_expired') {
        setResetError(categorizeError('OTP expired', 'otp_expired'));
        return true;
      }
      
      if (error) {
        setResetError(categorizeError(`${error}: ${errorDescription || 'Unknown error'}`, 'url_error'));
        return true;
      }
      
      return false;
    };

    // Set up auth state listener to detect recovery mode
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event detected');
        sessionStorage.setItem('password_recovery_mode', 'true');
        recoveryModeFlag = true;
      }
      
      if (event === 'SIGNED_IN' && sessionStorage.getItem('password_recovery_mode')) {
        console.log('User signed in from recovery link');
        sessionStorage.removeItem('password_recovery_mode');
        recoveryModeFlag = true;
      }
    });

    const checkRecoverySession = async () => {
      // First check for URL errors
      if (checkForUrlErrors()) {
        return;
      }

      // Check if we're in recovery mode from sessionStorage
      const isRecoveryMode = sessionStorage.getItem('password_recovery_mode') === 'true';
      if (isRecoveryMode) {
        console.log('Recovery mode detected from sessionStorage');
        return;
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if this is a recovery session
        // Look for recent authentication that indicates password recovery
        const userMetadata = session.user.user_metadata;
        const appMetadata = session.user.app_metadata;
        
        // Multiple indicators of a recovery session
        const isRecoverySession = 
          // Recent session created in last 10 minutes (typical for recovery flow)
          (session.user.last_sign_in_at && 
           new Date(session.user.last_sign_in_at).getTime() > Date.now() - 10 * 60 * 1000) ||
          // Email provider and recent confirmation
          (appMetadata?.provider === 'email' && 
           session.user.email_confirmed_at &&
           new Date(session.user.email_confirmed_at).getTime() > Date.now() - 10 * 60 * 1000) ||
          // Recovery mode flag
          recoveryModeFlag;
        
        if (isRecoverySession) {
          console.log('User is in recovery mode - allowing password reset');
          return;
        } else {
          // Regular logged-in user accessing reset page
          console.log('Regular user accessing reset page - redirecting to dashboard');
          navigate('/');
          return;
        }
      } else {
        // No session - user needs to use recovery link
        setResetError({
          type: 'AUTH_ERROR',
          title: 'Authentication Required',
          message: 'Please use the password reset link from your email to access this page.',
          canRetry: false,
          showRequestNewLink: true
        });
      }
    };

    checkRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (success && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Time's up - redirect
            handleGoToLogin();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setCountdownInterval(interval);
      return () => clearInterval(interval);
    }
  }, [success, countdown]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetError(null);

    if (password !== confirmPassword) {
      setResetError(categorizeError('Passwords do not match', 'validation_error'));
      setLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setResetError(categorizeError('Please ensure all password requirements are met', 'validation_error'));
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(password);
    
    if (error) {
      setResetError(categorizeError(error, 'reset_error'));
    } else {
      setSuccess(true);
      setCountdown(3); // Reset countdown to 3 seconds
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
      });
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={branding.assets.logos.horizontal} 
              alt={branding.company.name}
              className="mx-auto h-12 w-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {branding.getProductDisplayName()}
            </h1>
            <h2 className="text-lg font-medium text-muted-foreground">
              {branding.getCompanyDisplayName()}
            </h2>
          </div>

          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center border-2 border-success/20">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center text-success">Password Updated Successfully!</CardTitle>
              <CardDescription className="text-center">
                Your password has been changed and you're ready to sign in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-success/20 bg-success/5">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  You can now use your new password to access your account. Keep it secure!
                </AlertDescription>
              </Alert>
              
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Redirecting in
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {countdown}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {countdown === 1 ? 'second' : 'seconds'}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={handleGoToLogin}
                    className="w-full"
                    size="lg"
                  >
                    Go to Login Now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Or wait for automatic redirect
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={branding.assets.logos.horizontal} 
            alt={branding.company.name}
            className="mx-auto h-12 w-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {branding.getProductDisplayName()}
          </h1>
          <h2 className="text-lg font-medium text-muted-foreground">
            {branding.getCompanyDisplayName()}
          </h2>
        </div>

        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {urlType === 'signup' ? 'Set Your Password' : 'Reset Your Password'}
            </CardTitle>
            <CardDescription className="text-center">
              {urlType === 'signup' 
                ? 'Create a secure password for your new account'
                : 'Enter a new password for your account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {true ? ( // Always show reset form in new system
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {password.length > 0 && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium text-foreground">Password Requirements:</p>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          At least 8 characters
                        </div>
                        <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordRequirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          One uppercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordRequirements.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          One lowercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordRequirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          One number
                        </div>
                        <div className={`flex items-center gap-2 ${passwordRequirements.hasSpecialChar ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordRequirements.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          One special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-success' : 'text-destructive'}`}>
                      {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </div>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading || !isPasswordValid}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            ) : !resetError && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Validating reset link...</p>
              </div>
            )}

            {resetError && (
              <div className="mt-4 space-y-4">
                <Alert variant="destructive">
                  {getErrorIcon(resetError.type)}
                  <AlertTitle>{resetError.title}</AlertTitle>
                  <AlertDescription>{resetError.message}</AlertDescription>
                </Alert>
                
                {resetError.showConfigHelp && (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <Settings className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400">URL Configuration Required</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      <div className="space-y-2">
                        <p>To fix this issue, configure these URLs in your Supabase Dashboard:</p>
                        <div className="text-xs font-mono bg-amber-100 dark:bg-amber-900/30 p-2 rounded border">
                          <div><strong>Site URL:</strong> {window.location.origin}</div>
                          <div><strong>Redirect URLs:</strong> {window.location.origin}/reset-password</div>
                        </div>
                        <p className="text-xs">Go to: Authentication → URL Configuration in your Supabase Dashboard</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex flex-col gap-2">
                  {resetError.showRequestNewLink && (
                    <Button
                      onClick={handleRequestNewLink}
                      variant="outline"
                      className="w-full"
                    >
                      Request New Reset Link
                    </Button>
                  )}
                  
                  {resetError.canRetry && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
