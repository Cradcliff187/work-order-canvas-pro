
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailStatistics {
  todayTotal: number;
  todaySuccessful: number;
  successRate: number;
  averageDeliveryTime: number | null;
  mostRecentFailureReason: string | null;
  failedEmails: Array<{
    id: string;
    recipient_email: string;
    template_used: string | null;
    sent_at: string;
    error_message: string | null;
  }>;
}

interface CriticalAlerts {
  noRecipientSettings: boolean;
  noRecentEmails: boolean;
  highFailureRate: boolean;
  missingTemplates: string[];
}

export const useEmailStatistics = () => {
  const [statistics, setStatistics] = useState<EmailStatistics>({
    todayTotal: 0,
    todaySuccessful: 0,
    successRate: 0,
    averageDeliveryTime: null,
    mostRecentFailureReason: null,
    failedEmails: []
  });

  const [alerts, setAlerts] = useState<CriticalAlerts>({
    noRecipientSettings: false,
    noRecentEmails: false,
    highFailureRate: false,
    missingTemplates: []
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchEmailStatistics = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's email statistics with id field included
      const { data: todayEmails, error: todayError } = await supabase
        .from('email_logs')
        .select('id, status, sent_at, delivered_at, error_message, recipient_email, template_used')
        .gte('sent_at', today);

      if (todayError) throw todayError;

      const todayTotal = todayEmails?.length || 0;
      const todaySuccessful = todayEmails?.filter(email => 
        ['sent', 'delivered'].includes(email.status.toLowerCase())
      ).length || 0;

      // Calculate average delivery time for delivered emails
      const deliveredEmails = todayEmails?.filter(email => 
        email.status === 'delivered' && email.delivered_at
      ) || [];
      
      let averageDeliveryTime = null;
      if (deliveredEmails.length > 0) {
        const totalDeliveryTime = deliveredEmails.reduce((sum, email) => {
          const sentTime = new Date(email.sent_at).getTime();
          const deliveredTime = new Date(email.delivered_at!).getTime();
          return sum + (deliveredTime - sentTime);
        }, 0);
        averageDeliveryTime = totalDeliveryTime / deliveredEmails.length / 1000; // Convert to seconds
      }

      // Get most recent failure
      const failedEmails = todayEmails?.filter(email => 
        email.error_message && !['sent', 'delivered'].includes(email.status.toLowerCase())
      ) || [];
      
      const mostRecentFailure = failedEmails.length > 0 
        ? failedEmails.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
        : null;

      setStatistics({
        todayTotal,
        todaySuccessful,
        successRate: todayTotal > 0 ? (todaySuccessful / todayTotal) * 100 : 0,
        averageDeliveryTime,
        mostRecentFailureReason: mostRecentFailure?.error_message || null,
        failedEmails: failedEmails.map(email => ({
          id: email.id || '',
          recipient_email: email.recipient_email,
          template_used: email.template_used,
          sent_at: email.sent_at,
          error_message: email.error_message
        }))
      });

    } catch (error) {
      console.error('Failed to fetch email statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkCriticalConfiguration = useCallback(async () => {
    try {
      // Check recipient settings
      const { data: recipientSettings, error: recipientError } = await supabase
        .from('email_recipient_settings')
        .select('id')
        .eq('receives_email', true);

      if (recipientError) throw recipientError;

      // Check recent email activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentEmails, error: recentError } = await supabase
        .from('email_logs')
        .select('id')
        .gte('sent_at', sevenDaysAgo);

      if (recentError) throw recentError;

      // Check for expected templates
      const expectedTemplates = [
        'work_order_created',
        'work_order_assigned',
        'work_order_completed',
        'report_submitted',
        'report_reviewed',
        'welcome_email'
      ];

      const { data: existingTemplates, error: templatesError } = await supabase
        .from('email_templates')
        .select('template_name')
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      const existingTemplateNames = existingTemplates?.map(t => t.template_name) || [];
      const missingTemplates = expectedTemplates.filter(template => 
        !existingTemplateNames.includes(template)
      );

      // Calculate failure rate for alerts
      const { data: last100Emails, error: failureError } = await supabase
        .from('email_logs')
        .select('status')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (failureError) throw failureError;

      const failureRate = last100Emails?.length > 0 
        ? (last100Emails.filter(email => 
            !['sent', 'delivered'].includes(email.status.toLowerCase())
          ).length / last100Emails.length) * 100
        : 0;

      setAlerts({
        noRecipientSettings: (recipientSettings?.length || 0) === 0,
        noRecentEmails: (recentEmails?.length || 0) === 0,
        highFailureRate: failureRate > 20,
        missingTemplates
      });

    } catch (error) {
      console.error('Failed to check critical configuration:', error);
    }
  }, []);

  useEffect(() => {
    fetchEmailStatistics();
    checkCriticalConfiguration();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchEmailStatistics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchEmailStatistics, checkCriticalConfiguration]);

  return {
    statistics,
    alerts,
    isLoading,
    refreshData: () => {
      fetchEmailStatistics();
      checkCriticalConfiguration();
    }
  };
};
