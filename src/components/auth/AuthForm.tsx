import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormProps {
  view: 'sign_in' | 'sign_up';
  onViewChange: (view: 'sign_in' | 'sign_up' | 'password_reset' | 'create_user') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ view, onViewChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (view === 'sign_in') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          setLoading(false); // Only set loading false on error
        }
        // Don't set loading false on success - let navigation handle it
      } else {
        const { error } = await signUp(email, password, firstName, lastName);
        if (error) {
          setError(error.message);
          setLoading(false); // Only set loading false on error
        }
        // Don't set loading false on success - let navigation handle it
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false); // Set loading false on exception
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {view === 'sign_in' ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {view === 'sign_in' 
            ? 'Enter your credentials to access your account' 
            : 'Create a new account to get started'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {view === 'sign_up' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={loading}
          >
            {loading ? 'Please wait...' : (view === 'sign_in' ? 'Sign In' : 'Create Account')}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 text-center space-y-2">
          {view === 'sign_in' ? (
            <>
              <Button
                variant="link"
                onClick={() => onViewChange('password_reset')}
                className="text-sm"
                disabled={loading}
              >
                Forgot your password?
              </Button>
              {/* <div>
                <span className="text-sm text-muted-foreground">Don't have an account? </span>
                <Button
                  variant="link"
                  onClick={() => onViewChange('sign_up')}
                  className="text-sm p-0 h-auto"
                  disabled={loading}
                >
                  Sign up
                </Button>
              </div> */}
            </>
          ) : (
            <div>
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <Button
                variant="link"
                onClick={() => onViewChange('sign_in')}
                className="text-sm p-0 h-auto"
                disabled={loading}
              >
                Sign in
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};