
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SimpleEmailTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; timestamp: string } | null>(null);
  const [to, setTo] = useState('cradcliff@austinkunzconstruction.com');
  const [subject, setSubject] = useState('Simple Test Email');
  const [message, setMessage] = useState('This is a simple test email from the WorkOrderPro system.');
  const { toast } = useToast();

  const handleSendSimpleEmail = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simple-email', {
        body: {
          to,
          subject,
          message
        }
      });

      if (error) throw error;

      const result = {
        success: data?.success || false,
        message: data?.message || data?.error || 'Unknown result',
        timestamp: new Date().toISOString()
      };

      setLastResult(result);

      if (result.success) {
        toast({
          title: "Simple Email Sent!",
          description: "The simple email was sent successfully.",
        });
      } else {
        toast({
          title: "Simple Email Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Simple email test error:', error);
      const result = {
        success: false,
        message: error.message || 'Failed to send simple email',
        timestamp: new Date().toISOString()
      };
      setLastResult(result);
      
      toast({
        title: "Simple Email Error",
        description: result.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Simple Email Test
        </CardTitle>
        <CardDescription>
          Test basic SMTP connectivity with a simple email (no templates, no database)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">To Email:</label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Subject:</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Message:</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message content"
              rows={3}
            />
          </div>
        </div>

        <Button 
          onClick={handleSendSimpleEmail}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Simple Email
        </Button>

        {lastResult && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">Last Test Result</span>
              </div>
              <Badge variant={lastResult.success ? 'default' : 'destructive'}>
                {lastResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {lastResult.message}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {new Date(lastResult.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <strong>Simple Email Function:</strong> Uses port 465 with SSL, bypasses all templates and database queries. This is purely for testing SMTP connectivity.
        </div>
      </CardContent>
    </Card>
  );
};
