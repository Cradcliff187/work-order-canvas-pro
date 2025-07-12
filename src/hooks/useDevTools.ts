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

interface CompanyAnalytics {
  userDistribution: {
    admin: number;
    partner: number;
    subcontractor: number;
    employee: number;
    total: number;
  };
  organizationBreakdown: {
    partner: number;
    subcontractor: number;
    internal: number;
    total: number;
  };
  workOrderStats: {
    totalOrders: number;
    byStatus: Record<string, number>;
    byOrganization: Array<{ name: string; count: number; type: string }>;
    averagePerOrganization: number;
  };
  assignmentPatterns: {
    individualAssignments: number;
    organizationAssignments: number;
    multipleAssignments: number;
    unassignedOrders: number;
  };
  dataQuality: {
    completionRate: number;
    assignmentCoverage: number;
    reportSubmissionRate: number;
    invoiceCompletionRate: number;
  };
}

interface PerformanceMetrics {
  queryTimes: {
    organizations: number;
    workOrders: number;
    reports: number;
    assignments: number;
  };
  databaseHealth: {
    totalConnections: number;
    slowQueries: number;
    indexEfficiency: number;
  };
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

export const useDevTools = () => {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<TableCounts | null>(null);
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
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

  const fetchCompanyAnalytics = async () => {
    try {
      console.log('📊 Fetching company analytics...');
      
      // User Distribution with safe fallback
      let userDistribution = { admin: 0, partner: 0, subcontractor: 0, employee: 0, total: 0 };
      try {
        const { data: userTypes, error: userError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('is_active', true);

        if (userError) throw userError;

        userDistribution = userTypes?.reduce((acc, user) => {
          acc[user.user_type] = (acc[user.user_type] || 0) + 1;
          acc.total++;
          return acc;
        }, { admin: 0, partner: 0, subcontractor: 0, employee: 0, total: 0 }) || userDistribution;
      } catch (error) {
        console.warn('Failed to fetch user distribution:', error);
      }

      // Organization Breakdown with safe fallback
      let organizationBreakdown = { partner: 0, subcontractor: 0, internal: 0, total: 0 };
      try {
        const { data: orgTypes, error: orgError } = await supabase
          .from('organizations')
          .select('organization_type')
          .eq('is_active', true);

        if (orgError) throw orgError;

        organizationBreakdown = orgTypes?.reduce((acc, org) => {
          acc[org.organization_type] = (acc[org.organization_type] || 0) + 1;
          acc.total++;
          return acc;
        }, { partner: 0, subcontractor: 0, internal: 0, total: 0 }) || organizationBreakdown;
      } catch (error) {
        console.warn('Failed to fetch organization breakdown:', error);
      }

      // Work Order Stats with safe fallback
      let workOrderStats = {
        totalOrders: 0,
        byStatus: {} as Record<string, number>,
        byOrganization: [] as Array<{ name: string; count: number; type: string }>,
        averagePerOrganization: 0
      };
      
      try {
        const { data: workOrderData, error: woError } = await supabase
          .from('work_orders')
          .select('id, status, organization_id');

        if (woError) throw woError;

        workOrderStats = {
          totalOrders: workOrderData?.length || 0,
          byStatus: workOrderData?.reduce((acc, wo) => {
            acc[wo.status] = (acc[wo.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {},
          byOrganization: [],
          averagePerOrganization: organizationBreakdown.total > 0 
            ? Math.round((workOrderData?.length || 0) / organizationBreakdown.total * 100) / 100 
            : 0
        };
      } catch (error) {
        console.warn('Failed to fetch work order stats:', error);
      }

      // Assignment Patterns with safe fallback
      let assignmentPatterns = {
        individualAssignments: 0,
        organizationAssignments: 0,
        multipleAssignments: 0,
        unassignedOrders: workOrderStats.totalOrders
      };

      try {
        const { data: assignments } = await supabase
          .from('work_order_assignments')
          .select('id, assignment_type, work_order_id');

        const { data: individuallyAssigned } = await supabase
          .from('work_orders')
          .select('id')
          .not('assigned_to', 'is', null);

        assignmentPatterns = {
          individualAssignments: individuallyAssigned?.length || 0,
          organizationAssignments: assignments?.length || 0,
          multipleAssignments: 0,
          unassignedOrders: Math.max(0, workOrderStats.totalOrders - (individuallyAssigned?.length || 0) - (assignments?.length || 0))
        };
      } catch (error) {
        console.warn('Failed to fetch assignment patterns:', error);
      }

      // Data Quality Metrics with safe fallback
      let dataQuality = {
        completionRate: 0,
        assignmentCoverage: 0,
        reportSubmissionRate: 0,
        invoiceCompletionRate: 0
      };

      try {
        const [completedOrders, ordersWithReports, submittedInvoices] = await Promise.all([
          supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('work_order_reports').select('work_order_id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('invoices').select('id', { count: 'exact', head: true }).neq('status', 'draft')
        ]);

        dataQuality = {
          completionRate: workOrderStats.totalOrders > 0 
            ? Math.round((completedOrders.count || 0) / workOrderStats.totalOrders * 100) 
            : 0,
          assignmentCoverage: workOrderStats.totalOrders > 0 
            ? Math.round(((assignmentPatterns.individualAssignments + assignmentPatterns.organizationAssignments) / workOrderStats.totalOrders) * 100) 
            : 0,
          reportSubmissionRate: workOrderStats.totalOrders > 0 
            ? Math.round((ordersWithReports.count || 0) / workOrderStats.totalOrders * 100) 
            : 0,
          invoiceCompletionRate: (counts?.invoices || 0) > 0 
            ? Math.round((submittedInvoices.count || 0) / (counts?.invoices || 1) * 100) 
            : 0
        };
      } catch (error) {
        console.warn('Failed to fetch data quality metrics:', error);
      }

      setAnalytics({
        userDistribution,
        organizationBreakdown,
        workOrderStats,
        assignmentPatterns,
        dataQuality
      });

      console.log('✅ Company analytics fetched successfully');

    } catch (error) {
      console.error('Error fetching company analytics:', error);
      setAnalytics(null);
      toast({
        title: "Analytics Error",
        description: "Failed to fetch company analytics. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const startTime = Date.now();
      
      // Measure query performance
      const orgStart = Date.now();
      await supabase.from('organizations').select('id').limit(1);
      const orgTime = Date.now() - orgStart;

      const woStart = Date.now();
      await supabase.from('work_orders').select('id').limit(1);
      const woTime = Date.now() - woStart;

      const reportStart = Date.now();
      await supabase.from('work_order_reports').select('id').limit(1);
      const reportTime = Date.now() - reportStart;

      const assignStart = Date.now();
      await supabase.from('work_order_assignments').select('id').limit(1);
      const assignTime = Date.now() - assignStart;

      setPerformance({
        queryTimes: {
          organizations: orgTime,
          workOrders: woTime,
          reports: reportTime,
          assignments: assignTime
        },
        databaseHealth: {
          totalConnections: 1, // This would be from a monitoring query
          slowQueries: 0, // This would be from performance monitoring
          indexEfficiency: 95 // This would be calculated from query analysis
        }
      });

    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance metrics",
        variant: "destructive",
      });
    }
  };

  const fetchAllMetrics = async () => {
    await Promise.all([
      fetchCounts(),
      fetchCompanyAnalytics(),
      fetchPerformanceMetrics()
    ]);
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

      // Clear in dependency order (use profile IDs)
      console.log('Deleting work order attachments...');
      await supabase.from('work_order_attachments').delete().in('uploaded_by_user_id', testProfileIds);
      
      console.log('Deleting work order reports...');
      await supabase.from('work_order_reports').delete().in('subcontractor_user_id', testProfileIds);
      
      console.log('Deleting work orders...');
      await supabase.from('work_orders').delete().in('created_by', testProfileIds);
      
      console.log('Deleting user organization relationships...');
      await supabase.from('user_organizations').delete().in('user_id', testProfileIds);
      
      console.log('Deleting test organizations...');
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
      await supabase.from('organizations').delete().in('name', testOrgNames);
      
      console.log('Deleting email templates...');
      const templateNames = [
        'work_order_received',
        'work_order_assigned', 
        'report_submitted',
        'report_approved',
        'work_order_completed'
      ];
      await supabase.from('email_templates').delete().in('template_name', templateNames);
      
      console.log('Deleting test profiles...');
      await supabase.from('profiles').delete().in('email', TEST_EMAILS);
      
      // Note: Cannot delete auth users in browser context (requires service role)
      // This is a limitation of running in the browser vs server environment

      toast({
        title: "Success", 
        description: `Cleared test data for ${testProfiles.length} users. Note: Auth users remain due to browser limitations.`,
      });
      
      // Refresh all metrics
      await fetchAllMetrics();
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
    analytics,
    performance,
    fetchCounts,
    fetchCompanyAnalytics,
    fetchPerformanceMetrics,
    fetchAllMetrics,
    runSeedScript,
    clearTestData,
    quickLogin,
    testCredentials: TEST_EMAILS.map(email => ({ email, password: 'Test123!' }))
  };
};