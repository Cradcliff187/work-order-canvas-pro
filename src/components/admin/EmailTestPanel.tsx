
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';

export const EmailTestPanel = () => {
  const { toast } = useToast();
  const { templates, isLoading } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recordId, setRecordId] = useState('');
  const [recordType, setRecordType] = useState('');
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [manualUuid, setManualUuid] = useState('');

  const recordTypes = [
    { value: 'work_order', label: 'Work Order' },
    { value: 'work_order_assignment', label: 'Work Order Assignment' },
    { value: 'work_order_report', label: 'Work Order Report' },
    { value: 'user', label: 'User Account' },
  ];

  // UUID validation regex
  const isValidUuid = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // New improved useEffect to replace the existing one
  useEffect(() => {
    if (!recordType) {
      setRecords([]);
      return;
    }
    
    setLoadingRecords(true);
    setRecordId(''); // Clear selection when type changes
    
    const fetchRecords = async () => {
      try {
        let query;
        
        switch (recordType) {
          case 'work_order':
            query = supabase
              .from('work_orders')
              .select(`
                id, 
                work_order_number, 
                street_address, 
                location_address, 
                location_street_address,
                organizations!inner(name, address)
              `)
              .order('created_at', { ascending: false })
              .limit(20);
            break;
            
          case 'work_order_assignment':
            query = supabase
              .from('work_order_assignments')
              .select(`
                id,
                work_orders!inner(work_order_number),
                profiles!inner(first_name, last_name)
              `)
              .order('created_at', { ascending: false })
              .limit(20);
            break;
            
          case 'work_order_report':
            query = supabase
              .from('work_order_reports')
              .select(`
                id,
                work_orders!inner(work_order_number),
                profiles!inner(first_name)
              `)
              .order('created_at', { ascending: false })
              .limit(20);
            break;
            
          case 'user':
            query = supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .order('created_at', { ascending: false })
              .limit(20);
            break;
        }
        
        if (query) {
          const { data, error } = await query;
          if (!error && data) {
            setRecords(data);
          }
        }
      } catch (error) {
        console.error('Error fetching records:', error);
        toast({
          title: 'Error',
          description: 'Failed to load records',
          variant: 'destructive',
        });
      } finally {
        setLoadingRecords(false);
      }
    };
    
    if (!useManualEntry) {
      fetchRecords();
    }
  }, [recordType, useManualEntry, toast]);

  const getRecordLabel = (record: any, type: string): string => {
    switch (type) {
      case 'work_order':
        const address = record.street_address || record.location_address || record.location_street_address || 'No address';
        return `${record.work_order_number || 'No Number'} - ${address}`;
      
      case 'work_order_assignment':
        const workOrder = record.work_orders;
        const assignee = record.profiles;
        return `${workOrder?.work_order_number || 'Unknown'} - ${assignee?.first_name} ${assignee?.last_name}`;
      
      case 'work_order_report':
        const reportWorkOrder = record.work_orders;
        const subcontractor = record.profiles;
        return `${reportWorkOrder?.work_order_number || 'Unknown'} - Report by ${subcontractor?.first_name}`;
      
      case 'user':
        return `${record.first_name} ${record.last_name} (${record.email})`;
      
      default:
        return record.id;
    }
  };

  // Handle manual entry toggle
  const handleManualEntryToggle = (checked: boolean) => {
    setUseManualEntry(checked);
    setRecordId('');
    setManualUuid('');
  };

  // Handle manual UUID input
  const handleManualUuidChange = (value: string) => {
    setManualUuid(value);
    setRecordId(value);
  };

  const getCurrentRecordId = () => {
    return useManualEntry ? manualUuid : recordId;
  };

  const isValidCurrentRecord = () => {
    const currentId = getCurrentRecordId();
    return currentId && (useManualEntry ? isValidUuid(currentId) : true);
  };

  const handleTestEmail = async () => {
    if (!selectedTemplate || !isValidCurrentRecord() || !recordType) {
      toast({
        title: 'Error',
        description: useManualEntry && manualUuid && !isValidUuid(manualUuid) 
          ? 'Please enter a valid UUID format'
          : 'Please select a template, record type, and enter a valid record ID',
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
          record_id: getCurrentRecordId(),
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
    if (!selectedTemplate || !isValidCurrentRecord() || !recordType) {
      toast({
        title: 'Error',
        description: useManualEntry && manualUuid && !isValidUuid(manualUuid)
          ? 'Please enter a valid UUID format'
          : 'Please select a template, record type, and enter a valid record ID',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingEmail(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: selectedTemplate,
          record_id: getCurrentRecordId(),
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        {recordType && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="manual-entry"
                checked={useManualEntry}
                onCheckedChange={handleManualEntryToggle}
              />
              <Label htmlFor="manual-entry">Enter UUID manually</Label>
            </div>

            {useManualEntry ? (
              <div>
                <Label htmlFor="manualUuid">Record UUID</Label>
                <Input
                  id="manualUuid"
                  value={manualUuid}
                  onChange={(e) => handleManualUuidChange(e.target.value)}
                  placeholder="Enter UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
                  className={manualUuid && !isValidUuid(manualUuid) ? 'border-red-500' : ''}
                />
                {manualUuid && !isValidUuid(manualUuid) && (
                  <p className="text-sm text-red-500 mt-1">Please enter a valid UUID format</p>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="recordId">Select Record</Label>
                <Select value={recordId} onValueChange={setRecordId} disabled={!recordType}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !recordType 
                        ? "Select record type first" 
                        : loadingRecords 
                          ? "Loading records..." 
                          : "Select a record (20 most recent)"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 overflow-y-auto">
                    {loadingRecords ? (
                      <SelectItem value="" disabled>Loading records...</SelectItem>
                    ) : records.length === 0 ? (
                      <SelectItem value="" disabled>No records found</SelectItem>
                    ) : (
                      records.map((record: any) => (
                        <SelectItem key={record.id} value={record.id}>
                          {getRecordLabel(record, recordType)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

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
            disabled={isTestingEmail || !isValidCurrentRecord()}
            variant="outline"
          >
            {isTestingEmail ? 'Testing...' : 'Test Email (Preview)'}
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isTestingEmail || !isValidCurrentRecord()}
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
          <p className="mt-2"><strong>Note:</strong> The function automatically determines recipient emails based on the record type and template. Shows 20 most recent records or enter UUID manually.</p>
        </div>
      </CardContent>
    </Card>
  );
};
