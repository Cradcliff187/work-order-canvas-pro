
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailHealthMetrics {
  totalEmailsLast7Days: number;
  successfulEmailsLast7Days: number;
  failedEmailsLast7Days: number;
  successRate: number;
  lastEmailSent: string | null;
  daysSinceLastEmail: number;
  healthScore: number;
  alertLevel: 'critical' | 'warning' | 'healthy';
  alertMessage: string;
}

interface TriggerEventMetrics {
  workOrdersLast7Days: number;
  reportsLast7Days: number;
  totalTriggerEvents: number;
}

export const useEmailHealth = () => {
  const [emailMetrics, setEmailMetrics] = useState<EmailHealthMetrics>({
    totalEmailsLast7Days: 0,
    successfulEmailsLast7Days: 0,
    failedEmailsLast7Days: 0,
    successRate: 0,
    lastEmailSent: null,
    daysSinceLastEmail: 0,
    healthScore: 0,
    alertLevel: 'critical',
    alertMessage: 'System health unknown'
  });

  const [triggerMetrics, setTriggerMetrics] = useState<TriggerEventMetrics>({
    workOrdersLast7Days: 0,
    reportsLast7Days: 0,
    totalTriggerEvents: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  const checkEmailHealth = async () => {
    setIsLoading(true);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get email statistics for last 7 days
      const { data: emailLogs, error: emailError } = await supabase
        .from('email_logs')
        .select('status, sent_at')
        .gte('sent_at', sevenDaysAgo)
        .order('sent_at', { ascending: false });

      if (emailError) throw emailError;

      // Get all email logs to find last sent email
      const { data: allEmails, error: allEmailsError } = await supabase
        .from('email_logs')
        .select('sent_at')
        .order('sent_at', { ascending: false })
        .limit(1);

      if (allEmailsError) throw allEmailsError;

      // Get trigger event statistics
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('id')
        .gte('created_at', sevenDaysAgo);

      const { data: reports, error: reportsError } = await supabase
        .from('work_order_reports')
        .select('id')
        .gte('submitted_at', sevenDaysAgo);

      if (woError || reportsError) {
        console.error('Error fetching trigger events:', woError || reportsError);
      }

      // Calculate metrics
      const totalEmails = emailLogs?.length || 0;
      const successfulEmails = emailLogs?.filter(log => 
        ['sent', 'delivered'].includes(log.status.toLowerCase())
      ).length || 0;
      const failedEmails = totalEmails - successfulEmails;
      const successRate = totalEmails > 0 ? (successfulEmails / totalEmails) * 100 : 0;

      const lastEmailSent = allEmails?.[0]?.sent_at || null;
      const daysSinceLastEmail = lastEmailSent 
        ? Math.floor((Date.now() - new Date(lastEmailSent).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      // Calculate health score (0-100)
      let healthScore = 0;
      
      // Email delivery factor (40% weight)
      if (totalEmails > 0) {
        healthScore += (successRate / 100) * 40;
      }
      
      // Configuration factor (30% weight)
      // This will be enhanced with template/recipient checks
      healthScore += 30; // Assume configured for now
      
      // System availability factor (30% weight)
      if (daysSinceLastEmail <= 1) {
        healthScore += 30;
      } else if (daysSinceLastEmail <= 7) {
        healthScore += 15;
      }

      // Determine alert level and message
      let alertLevel: 'critical' | 'warning' | 'healthy' = 'healthy';
      let alertMessage = 'Email system is operating normally';

      if (daysSinceLastEmail >= 7 || (totalEmails > 0 && successRate === 0)) {
        alertLevel = 'critical';
        alertMessage = daysSinceLastEmail >= 7 
          ? `No emails sent in ${daysSinceLastEmail} days - System may be offline`
          : 'All emails failing - Check SMTP configuration';
      } else if (successRate < 90 || daysSinceLastEmail >= 1) {
        alertLevel = 'warning';
        alertMessage = successRate < 90 
          ? `Email success rate is ${successRate.toFixed(1)}% - Check for issues`
          : `Last email sent ${daysSinceLastEmail} day${daysSinceLastEmail !== 1 ? 's' : ''} ago`;
      }

      setEmailMetrics({
        totalEmailsLast7Days: totalEmails,
        successfulEmailsLast7Days: successfulEmails,
        failedEmailsLast7Days: failedEmails,
        successRate,
        lastEmailSent,
        daysSinceLastEmail: daysSinceLastEmail === Infinity ? 0 : daysSinceLastEmail,
        healthScore: Math.round(healthScore),
        alertLevel,
        alertMessage
      });

      setTriggerMetrics({
        workOrdersLast7Days: workOrders?.length || 0,
        reportsLast7Days: reports?.length || 0,
        totalTriggerEvents: (workOrders?.length || 0) + (reports?.length || 0)
      });

    } catch (error: any) {
      console.error('Email health check failed:', error);
      setEmailMetrics(prev => ({
        ...prev,
        alertLevel: 'critical',
        alertMessage: 'Health check failed - ' + error.message
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEmailHealth();
  }, []);

  return {
    emailMetrics,
    triggerMetrics,
    isLoading,
    refreshHealth: checkEmailHealth
  };
};
