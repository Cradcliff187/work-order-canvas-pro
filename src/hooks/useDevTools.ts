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