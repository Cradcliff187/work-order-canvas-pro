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
        userOrgs
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trades').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_reports').select('*', { count: 'exact', head: true }),
        supabase.from('work_order_attachments').select('*', { count: 'exact', head: true }),
        supabase.from('email_templates').select('*', { count: 'exact', head: true }),
        supabase.from('user_organizations').select('*', { count: 'exact', head: true })
      ]);

      setCounts({
        organizations: organizations.count || 0,
        profiles: profiles.count || 0,
        trades: trades.count || 0,
        work_orders: workOrders.count || 0,
        work_order_reports: reports.count || 0,
        work_order_attachments: attachments.count || 0,
        email_templates: templates.count || 0,
        user_organizations: userOrgs.count || 0
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
      // Import and run the seed script functions
      const { seedDatabase } = await import('../scripts/seed-functions');
      await seedDatabase();
      
      toast({
        title: "Success",
        description: "Database seeded successfully! Check console for details.",
      });
      
      // Refresh counts
      setTimeout(() => fetchCounts(), 1000); // Small delay to ensure data is committed
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
      
      // Refresh counts
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
    testCredentials: TEST_EMAILS.map(email => ({ email, password: 'Test123!' }))
  };
};