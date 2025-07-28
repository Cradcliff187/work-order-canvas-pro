
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
  const [recipientEmail, setRecipientEmail] = useState('chris.l.radcliff@gmail.com');
  const [testMode, setTestMode] = useState<'direct' | 'production'>('direct');
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
      if (testMode === 'direct') {
        // Direct function call (existing functionality)
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
      } else {
        // Production path testing - use database triggers
        await handleProductionPathTest(selectedTemplate);
      }

      toast({
        title: 'Test Email Sent',
        description: `${selectedTemplate} email sent to ${recipientEmail} via ${testMode} path`,
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

  const handleProductionPathTest = async (templateName: string) => {
    // Get existing test data for realistic scenarios
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('organization_type', 'partner')
      .limit(1);

    const { data: trades } = await supabase
      .from('trades')
      .select('id, name')
      .limit(1);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_type', 'admin')
      .limit(1);

    const orgId = organizations?.[0]?.id;
    const tradeId = trades?.[0]?.id;
    const adminId = profiles?.[0]?.id;

    if (!orgId || !tradeId || !adminId) {
      throw new Error('Missing test data - ensure organizations, trades, and admin users exist');
    }

    switch (templateName) {
      case 'work_order_created':
        // Create a real work order to trigger email
        await supabase.from('work_orders').insert({
          work_order_number: `TEST-${Date.now()}`,
          title: 'Production Path Test - Work Order Created',
          description: 'Testing real production email path',
          organization_id: orgId,
          trade_id: tradeId,
          status: 'received',
          created_by: adminId,
          date_submitted: new Date().toISOString(),
          store_location: 'Test Location',
          street_address: '123 Test St',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
        });
        break;

      case 'work_order_assigned':
        // Create work order then assignment
        const { data: newWo } = await supabase.from('work_orders').insert({
          work_order_number: `TEST-${Date.now()}`,
          title: 'Production Path Test - Assignment',
          organization_id: orgId,
          trade_id: tradeId,
          status: 'received',
          created_by: adminId,
        }).select().single();

        if (newWo) {
          await supabase.from('work_order_assignments').insert({
            work_order_id: newWo.id,
            assigned_to: adminId,
            assigned_by: adminId,
            assignment_type: 'lead',
            notes: 'Production path test assignment',
          });
        }
        break;

      case 'report_submitted':
        // Create work order, assignment, then report
        const { data: reportWo } = await supabase.from('work_orders').insert({
          work_order_number: `TEST-${Date.now()}`,
          title: 'Production Path Test - Report Submission',
          description: 'Testing report submission email path',
          organization_id: orgId,
          trade_id: tradeId,
          status: 'assigned',
          created_by: adminId,
          date_submitted: new Date().toISOString(),
          store_location: 'Test Location',
          street_address: '123 Test St',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
        }).select().single();

        if (reportWo) {
          await supabase.from('work_order_reports').insert({
            work_order_id: reportWo.id,
            subcontractor_user_id: adminId,
            work_performed: 'Production path test work',
            hours_worked: 2.5,
            status: 'submitted',
          });
        }
        break;

      default:
        // For other templates, use RPC call
        await supabase.rpc('call_send_email_trigger', {
          template_name: templateName,
          record_id: `TEST-${Date.now()}`,
          record_type: 'test',
          context_data: { test_recipient: recipientEmail },
        });
    }
  };

  const sendAllTemplatesTest = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-all-emails', {
        body: { recipient_email: recipientEmail },
      });

      if (error) throw error;

      toast({
        title: 'All Templates Sent',
        description: `All 8 email templates sent to ${recipientEmail}`,
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Bulk Test Failed',
        description: error.message || 'Failed to send all templates',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200 h-5 text-[10px] px-1.5">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200 h-5 text-[10px] px-1.5">Failed</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 h-5 text-[10px] px-1.5">Sent</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 h-5 text-[10px] px-1.5">Pending</Badge>;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="chris.l.radcliff@gmail.com"
              />
            </div>

            <div>
              <Label htmlFor="testMode">Test Mode</Label>
              <Select value={testMode} onValueChange={(value: 'direct' | 'production') => setTestMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct Function Call</SelectItem>
                  <SelectItem value="production">Production Path (DB Triggers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleSendTestEmail}
              disabled={isLoading || !selectedTemplate || !recipientEmail}
              className="h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Test Email...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Send Single Template
                </>
              )}
            </Button>

            <Button 
              onClick={sendAllTemplatesTest}
              disabled={isLoading || !recipientEmail}
              variant="outline"
              className="h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending All Templates...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Send All 8 Templates
                </>
              )}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-2">
            <p><strong>Real-World Testing:</strong> Default recipient is chris.l.radcliff@gmail.com for comprehensive production testing.</p>
            <p><strong>Direct Mode:</strong> Calls send-email function directly with mock data.</p>
            <p><strong>Production Mode:</strong> Creates actual database records to trigger emails via real production paths.</p>
            <p><strong>Bulk Test:</strong> Sends all 8 email templates using the test-all-emails function.</p>
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
