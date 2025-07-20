
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export const useEmailSystemTest = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const testEmailSystem = async () => {
    setIsTestRunning(true);
    const timestamp = new Date().toISOString();

    try {
      // Test the send-email function with test mode
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          template_name: 'work_order_created',
          record_id: 'test-id',
          record_type: 'work_order',
          test_mode: true,
          recipient_email: 'test@workorderpro.com'
        }
      });

      if (error) {
        const result: TestResult = {
          success: false,
          message: `Email system test failed: ${error.message}`,
          details: error,
          timestamp
        };
        
        setLastTestResult(result);
        toast({
          title: "Test Failed",
          description: result.message,
          variant: "destructive"
        });
        
        return result;
      }

      const result: TestResult = {
        success: true,
        message: 'Email system test completed successfully',
        details: data,
        timestamp
      };

      setLastTestResult(result);
      toast({
        title: "Test Successful",
        description: "Email system is working correctly",
      });

      return result;

    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: `Email system test error: ${error.message}`,
        details: error,
        timestamp
      };

      setLastTestResult(result);
      toast({
        title: "Test Error",
        description: result.message,
        variant: "destructive"
      });

      return result;
    } finally {
      setIsTestRunning(false);
    }
  };

  const createTestWorkOrder = async () => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Get a test organization
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('organization_type', 'partner')
        .limit(1)
        .single();

      if (!org) throw new Error('No test organization found');

      // Get a test trade
      const { data: trade } = await supabase
        .from('trades')
        .select('id')
        .limit(1)
        .single();

      if (!trade) throw new Error('No test trade found');

      // Create test work order
      const { data: workOrder, error } = await supabase
        .from('work_orders')
        .insert({
          title: 'Email System Test Work Order',
          description: 'This is a test work order created to verify email triggers',
          organization_id: org.id,
          trade_id: trade.id,
          created_by: profile.id,
          store_location: 'Test Location',
          street_address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip_code: '12345',
          status: 'received'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Test Work Order Created",
        description: `Work order ${workOrder.work_order_number} created to test email triggers`,
      });

      return { success: true, workOrder };

    } catch (error: any) {
      toast({
        title: "Failed to Create Test Work Order",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  return {
    testEmailSystem,
    createTestWorkOrder,
    isTestRunning,
    lastTestResult
  };
};
