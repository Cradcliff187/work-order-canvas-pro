import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TableCounts {
  // Core business tables
  organizations: number;
  profiles: number;
  work_orders: number;
  work_order_reports: number;
  work_order_assignments: number;
  work_order_attachments: number;
  invoices: number;
  invoice_work_orders: number;
  invoice_attachments: number;
  receipts: number;
  receipt_work_orders: number;
  employee_reports: number;
  partner_locations: number;
  user_organizations: number;
  
  // Reference data tables
  trades: number;
  email_templates: number;
  
  // Operational tables
  audit_logs: number;
  email_logs: number;
  email_settings: number;
  system_settings: number;
}

interface SetupResult {
  success: boolean;
  message: string;
  data?: {
    users: number;
    organizations: number;
    workOrders: number;
    assignments: number;
    userCredentials: Array<{
      email: string;
      password: string;
      type: string;
    }>;
  };
  error?: string;
}

interface ClearTestDataResponse {
  success: boolean;
  message: string;
  deleted_counts?: Record<string, number>;
  error?: string;
  test_user_count?: number;
  test_org_count?: number;
  test_work_order_count?: number;
}

// Email statistics interface for tracking Supabase Auth email communications
interface EmailStats {
  total_emails: number;
  emails_today: number;
  emails_delivered: number;
  emails_failed: number;
  service_status: 'active' | 'unknown'; // Supabase Auth service status
}

