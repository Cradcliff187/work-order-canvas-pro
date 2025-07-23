import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testUserCreation = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      console.log('🔐 Testing user creation after surgical fix...');
      
      const { data, error } = await supabase.functions.invoke('create-test-auth-users', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "User Creation Test",
        description: data.success ? `Success! ${data.message}` : `Failed: ${data.error}`,
        variant: data.success ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('User creation test failed:', error);
      setResult({ success: false, error: error.message });
      toast({
        title: "User Creation Failed", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">User Creation Test</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Testing the surgical fix for user creation after database migration
        </p>
        
        <Button 
          onClick={testUserCreation}
          disabled={loading}
          size="lg"
          className="mb-6"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Test Users...
            </>
          ) : (
            'Test User Creation'
          )}
        </Button>

        {result && (
          <div className="mt-6 p-4 bg-muted rounded-lg text-left">
            <h3 className="font-semibold mb-2">
              {result.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
