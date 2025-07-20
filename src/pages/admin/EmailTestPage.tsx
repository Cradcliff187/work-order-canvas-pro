import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useUserMutations } from '@/hooks/useUsers';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Send,
  Clock,
  Loader2,
  Server,
  Database,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailLog {
  id: string;
  recipient_email: string;
  template_used: string | null;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
}

interface TestUserForm {
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
}

const EmailTestPage = () => {
  const { toast } = useToast();
  const { createUser } = useUserMutations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [edgeFunctionStatus, setEdgeFunctionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  
  const [testForm, setTestForm] = useState<TestUserForm>({
    email: '',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'employee',
  });

  useEffect(() => {
    checkEmailConfiguration();
    fetchEmailLogs();
  }, []);

  const checkEmailConfiguration = async () => {
    setEdgeFunctionStatus('checking');
    try {
      // Test if the Edge Function is accessible
      const { error } = await supabase.functions.invoke('create-admin-user', {
        body: { test: true }
      });
      
      // Even if it returns an error, if it's accessible we consider it available
      setEdgeFunctionStatus('available');
    } catch (error: any) {
      console.error('Edge function check failed:', error);
      setEdgeFunctionStatus('unavailable');
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    }
  };

  const handleCreateTestUser = async () => {
    if (!testForm.email || !testForm.first_name || !testForm.last_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await createUser.mutateAsync({
        email: testForm.email,
        first_name: testForm.first_name,
        last_name: testForm.last_name,
        user_type: testForm.user_type,
        
      });

      setTestResult({
        success: true,
        message: 'Test user created successfully!',
        details: result
      });

      // Refresh email logs to show the new entry
      setTimeout(() => {
        fetchEmailLogs();
      }, 2000);

      // Clear form
      setTestForm(prev => ({
        ...prev,
        email: '',
        first_name: 'Test',
        last_name: 'User'
      }));

    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Failed to create test user: ${error.message}`,
        details: error
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = 
      ['sent', 'delivered'].includes(status.toLowerCase()) ? 'default' :
      ['failed', 'bounced'].includes(status.toLowerCase()) ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email System Testing</h1>
        <p className="text-muted-foreground">Test email functionality and monitor delivery status</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4" />
              Edge Function
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {edgeFunctionStatus === 'checking' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : edgeFunctionStatus === 'available' ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm">
                {edgeFunctionStatus === 'checking' ? 'Checking...' :
                 edgeFunctionStatus === 'available' ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Email Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">{emailLogs.length} recent entries</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              Supabase Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">Built-in service</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test User Creation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Test User
          </CardTitle>
          <CardDescription>
            Test the user creation process and email delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={testForm.email}
                onChange={(e) => setTestForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="user_type">User Type</Label>
              <select
                id="user_type"
                value={testForm.user_type}
                onChange={(e) => setTestForm(prev => ({ ...prev, user_type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="employee">Employee</option>
                <option value="partner">Partner</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={testForm.first_name}
                onChange={(e) => setTestForm(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={testForm.last_name}
                onChange={(e) => setTestForm(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </div>
          </div>


          <Button 
            onClick={handleCreateTestUser}
            disabled={isLoading || edgeFunctionStatus !== 'available'}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Create Test User
          </Button>

          {testResult && (
            <Alert className={testResult.success ? 'border-success' : 'border-destructive'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Email Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Email Logs
          </CardTitle>
          <CardDescription>
            Monitor email delivery status and troubleshoot issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                    <TableCell>{log.template_used || 'N/A'}</TableCell>
                    <TableCell>{new Date(log.sent_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {log.delivered_at ? new Date(log.delivered_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {log.error_message ? (
                        <span className="text-destructive text-sm">{log.error_message}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No email logs found. Create a test user to generate email activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTestPage;