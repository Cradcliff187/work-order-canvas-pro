import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TableCounts {
  organizations: number;
  profiles: number;
  trades: number;
  work_orders: number;
  work_order_reports: number;
  work_order_attachments: number;
  email_templates: number;
  user_organizations: number;
  work_order_assignments: number;
  invoices: number;
  invoice_work_orders: number;
  receipts: number;
  employee_reports: number;
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

const TEST_EMAILS = [
  'admin@workorderpro.com',
  'admin2@workorderpro.com',
  'partner1@abc.com',
  'partner2@xyz.com',
  'partner3@premium.com',
  'plumber@trade.com',
  'electrician@trade.com',
  'hvac@trade.com',
  'carpenter@trade.com',
  'painter@trade.com',
  'maintenance@trade.com',
  'landscaper@trade.com'
];

const testCredentials = [
  { email: 'admin@workorderpro.com', type: 'Admin' },
  { email: 'admin2@workorderpro.com', type: 'Admin' },
  { email: 'partner1@abc.com', type: 'Partner' },
  { email: 'partner2@xyz.com', type: 'Partner' },
  { email: 'partner3@premium.com', type: 'Partner' },
  { email: 'plumber@trade.com', type: 'Subcontractor' },
  { email: 'electrician@trade.com', type: 'Subcontractor' },
  { email: 'hvac@trade.com', type: 'Subcontractor' },
  { email: 'carpenter@trade.com', type: 'Subcontractor' },
  { email: 'painter@trade.com', type: 'Subcontractor' },
  { email: 'maintenance@trade.com', type: 'Employee' },
  { email: 'landscaper@trade.com', type: 'Employee' }
];

export const useDevTools = () => {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const { toast } = useToast();

  const fetchCounts = async () => {
    try {
      const [
        organizations,
        profiles,
        trades,
        workOrders,
        reports,
        attachments,
        templates,
        userOrgs,
        assignments,
        invoices,
        invoiceOrders,
        receipts,
        employeeReports
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_reports').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_attachments').select('*', { count: 'exact', head: true }),
        supabase.from('email_templates').select('*', { count: 'exact', head: true }),
        supabase.from('user_organizations').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('invoice_work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('receipts').select('*', { count: 'exact', head: true }),
        supabase.from('employee_reports').select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        organizations: organizations.count || 0,
        profiles: profiles.count || 0,
        trades: trades.count || 0,
        work_orders: workOrders.count || 0,
        work_order_reports: reports.count || 0,
        work_order_attachments: attachments.count || 0,
        email_templates: templates.count || 0,
        user_organizations: userOrgs.count || 0,
        work_order_assignments: assignments.count || 0,
        invoices: invoices.count || 0,
        invoice_work_orders: invoiceOrders.count || 0,
        receipts: receipts.count || 0,
        employee_reports: employeeReports.count || 0
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


  /**
   * MIGRATION FROM BROWSER SEEDING TO EDGE FUNCTIONS
   * 
   * Old Approach (Browser-based):
   * - Imported seed functions directly into browser
   * - Subject to RLS policy restrictions
   * - Limited by browser security and performance
   * 
   * New Approach (Edge Function-based):
   * - Server-side seeding with service role privileges
   * - Bypasses RLS policies for administrative operations
   * - Better error handling and atomic transactions
   * - Enhanced security and performance
   * 
   * Expected Response Format:
   * {
   *   success: boolean,
   *   progress: { step: string, completed: number, total: number },
   *   summary: { total_records: number, users_created: number, ... },
   *   error?: string
   * }
   */
  const runSeedScript = async () => {
    setLoading(true);
    try {
      console.log('🌱 Starting database seeding via Edge Function...');
      
      // NEW APPROACH: Edge Function seeding
      const { data, error } = await supabase.functions.invoke('seed-database', {
        body: {
          admin_key: 'dev-admin-key', // For development
          options: {
            clear_existing: true,
            include_test_data: true
          }
        }
      });
      
      // Handle Edge Function response and progress
      if (error) {
        console.error('❌ Edge Function error:', error);
        
        // Enhanced error handling for different error types
        if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
          toast({
            title: "Authentication Error",
            description: "Admin privileges required. Please check your credentials.",
            variant: "destructive",
          });
        } else if (error.message?.includes('FunctionsHttpError')) {
          toast({
            title: "Network Error", 
            description: "Could not connect to seeding service. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Service Error",
            description: "Seeding service encountered an error. Check console for details.",
            variant: "destructive",
          });
        }
        throw new Error(`Seeding failed: ${error.message}`);
      }
      
      // Display real-time progress from Edge Function
      if (data?.progress) {
        console.log('📊 Seeding Progress:', data.progress);
      }
      
      if (data?.success) {
        console.log('✅ Database seeded successfully via Edge Function');
        console.log('📋 Summary:', data.summary);
        
        toast({
          title: "Success",
          description: `Database seeded successfully! Created ${data.summary?.total_records || 'multiple'} records.`,
        });
      } else {
        throw new Error(data?.error || 'Unknown seeding error');
      }
      
      // Refresh counts after successful seeding
      setTimeout(async () => {
        try {
          await fetchCounts();
          console.log('✅ Table counts refreshed after seeding');
        } catch (error) {
          console.warn('Failed to refresh counts after seeding:', error);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Seeding failed:', error);
      toast({
        title: "Seeding Failed",
        description: `Error: ${error.message || 'Edge Function call failed'}. Check console for details.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * MIGRATION FROM DATABASE RPC TO EDGE FUNCTION
   * 
   * Old Approach (Direct RPC):
   * - Called supabase.rpc('clear_test_data') directly
   * - Limited error handling and safety features
   * 
   * New Approach (Edge Function):
   * - Enhanced safety with dry-run mode
   * - Better authentication and error handling
   * - Atomic transactions with rollback capability
   * - Real-time progress tracking
   */
  const clearTestData = async () => {
    setLoading(true);
    try {
      console.log('🧹 Starting test data cleanup via Edge Function...');
      
      // Step 1: Dry run first (safety feature)
      console.log('🧪 Running dry-run to preview deletions...');
      const { data: dryRunData, error: dryRunError } = await supabase.functions.invoke('clear-test-data', {
        body: {
          admin_key: 'dev-admin-key',
          dry_run: true,
          include_summary: true
        }
      });
      
      if (dryRunError) {
        console.error('❌ Dry-run failed:', dryRunError);
        throw new Error(`Dry-run failed: ${dryRunError.message}`);
      }
      
      // Display dry-run results
      console.log('📋 Would delete:', dryRunData?.deleted_counts);
      console.log('📊 Summary:', dryRunData?.test_data_summary);
      
      // Step 2: Actual deletion with explicit confirmation
      console.log('🗑️ Proceeding with actual deletion...');
      const { data, error } = await supabase.functions.invoke('clear-test-data', {
        body: {
          admin_key: 'dev-admin-key',
          dry_run: false,
          confirm_deletion: true,
          include_summary: true
        }
      });
      
      if (error) {
        console.error('❌ Clear test data failed:', error);
        
        // Enhanced error handling for different error types
        if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
          toast({
            title: "Authentication Error",
            description: "Admin privileges required. Please check your credentials.",
            variant: "destructive",
          });
        } else if (error.message?.includes('FunctionsHttpError')) {
          toast({
            title: "Network Error",
            description: "Could not connect to cleanup service. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Service Error",
            description: "Cleanup service encountered an error. Check console for details.",
            variant: "destructive",
          });
        }
        throw new Error(`Cleanup failed: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Test data cleanup completed successfully');
        console.log('📋 Deletion summary:', data.deleted_counts);
        
        const summary = Object.entries(data.deleted_counts || {})
          .map(([table, count]) => `${table}: ${count}`)
          .join(', ');
        
        toast({
          title: "Success",
          description: `Test data cleared successfully. Deleted: ${summary}`,
        });
      } else {
        throw new Error(data?.error || 'Unknown cleanup error');
      }
      
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

  const quickLogin = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'Test123!'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Logged in as ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to login: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    counts,
    fetchCounts,
    runSeedScript,
    clearTestData,
    quickLogin,
    testCredentials
  };
};