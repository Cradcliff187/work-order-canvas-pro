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


  const runSeedScript = async () => {
    setLoading(true);
    try {
      console.log('🌱 Starting database seeding...');
      
      // Import and run the seed script functions
      const { seedDatabase } = await import('../scripts/seed-functions');
      await seedDatabase();
      
      toast({
        title: "Success",
        description: "Database seeded successfully! Analytics will refresh separately.",
      });
      
      // Refresh counts only (lightweight operation)
      setTimeout(async () => {
        try {
          await fetchCounts();
          console.log('✅ Basic counts refreshed after seeding');
        } catch (error) {
          console.warn('Failed to refresh counts after seeding:', error);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Comprehensive seed error:', error);
      toast({
        title: "Seeding Failed",
        description: `Error: ${error.message || 'Unknown error'}. Check console for details.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    setLoading(true);
    try {
      console.log('Clearing test data...');
      
      // Get test user profiles
      const { data: testProfiles } = await supabase
        .from('profiles')
        .select('id, user_id, email')
        .in('email', TEST_EMAILS);

      if (!testProfiles?.length) {
        toast({
          title: "Info",
          description: "No test data found to clear",
        });
        setLoading(false);
        return;
      }

      const testProfileIds = testProfiles.map(p => p.id);
      console.log(`Found ${testProfiles.length} test profiles to clean`);

      // Clear in correct cascading dependency order - deepest children first
      
      // 1. Delete deepest child records first (audit logs reference everything)
      console.log('Deleting audit logs for test records...');
      await supabase.from('audit_logs').delete().in('user_id', testProfileIds);
      
      // 2. Delete receipt-work order relationships
      console.log('Deleting receipt work order allocations...');
      const { data: testReceipts } = await supabase
        .from('receipts')
        .select('id')
        .in('employee_user_id', testProfileIds);
      
      if (testReceipts?.length) {
        const testReceiptIds = testReceipts.map(r => r.id);
        await supabase.from('receipt_work_orders').delete().in('receipt_id', testReceiptIds);
      }
      
      // 3. Delete employee reports and receipts
      console.log('Deleting employee reports...');
      await supabase.from('employee_reports').delete().in('employee_user_id', testProfileIds);
      
      console.log('Deleting employee receipts...');
      await supabase.from('receipts').delete().in('employee_user_id', testProfileIds);
      
      // 4. Delete invoice work orders and invoice attachments
      console.log('Deleting invoice work orders...');
      const { data: testInvoices } = await supabase
        .from('invoices')
        .select('id')
        .in('submitted_by', testProfileIds);
      
      if (testInvoices?.length) {
        const testInvoiceIds = testInvoices.map(i => i.id);
        await supabase.from('invoice_work_orders').delete().in('invoice_id', testInvoiceIds);
        await supabase.from('invoice_attachments').delete().in('invoice_id', testInvoiceIds);
      }
      
      // 5. Delete invoices
      console.log('Deleting invoices...');
      await supabase.from('invoices').delete().in('submitted_by', testProfileIds);
      
      // 6. Delete work order attachments and reports
      console.log('Deleting work order attachments...');
      await supabase.from('work_order_attachments').delete().in('uploaded_by_user_id', testProfileIds);
      
      console.log('Deleting work order reports...');
      await supabase.from('work_order_reports').delete().in('subcontractor_user_id', testProfileIds);
      
      // 7. Delete work order assignments
      console.log('Deleting work order assignments...');
      await supabase.from('work_order_assignments').delete().in('assigned_to', testProfileIds);
      await supabase.from('work_order_assignments').delete().in('assigned_by', testProfileIds);
      
      // 8. Delete work orders
      console.log('Deleting work orders...');
      await supabase.from('work_orders').delete().in('created_by', testProfileIds);
      await supabase.from('work_orders').delete().in('assigned_to', testProfileIds);
      
      // 9. Delete partner locations (before organizations)
      console.log('Deleting partner locations...');
      const testOrgNames = [
        'ABC Property Management', 
        'XYZ Commercial Properties', 
        'Premium Facilities Group',
        'Pipes & More Plumbing',
        'Sparks Electric',
        'Cool Air HVAC',
        'Wood Works Carpentry',
        'Brush Strokes Painting',
        'Fix-It Maintenance',
        'Green Thumb Landscaping'
      ];
      
      const { data: testOrgs } = await supabase
        .from('organizations')
        .select('id')
        .in('name', testOrgNames);
      
      if (testOrgs?.length) {
        const testOrgIds = testOrgs.map(o => o.id);
        await supabase.from('partner_locations').delete().in('organization_id', testOrgIds);
      }
      
      // 10. Delete user organization relationships
      console.log('Deleting user organization relationships...');
      await supabase.from('user_organizations').delete().in('user_id', testProfileIds);
      
      // 11. Delete test organizations
      console.log('Deleting test organizations...');
      await supabase.from('organizations').delete().in('name', testOrgNames);
      
      // 12. Delete email templates and logs
      console.log('Deleting email templates...');
      const templateNames = [
        'work_order_received',
        'work_order_assigned', 
        'report_submitted',
        'report_approved',
        'work_order_completed'
      ];
      await supabase.from('email_templates').delete().in('template_name', templateNames);
      
      console.log('Deleting email logs...');
      await supabase.from('email_logs').delete().in('recipient_email', TEST_EMAILS);
      
      // 13. Finally delete test profiles (last, as they're referenced by many tables)
      console.log('Deleting test profiles...');
      await supabase.from('profiles').delete().in('email', TEST_EMAILS);
      
      // Note: Cannot delete auth users in browser context (requires service role)
      // This is a limitation of running in the browser vs server environment

      console.log('✅ Test data cleanup completed successfully');
      toast({
        title: "Success", 
        description: `Cleared test data for ${testProfiles.length} users. Note: Auth users remain due to browser limitations.`,
      });
      
      // Refresh counts only
      await fetchCounts();
    } catch (error: any) {
      console.error('Clear error:', error);
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