export const useDevTools = () => {
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [authResult, setAuthResult] = useState<any>(null);
  const [sqlResult, setSqlResult] = useState<any>(null);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const [
        // Core business tables
        organizations,
        profiles,
        workOrders,
        reports,
        assignments,
        attachments,
        invoices,
        invoiceOrders,
        invoiceAttachments,
        receipts,
        receiptOrders,
        employeeReports,
        partnerLocations,
        userOrgs,
        
        // Reference data tables
        trades,
        templates,
        
        // Operational tables
        auditLogs,
        emailLogs,
        emailSettings,
        systemSettings
      ] = await Promise.all([
        // Core business tables
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_reports').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_attachments').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('invoice_work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('invoice_attachments').select('*', { count: 'exact', head: true }),
        supabase.from('receipts').select('*', { count: 'exact', head: true }),
        supabase.from('receipt_work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('employee_reports').select('*', { count: 'exact', head: true }),
        supabase.from('partner_locations').select('*', { count: 'exact', head: true }),
        supabase.from('user_organizations').select('*', { count: 'exact', head: true }),
        
        // Reference data tables
        supabase.from('trades').select('*', { count: 'exact', head: true }),
        supabase.from('email_templates').select('*', { count: 'exact', head: true }),
        
        // Operational tables
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }),
        supabase.from('email_settings').select('*', { count: 'exact', head: true }),
        supabase.from('system_settings').select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        // Core business tables
        organizations: organizations.count || 0,
        profiles: profiles.count || 0,
        work_orders: workOrders.count || 0,
        work_order_reports: reports.count || 0,
        work_order_assignments: assignments.count || 0,
        work_order_attachments: attachments.count || 0,
        invoices: invoices.count || 0,
        invoice_work_orders: invoiceOrders.count || 0,
        invoice_attachments: invoiceAttachments.count || 0,
        receipts: receipts.count || 0,
        receipt_work_orders: receiptOrders.count || 0,
        employee_reports: employeeReports.count || 0,
        partner_locations: partnerLocations.count || 0,
        user_organizations: userOrgs.count || 0,
        
        // Reference data tables
        trades: trades.count || 0,
        email_templates: templates.count || 0,
        
        // Operational tables
        audit_logs: auditLogs.count || 0,
        email_logs: emailLogs.count || 0,
        email_settings: emailSettings.count || 0,
        system_settings: systemSettings.count || 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch table counts",
        variant: "destructive",
      });
    }
  };


  const clearTestData = async () => {
    setLoading(true);
    try {
      console.log('🧹 Starting test data cleanup using secure database function...');
      
      // Call the secure database function that bypasses RLS
      const { data, error } = await supabase.rpc('clear_test_data');
      
      if (error) {
        throw new Error(error.message);
      }

      const result = data as unknown as ClearTestDataResponse;
      if (!result?.success) {
        throw new Error(result?.error || 'Cleanup failed');
      }

      console.log('✅ Test data cleanup completed successfully!', result);
      
      const summary = Object.entries(result.deleted_counts || {})
        .map(([table, count]) => `${table}: ${count}`)
        .join(', ');
      
      toast({
        title: "Success",
        description: `Test data cleared successfully. Deleted: ${summary}`,
      });
      
      // Refresh counts after successful cleanup
      await fetchCounts();
      
    } catch (error: any) {
      console.error('❌ Failed to clear test data:', error);
      toast({
        title: "Error",
        description: `Failed to clear test data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const setupCompleteEnvironment = async () => {
    try {
      setSetupLoading(true);
      setSetupResult(null);
      
      const { data, error } = await supabase.functions.invoke('setup-test-environment', {
        body: {}
      });

      if (error) {
        console.error('Setup environment error:', error);
        const errorResult = {
          success: false,
          message: 'Failed to setup test environment',
          error: error.message
        };
        setSetupResult(errorResult);
        toast({
          title: "Setup Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        setSetupResult(data);
        toast({
          title: "Environment Setup Complete!",
          description: `Created ${data.data?.users || 0} users, ${data.data?.organizations || 0} organizations, and ${data.data?.workOrders || 0} work orders`,
          variant: "default",
        });
        
        // Refresh counts
        await fetchCounts();
      } else {
        const errorResult = {
          success: false,
          message: data?.error || 'Unknown error occurred',
          error: data?.error
        };
        setSetupResult(errorResult);
        toast({
          title: "Setup Failed", 
          description: data?.error || 'Unknown error occurred',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Setup environment error:', error);
      const errorResult = {
        success: false,
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setSetupResult(errorResult);
      toast({
        title: "Setup Failed",
        description: "An unexpected error occurred during setup",
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    try {
      setLoading(true);
      
      // Sign out first to ensure clean state
      await supabase.auth.signOut();
      
      // Sign in with the test user credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'TestPass123!' // This matches the Edge Function password
      });

      if (error) {
        console.error('Quick login error:', error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.user) {
        toast({
          title: "Quick Login Successful",
          description: `Logged in as ${email}`,
          variant: "default",
        });
        
        // Reload the page to refresh the app state
        window.location.reload();
      }
    } catch (error) {
      console.error('Quick login error:', error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshUsers = async () => {
    try {
      setRefreshLoading(true);
      toast({
        title: "Refreshing Users",
        description: "Fetching latest user data...",
      });
      
      // This will trigger a re-fetch of users in the DevTools component
      return true;
    } catch (error) {
      console.error('Force refresh users error:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh user data",
        variant: "destructive",
      });
      return false;
    } finally {
      setRefreshLoading(false);
    }
  };

  const setupSqlData = async () => {
    try {
      setSqlLoading(true);
      setSqlResult(null);
      
      console.log('🗃️ Running SQL data setup...');
      
      const { data, error } = await supabase.rpc('complete_test_environment_setup');
      
      if (error) {
        throw new Error(error.message);
      }

      setSqlResult(data);
      
      if ((data as any)?.success) {
        toast({
          title: "Setup Complete!",
          description: `Successfully created test environment`,
          variant: "default",
        });
        
        // Refresh counts
        await fetchCounts();
      } else {
        toast({
          title: "Setup Failed", 
          description: (data as any)?.error || 'Unknown error occurred',
          variant: "destructive",
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('SQL setup error:', error);
      const errorResult = {
        success: false,
        message: 'SQL setup failed',
        error: error.message
      };
      setSqlResult(errorResult);
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
      return errorResult;
    } finally {
      setSqlLoading(false);
    }
  };

  const createAuthUsers = async () => {
    try {
      setAuthLoading(true);
      setAuthResult(null);
      
      console.log('🔐 Creating auth users...');
      
      const { data, error } = await supabase.functions.invoke('create-test-auth-users', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      setAuthResult(data);
      
      if (data?.success) {
        toast({
          title: "Auth Users Created!",
          description: `Successfully created ${data.data?.success_count || 0} auth users`,
          variant: "default",
        });
        
        // Refresh counts after successful auth creation
        await fetchCounts();
      } else {
        toast({
          title: "Auth Creation Failed", 
          description: data?.error || 'Unknown error occurred',
          variant: "destructive",
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('Auth creation error:', error);
      const errorResult = {
        success: false,
        message: 'Auth user creation failed',
        error: error.message
      };
      setAuthResult(errorResult);
      toast({
        title: "Auth Creation Failed",
        description: error.message,
        variant: "destructive",
      });
      return errorResult;
    } finally {
      setAuthLoading(false);
    }
  };

  const fixUserOrganizations = async () => {
    try {
      setLoading(true);
      
      console.log('🔧 Fixing user-organization relationships...');
      
      const { data, error } = await supabase.rpc('fix_existing_test_user_organizations');
      
      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.success) {
        toast({
          title: "User Organizations Fixed!",
          description: `Fixed ${(data as any).user_organizations_fixed} user-organization relationships`,
          variant: "default",
        });
        
        // Refresh counts
        await fetchCounts();
      } else {
        toast({
          title: "Fix Failed", 
          description: (data as any)?.error || 'Unknown error occurred',
          variant: "destructive",
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('Fix user organizations error:', error);
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyTestEnvironment = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Verifying test environment status...');
      
      const { data, error } = await supabase.rpc('verify_test_environment_status');
      
      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.success) {
        const status = (data as any).environment_status;
        toast({
          title: "Environment Verified",
          description: `${status.test_users_count} users, ${status.test_organizations_count} orgs, ${status.user_organization_relationships} relationships`,
          variant: status.ready_for_testing ? "default" : "destructive",
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('Verify environment error:', error);
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [totalCount, todayCount, deliveredCount, failedCount] = await Promise.all([
        supabase.from('email_logs').select('*', { count: 'exact', head: true }),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).gte('sent_at', today),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).in('status', ['failed', 'bounced'])
      ]);

      // Try to check if edge function is accessible
      let serviceStatus: 'active' | 'unknown' = 'unknown';
      try {
        await supabase.functions.invoke('create-admin-user', { body: { test: true } });
        serviceStatus = 'active';
      } catch {
        serviceStatus = 'unknown';
      }

      setEmailStats({
        total_emails: totalCount.count || 0,
        emails_today: todayCount.count || 0,
        emails_delivered: deliveredCount.count || 0,
        emails_failed: failedCount.count || 0,
        service_status: serviceStatus
      });
    } catch (error) {
      console.error('Error fetching email stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email statistics",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    setupLoading,
    refreshLoading,
    authLoading,
    sqlLoading,
    counts,
    emailStats,
    setupResult,
    authResult,
    sqlResult,
    fetchCounts,
    fetchEmailStats,
    clearTestData,
    setupCompleteEnvironment,
    setupSqlData,
    createAuthUsers,
    fixUserOrganizations,
    verifyTestEnvironment,
    quickLogin,
    forceRefreshUsers,
  };
};