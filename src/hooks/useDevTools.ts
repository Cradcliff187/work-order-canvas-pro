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

export const useDevTools = () => {
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
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

  const runSeedScript = async (): Promise<void> => {
    setLoading(true);
    
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      console.log('🌱 Starting database seeding using secure function...');
      toast({
        title: "Seeding Started",
        description: "Creating comprehensive test data...",
        variant: "default",
      });

      // Call the secure database function that bypasses RLS
      const { data, error } = await supabase.rpc('seed_test_data');
      
      if (error) {
        throw new Error(error.message);
      }

      const result = data as { success: boolean; error?: string; details?: any };
      if (!result?.success) {
        throw new Error(result?.error || 'Seeding failed');
      }

      console.log('🎉 Database seeding completed successfully!', result);
      
      // Refresh counts to show updated data
      await fetchCounts();

      toast({
        title: "Database Seeded Successfully!",
        description: `All test data created successfully!`,
        variant: "default",
      });

    } catch (error) {
      console.error('❌ Seeding error:', error);
      toast({
        title: "Seeding Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const createTestUsers = async () => {
    setLoading(true);
    try {
      console.log('👥 Creating test users...');
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('create-test-users', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create test users');
      }

      console.log('✅ Test users created successfully!', data);
      
      const { results, summary } = data;
      const createdUsers = results.filter((r: any) => r.success);
      const failedUsers = results.filter((r: any) => !r.success);

      toast({
        title: "Test Users Created!",
        description: `${summary.created} users created successfully. Password: ${summary.password}`,
      });

      // Refresh counts to show updated data
      await fetchCounts();

      return data;
    } catch (error) {
      console.error('❌ Failed to create test users:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create test users",
        variant: "destructive",
      });
      throw error;
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

  return {
    loading,
    setupLoading,
    counts,
    setupResult,
    fetchCounts,
    runSeedScript,
    clearTestData,
    createTestUsers,
    setupCompleteEnvironment,
    quickLogin,
  };
};