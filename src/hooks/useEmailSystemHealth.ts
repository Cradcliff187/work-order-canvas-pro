
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EmailHealthData {
  smtp_status: string;
  emails_sent_today: number;
  successful_deliveries: number;
  failed_deliveries: number;
  recent_errors: Array<{
    error_type: string;
    error_message: string;
    created_at: string;
  }>;
}

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export const useEmailSystemHealth = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);

  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['email-system-health'],
    queryFn: async (): Promise<EmailHealthData> => {
      console.log('Fetching email system health...');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's email logs
      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('status, sent_at, error_message')
        .gte('sent_at', today + 'T00:00:00.000Z')
        .order('sent_at', { ascending: false });

      const emailsSentToday = emailLogs?.length || 0;
      const successfulDeliveries = emailLogs?.filter(log => 
        ['sent', 'delivered'].includes(log.status)
      ).length || 0;
      const failedDeliveries = emailLogs?.filter(log => 
        ['failed', 'bounced'].includes(log.status)
      ).length || 0;

      // Get recent errors (last 5)
      const recentErrors = emailLogs?.filter(log => log.error_message)
        .slice(0, 5)
        .map(log => ({
          error_type: log.status,
          error_message: log.error_message || 'Unknown error',
          created_at: log.sent_at
        })) || [];

      // Determine SMTP status based on recent activity
      let smtp_status = 'healthy';
      if (failedDeliveries > 0 && successfulDeliveries === 0) {
        smtp_status = 'critical';
      } else if (failedDeliveries > successfulDeliveries) {
        smtp_status = 'warning';
      }

      return {
        smtp_status,
        emails_sent_today: emailsSentToday,
        successful_deliveries: successfulDeliveries,
        failed_deliveries: failedDeliveries,
        recent_errors: recentErrors,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const testEmailSystem = async () => {
    setIsTestRunning(true);
    try {
      const response = await fetch('/functions/v1/simple-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Email System Test',
          text: 'This is a test email from the admin dashboard.'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        const testResult: TestResult = {
          success: true,
          message: 'Test email sent successfully',
          timestamp: new Date().toISOString()
        };
        setLastTestResult(testResult);
        toast({
          title: "Test Successful",
          description: "Email system is working correctly",
        });
      } else {
        throw new Error(result.error || 'Email test failed');
      }
    } catch (error: any) {
      const testResult: TestResult = {
        success: false,
        message: error.message || 'Email test failed',
        timestamp: new Date().toISOString()
      };
      setLastTestResult(testResult);
      toast({
        title: "Test Failed",
        description: error.message || 'Email system test failed',
        variant: "destructive",
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const createTestWorkOrder = async () => {
    setIsTestRunning(true);
    try {
      // This would create a test work order to trigger email notifications
      toast({
        title: "Feature Not Implemented",
        description: "Test work order creation coming soon",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || 'Test work order creation failed',
        variant: "destructive",
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const refreshHealth = async () => {
    await refetch();
  };

  return {
    healthData,
    isLoading,
    testEmailSystem,
    createTestWorkOrder,
    refreshHealth,
    isTestRunning,
    lastTestResult,
  };
};
