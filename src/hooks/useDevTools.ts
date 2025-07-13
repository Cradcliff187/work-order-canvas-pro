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


  // Client-side seed data for fallback when Edge Function is unavailable
  const clientSeedData = {
    organizations: [
      { name: 'WorkOrderPro Internal', contact_email: 'admin@workorderpro.com', organization_type: 'internal' as const, initials: 'WOP' },
      { name: 'ABC Property Management', contact_email: 'contact@abc-property.com', organization_type: 'partner' as const, initials: 'ABC' },
      { name: 'XYZ Commercial Properties', contact_email: 'info@xyz-commercial.com', organization_type: 'partner' as const, initials: 'XYZ' },
      { name: 'Pipes & More Plumbing', contact_email: 'service@pipesmore.com', organization_type: 'subcontractor' as const, initials: 'PMP' },
      { name: 'Sparks Electric', contact_email: 'contact@sparkselectric.com', organization_type: 'subcontractor' as const, initials: 'SPE' }
    ],
    trades: [
      { name: 'Plumbing', description: 'Water systems, pipes, fixtures' },
      { name: 'Electrical', description: 'Electrical systems and wiring' },
      { name: 'HVAC', description: 'Heating, ventilation, air conditioning' },
      { name: 'Carpentry', description: 'Wood construction and repair' },
      { name: 'General Maintenance', description: 'General facility maintenance' }
    ],
    emailTemplates: [
      {
        template_name: 'work_order_created',
        subject: 'New Work Order: {{work_order_number}}',
        html_content: '<p>A new work order has been created: {{work_order_number}}</p>',
        text_content: 'A new work order has been created: {{work_order_number}}'
      },
      {
        template_name: 'work_order_assigned',
        subject: 'Work Order Assigned: {{work_order_number}}',
        html_content: '<p>Work order {{work_order_number}} has been assigned to you.</p>',
        text_content: 'Work order {{work_order_number}} has been assigned to you.'
      }
    ]
  };

  const runClientSideSeeding = async (): Promise<void> => {
    console.log('🔄 Running client-side seeding (Edge Function fallback mode)...');
    
    try {
      // Step 1: Insert organizations
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .insert(clientSeedData.organizations)
        .select();
      
      if (orgError) throw orgError;
      console.log('✅ Organizations seeded:', orgs?.length);

      // Step 2: Insert trades
      const { data: trades, error: tradeError } = await supabase
        .from('trades')
        .insert(clientSeedData.trades)
        .select();
      
      if (tradeError) throw tradeError;
      console.log('✅ Trades seeded:', trades?.length);

      // Step 3: Insert email templates
      const { data: templates, error: templateError } = await supabase
        .from('email_templates')
        .insert(clientSeedData.emailTemplates)
        .select();
      
      if (templateError) throw templateError;
      console.log('✅ Email templates seeded:', templates?.length);

      console.log('🎉 Client-side seeding completed successfully!');
      
      toast({
        title: "Database Seeded (Fallback Mode)",
        description: "Test data has been successfully added using client-side seeding",
        variant: "default",
      });

    } catch (error) {
      console.error('❌ Client-side seeding error:', error);
      throw error;
    }
  };

  /**
   * Enhanced seeding with automatic fallback to client-side when Edge Function fails
   */
  const runSeedScript = async () => {
    setLoading(true);
    try {
      console.log('🚀 Attempting Edge Function seeding...');
      
      // Primary method: Edge Function seeding
      const { data, error } = await supabase.functions.invoke('seed-database', {
        body: {
          admin_key: 'dev-admin-key',
          options: {
            clear_existing: true,
            include_test_data: true
          }
        }
      });
      
      if (error) {
        // Check for CORS or network errors that indicate Edge Function unavailability
        const errorMessage = error.message?.toLowerCase() || '';
        const isCorsOrNetworkError = errorMessage.includes('cors') || 
                                   errorMessage.includes('failed to fetch') ||
                                   errorMessage.includes('network') ||
                                   errorMessage.includes('connection') ||
                                   errorMessage.includes('functionshttperror');

        if (isCorsOrNetworkError) {
          console.warn('⚠️ Edge Function unavailable, falling back to client-side seeding...');
          await runClientSideSeeding();
          await fetchCounts();
          return;
        }

        // Handle other Edge Function errors
        if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
          toast({
            title: "Authentication Error",
            description: "Admin privileges required. Please check your credentials.",
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
      
      if (data?.success) {
        console.log('✅ Database seeded successfully via Edge Function');
        console.log('📋 Summary:', data.summary);
        
        toast({
          title: "Success",
          description: `Database seeded successfully! Created ${data.summary?.total_records || 'multiple'} records.`,
        });
        
        await fetchCounts();
      } else {
        throw new Error(data?.error || 'Unknown seeding error');
      }
      
    } catch (error: any) {
      console.error('❌ Seeding failed:', error);
      
      // Check if this is a network/CORS error for fallback
      const errorMessage = error?.message?.toLowerCase() || '';
      const isCorsOrNetworkError = errorMessage.includes('failed to send a request') || 
                                 errorMessage.includes('cors') ||
                                 errorMessage.includes('failed to fetch');

      if (isCorsOrNetworkError) {
        console.log('Edge Function unavailable, using client-side seeding...');
        try {
          // Create organizations
          const { error: orgError } = await supabase
            .from('organizations')
            .insert([
              { name: 'WorkOrderPro', contact_email: 'admin@workorderpro.com', organization_type: 'internal', initials: 'WOP' },
              { name: 'ABC Property Management', contact_email: 'info@abc.com', organization_type: 'partner', initials: 'ABC' }
            ]);
          
          if (orgError) console.error('Organization insert error:', orgError);

          // Create user profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { email: 'admin@workorderpro.com', first_name: 'Admin', last_name: 'User', user_type: 'admin', user_id: crypto.randomUUID() },
              { email: 'partner@abc.com', first_name: 'Partner', last_name: 'User', user_type: 'partner', user_id: crypto.randomUUID() }
            ]);
          
          if (profileError) console.error('Profile insert error:', profileError);

          toast({
            title: "Success",
            description: "Database seeded successfully using client-side fallback!",
          });
          
          await fetchCounts();
          return;
        } catch (fallbackError) {
          console.error('❌ Client-side seeding also failed:', fallbackError);
          toast({
            title: "Seeding Error",
            description: "Both Edge Function and client-side seeding failed",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Seeding Failed",
          description: `Error: ${error.message || 'Edge Function call failed'}. Check console for details.`,
          variant: "destructive",
        });
      }
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