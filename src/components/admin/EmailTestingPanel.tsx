
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const EMAIL_TEMPLATES = [
  { value: 'work_order_created', label: 'Work Order Created' },
  { value: 'work_order_assigned', label: 'Work Order Assigned' },
  { value: 'work_order_completed', label: 'Work Order Completed' },
  { value: 'report_submitted', label: 'Report Submitted' },
  { value: 'report_reviewed', label: 'Report Reviewed' },
  { value: 'welcome_email', label: 'Welcome Email' },
  { value: 'test_email', label: 'Test Email' },
  { value: 'auth_confirmation', label: 'Auth Confirmation' },
  { value: 'password_reset', label: 'Password Reset' },
];

interface EmailLog {
  id: string;
  template_used: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  error_message?: string;
}

export function EmailTestingPanel() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Query for email logs
  const { data: emailLogs, refetch, isLoading: logsLoading } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as EmailLog[];
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const getMockData = (templateName: string) => {
    const baseData = {
      first_name: 'Test User',
      last_name: 'Demo',
      email: recipientEmail,
      organization_name: 'Test Organization',
    };

    switch (templateName) {
      case 'work_order_created':
      case 'work_order_assigned':
      case 'work_order_completed':
        return {
          ...baseData,
          work_order_number: 'TEST-001',
          title: 'Test Work Order',
          description: 'This is a test work order for email template testing',
          trade_name: 'General Maintenance',
          store_location: 'Test Location',
          street_address: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          status: 'assigned',
          assigned_to_name: 'Test Contractor',
          assigned_to_email: 'contractor@test.com',
          estimated_completion_date: '2024-01-15',
        };
      
      case 'report_submitted':
      case 'report_reviewed':
        return {
          ...baseData,
          work_order_number: 'TEST-001',
          work_performed: 'Completed test maintenance tasks',
          materials_used: 'Test materials and supplies',
          hours_worked: '4.5',
          invoice_amount: '350.00',
          status: 'approved',
          review_notes: 'Work completed satisfactorily',
          subcontractor_name: 'Test Contractor',
        };
      
      case 'auth_confirmation':
        return {
          ...baseData,
          confirmation_link: 'https://test.com/auth/confirm?token=test-token',
        };
      
      case 'password_reset':
        return {
          ...baseData,
          reset_link: 'https://test.com/auth/reset?token=test-reset-token',
        };
      
      case 'welcome_email':
        return {
          ...baseData,
          login_url: 'https://test.com/login',
        };
      
      default:
        return baseData;
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !recipientEmail) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a template and enter a recipient email',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: selectedTemplate,
          record_id: `TEST-${Date.now()}`,
          record_type: 'test',
          test_mode: true,
          test_recipient: recipientEmail,
          custom_data: getMockData(selectedTemplate),
        },
      });

      if (error) throw error;

      toast({
        title: 'Test Email Sent',
        description: `${selectedTemplate} email sent to ${recipientEmail}`,
      });

      // Refresh email logs to show the new test email
      refetch();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        variant: 'destructive',
        title: 'Email Send Failed',
        description: error.message || 'Failed to send test email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sent</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to test..." />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSendTestEmail}
            disabled={isLoading || !selectedTemplate || !recipientEmail}
            className="w-full h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Send Test Email
              </>
            )}
          </Button>
          
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p><strong>Note:</strong> Test emails include mock data appropriate for each template. 
            The email will be sent to your specified recipient with realistic test content and AKC branding.</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Live Test Results Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Live Test Results
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={logsLoading}
            >
              {logsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {emailLogs && emailLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {EMAIL_TEMPLATES.find(t => t.value === log.template_used)?.label || log.template_used}
                      </TableCell>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <span className="text-red-600 text-sm">{log.error_message}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test emails found. Send your first test email above!</p>
            </div>
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>• Table refreshes automatically every 10 seconds</p>
            <p>• Showing last 20 email logs</p>
            <p>• Status colors: <span className="text-green-600">Green = Delivered</span>, <span className="text-red-600">Red = Failed</span>, <span className="text-blue-600">Blue = Sent</span>, <span className="text-yellow-600">Yellow = Pending</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
