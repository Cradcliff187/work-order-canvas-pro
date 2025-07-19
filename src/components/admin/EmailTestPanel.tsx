import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

export const EmailTestPanel = () => {
  const { toast } = useToast();
  const { templates, isLoading } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recordId, setRecordId] = useState('');
  const [recordType, setRecordType] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);

  const recordTypes = [
    { value: 'work_order', label: 'Work Order' },
    { value: 'work_order_assignment', label: 'Work Order Assignment' },
    { value: 'work_order_report', label: 'Work Order Report' },
    { value: 'user', label: 'User Account' },
  ];

  const handleTestEmail = async () => {
    if (!selectedTemplate || !recordId || !recordType) {
      toast({
        title: 'Error',
        description: 'Please select a template, record type, and enter a record ID',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingEmail(true);
    setEmailResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: selectedTemplate,
          record_id: recordId,
          record_type: recordType,
          recipient_email: testEmail || undefined,
          test_mode: true
        }
      });

      if (error) throw error;

      setEmailResult(data);
      toast({
        title: 'Success',
        description: 'Email test completed successfully',
      });
    } catch (error: any) {
      console.error('Email test error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to test email',
        variant: 'destructive',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedTemplate || !recordId || !recordType) {
      toast({
        title: 'Error',
        description: 'Please select a template, record type, and enter a record ID',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: selectedTemplate,
          record_id: recordId,
          record_type: recordType,
          recipient_email: testEmail || undefined,
          test_mode: false
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email sent successfully',
      });
    } catch (error: any) {
      console.error('Email send error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email System Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading email templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="template">Email Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.template_name}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recordType">Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue placeholder="Select record type" />
              </SelectTrigger>
              <SelectContent>
                {recordTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recordId">Record ID</Label>
            <Input
              id="recordId"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              placeholder="Enter record UUID"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="testEmail">Test Email (optional)</Label>
          <Input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Override recipient email for testing"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleTestEmail} 
            disabled={isTestingEmail}
            variant="outline"
          >
            {isTestingEmail ? 'Testing...' : 'Test Email (Preview)'}
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isTestingEmail}
          >
            {isTestingEmail ? 'Sending...' : 'Send Email'}
          </Button>
        </div>

        {emailResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Test Result:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Recipient:</strong> {emailResult.recipient}</p>
              <p><strong>Subject:</strong> {emailResult.subject}</p>
              {emailResult.html_preview && (
                <div>
                  <strong>HTML Preview:</strong>
                  <Textarea 
                    value={emailResult.html_preview} 
                    readOnly 
                    rows={4}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Record Type Examples:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>work_order:</strong> For work order creation/completion notifications</li>
            <li><strong>work_order_assignment:</strong> For assignment notifications</li>
            <li><strong>work_order_report:</strong> For report submission/review notifications</li>
            <li><strong>user:</strong> For user registration/welcome notifications</li>
          </ul>
          <p className="mt-2"><strong>Note:</strong> The function automatically determines recipient emails based on the record type and template.</p>
        </div>
      </CardContent>
    </Card>
  );
};
