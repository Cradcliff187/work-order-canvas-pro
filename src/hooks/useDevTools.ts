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

  const runSeedScript = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log('🌱 Starting comprehensive database seeding...');
      
      // CHECK AUTHENTICATION FIRST
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required: Please log in to seed the database');
      }
      
      console.log('Current user:', user);
      console.log('User ID:', user.id);
      
      // Verify user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();
      
      if (profileError || !profile || profile.user_type !== 'admin') {
        throw new Error('Admin privileges required: Only admin users can seed the database');
      }
      
      console.log('✅ Authenticated as admin, proceeding with seeding...');
      
      // Create ID mapping objects for foreign key relationships
      const orgMap = new Map<string, string>();
      const tradeMap = new Map<string, string>();
      const userMap = new Map<string, string>();

      // 1. CREATE ORGANIZATIONS
      console.log('Creating organizations...');
      const organizations = [
        { name: 'WorkOrderPro', contact_email: 'admin@workorderpro.com', organization_type: 'internal' as const, initials: 'WOP' },
        { name: 'ABC Property Management', contact_email: 'info@abc.com', organization_type: 'partner' as const, initials: 'ABC' },
        { name: 'XYZ Commercial Properties', contact_email: 'contact@xyz.com', organization_type: 'partner' as const, initials: 'XYZ' },
        { name: 'Premium Facilities Group', contact_email: 'info@premium.com', organization_type: 'partner' as const, initials: 'PFG' },
        { name: 'Pipes & More Plumbing', contact_email: 'service@pipes.com', organization_type: 'subcontractor' as const, initials: 'PMP' },
        { name: 'Sparks Electric', contact_email: 'contact@sparks.com', organization_type: 'subcontractor' as const, initials: 'SE' },
        { name: 'Cool Air HVAC', contact_email: 'info@coolair.com', organization_type: 'subcontractor' as const, initials: 'CA' },
        { name: 'Fix-It Maintenance', contact_email: 'help@fixit.com', organization_type: 'subcontractor' as const, initials: 'FIM' }
      ];

      for (const org of organizations) {
        const orgId = crypto.randomUUID();
        orgMap.set(org.name, orgId);
        const { error } = await supabase.from('organizations').insert({ ...org, id: orgId });
        if (error) console.error(`Organization insert error (${org.name}):`, error);
      }

      // 2. CREATE TRADES
      console.log('Creating trades...');
      const trades = [
        { name: 'Plumbing', description: 'Water systems, pipes, fixtures' },
        { name: 'HVAC', description: 'Heating, ventilation, air conditioning' },
        { name: 'Electrical', description: 'Electrical systems and repairs' },
        { name: 'General Maintenance', description: 'Basic maintenance and repairs' },
        { name: 'Carpentry', description: 'Wood work and installations' },
        { name: 'Painting', description: 'Interior and exterior painting' },
        { name: 'Appliance Repair', description: 'Kitchen and laundry appliances' },
        { name: 'Landscaping', description: 'Grounds and outdoor maintenance' },
        { name: 'Cleaning', description: 'Janitorial and deep cleaning' },
        { name: 'Security Systems', description: 'Access control and surveillance' }
      ];

      for (const trade of trades) {
        const tradeId = crypto.randomUUID();
        tradeMap.set(trade.name, tradeId);
        const { error } = await supabase.from('trades').insert({ ...trade, id: tradeId });
        if (error) console.error(`Trade insert error (${trade.name}):`, error);
      }

      // 3. CREATE EMAIL TEMPLATES
      console.log('Creating email templates...');
      const emailTemplates = [
        {
          template_name: 'work_order_received',
          subject: 'New Work Order Received',
          html_content: '<p>A new work order has been received and is pending assignment.</p>',
          text_content: 'A new work order has been received and is pending assignment.'
        },
        {
          template_name: 'work_order_assigned',
          subject: 'Work Order Assignment',
          html_content: '<p>You have been assigned a new work order.</p>',
          text_content: 'You have been assigned a new work order.'
        },
        {
          template_name: 'work_order_completed',
          subject: 'Work Order Completed',
          html_content: '<p>Your work order has been completed.</p>',
          text_content: 'Your work order has been completed.'
        },
        {
          template_name: 'report_submitted',
          subject: 'Work Report Submitted',
          html_content: '<p>A work report has been submitted for review.</p>',
          text_content: 'A work report has been submitted for review.'
        },
        {
          template_name: 'report_reviewed',
          subject: 'Work Report Reviewed',
          html_content: '<p>Your work report has been reviewed.</p>',
          text_content: 'Your work report has been reviewed.'
        }
      ];

      for (const template of emailTemplates) {
        const { error } = await supabase.from('email_templates').insert(template);
        if (error) console.error(`Email template insert error (${template.template_name}):`, error);
      }

      // 4. CREATE USER PROFILES
      console.log('Creating user profiles...');
      const users = [
        // Admins
        { email: 'admin@workorderpro.com', first_name: 'Admin', last_name: 'User', user_type: 'admin' as const, company: 'WorkOrderPro' },
        { email: 'sarah.admin@workorderpro.com', first_name: 'Sarah', last_name: 'Johnson', user_type: 'admin' as const, company: 'WorkOrderPro' },
        
        // Employees
        { email: 'employee1@workorderpro.com', first_name: 'Mike', last_name: 'Chen', user_type: 'employee' as const, is_employee: true, hourly_cost_rate: 25, hourly_billable_rate: 45, company: 'WorkOrderPro' },
        { email: 'employee2@workorderpro.com', first_name: 'Lisa', last_name: 'Rodriguez', user_type: 'employee' as const, is_employee: true, hourly_cost_rate: 30, hourly_billable_rate: 50, company: 'WorkOrderPro' },
        { email: 'employee3@workorderpro.com', first_name: 'David', last_name: 'Thompson', user_type: 'employee' as const, is_employee: true, hourly_cost_rate: 28, hourly_billable_rate: 48, company: 'WorkOrderPro' },
        
        // Partners
        { email: 'manager@abc.com', first_name: 'John', last_name: 'Smith', user_type: 'partner' as const, company: 'ABC Property Management' },
        { email: 'facilities@xyz.com', first_name: 'Emily', last_name: 'Davis', user_type: 'partner' as const, company: 'XYZ Commercial Properties' },
        { email: 'ops@premium.com', first_name: 'Robert', last_name: 'Wilson', user_type: 'partner' as const, company: 'Premium Facilities Group' },
        
        // Subcontractors
        { email: 'joe@pipes.com', first_name: 'Joe', last_name: 'Plumber', user_type: 'subcontractor' as const, company: 'Pipes & More Plumbing' },
        { email: 'spark@sparks.com', first_name: 'Electric', last_name: 'Eddie', user_type: 'subcontractor' as const, company: 'Sparks Electric' },
        { email: 'cool@coolair.com', first_name: 'AC', last_name: 'Andy', user_type: 'subcontractor' as const, company: 'Cool Air HVAC' },
        { email: 'fix@fixit.com', first_name: 'Handy', last_name: 'Harry', user_type: 'subcontractor' as const, company: 'Fix-It Maintenance' },
        { email: 'sub2@pipes.com', first_name: 'Pete', last_name: 'Pipefitter', user_type: 'subcontractor' as const, company: 'Pipes & More Plumbing' },
        { email: 'sub2@sparks.com', first_name: 'Sparky', last_name: 'Sam', user_type: 'subcontractor' as const, company: 'Sparks Electric' }
      ];

      for (const userData of users) {
        // Use the authenticated user's ID for the first admin profile to satisfy RLS
        const isCurrentUserProfile = userData.email === 'admin@workorderpro.com';
        const userId = isCurrentUserProfile ? user.id : crypto.randomUUID();
        const profileId = crypto.randomUUID();
        userMap.set(userData.email, profileId);
        
        const profileData = {
          id: profileId,
          user_id: userId,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
          company_name: userData.company,
          is_employee: userData.is_employee || false,
          hourly_cost_rate: userData.hourly_cost_rate || null,
          hourly_billable_rate: userData.hourly_billable_rate || null
        };
        
        console.log(`Creating profile for ${userData.email} with user_id: ${userId}`);
        const { error } = await supabase.from('profiles').insert(profileData);
        if (error) {
          console.error(`Profile insert error (${userData.email}):`, error);
          console.error('Profile data attempted:', profileData);
        } else {
          console.log(`✅ Profile created successfully for ${userData.email}`);
        }
      }

      // 5. CREATE USER-ORGANIZATION RELATIONSHIPS
      console.log('Creating user-organization relationships...');
      const userOrgRelationships = [
        // WorkOrderPro employees
        { userEmail: 'admin@workorderpro.com', orgName: 'WorkOrderPro' },
        { userEmail: 'sarah.admin@workorderpro.com', orgName: 'WorkOrderPro' },
        { userEmail: 'employee1@workorderpro.com', orgName: 'WorkOrderPro' },
        { userEmail: 'employee2@workorderpro.com', orgName: 'WorkOrderPro' },
        { userEmail: 'employee3@workorderpro.com', orgName: 'WorkOrderPro' },
        
        // Partners
        { userEmail: 'manager@abc.com', orgName: 'ABC Property Management' },
        { userEmail: 'facilities@xyz.com', orgName: 'XYZ Commercial Properties' },
        { userEmail: 'ops@premium.com', orgName: 'Premium Facilities Group' },
        
        // Subcontractors
        { userEmail: 'joe@pipes.com', orgName: 'Pipes & More Plumbing' },
        { userEmail: 'sub2@pipes.com', orgName: 'Pipes & More Plumbing' },
        { userEmail: 'spark@sparks.com', orgName: 'Sparks Electric' },
        { userEmail: 'sub2@sparks.com', orgName: 'Sparks Electric' },
        { userEmail: 'cool@coolair.com', orgName: 'Cool Air HVAC' },
        { userEmail: 'fix@fixit.com', orgName: 'Fix-It Maintenance' }
      ];

      for (const rel of userOrgRelationships) {
        const userId = userMap.get(rel.userEmail);
        const orgId = orgMap.get(rel.orgName);
        if (userId && orgId) {
          const { error } = await supabase.from('user_organizations').insert({
            user_id: userId,
            organization_id: orgId
          });
          if (error) console.error(`User-org relationship error (${rel.userEmail}):`, error);
        }
      }

      // 6. CREATE PARTNER LOCATIONS
      console.log('Creating partner locations...');
      const partnerLocations = [
        { org: 'ABC Property Management', location_name: 'Downtown Office', location_number: '001', city: 'New York', state: 'NY' },
        { org: 'ABC Property Management', location_name: 'Midtown Branch', location_number: '002', city: 'New York', state: 'NY' },
        { org: 'ABC Property Management', location_name: 'Brooklyn Office', location_number: '003', city: 'Brooklyn', state: 'NY' },
        { org: 'XYZ Commercial Properties', location_name: 'Main Office', location_number: 'M01', city: 'Los Angeles', state: 'CA' },
        { org: 'XYZ Commercial Properties', location_name: 'West Side', location_number: 'W01', city: 'Los Angeles', state: 'CA' },
        { org: 'XYZ Commercial Properties', location_name: 'Beach Office', location_number: 'B01', city: 'Santa Monica', state: 'CA' },
        { org: 'Premium Facilities Group', location_name: 'Corporate HQ', location_number: 'HQ', city: 'Chicago', state: 'IL' },
        { org: 'Premium Facilities Group', location_name: 'North Campus', location_number: 'NC', city: 'Chicago', state: 'IL' },
        { org: 'Premium Facilities Group', location_name: 'South Plant', location_number: 'SP', city: 'Chicago', state: 'IL' },
        { org: 'Premium Facilities Group', location_name: 'Warehouse District', location_number: 'WD', city: 'Chicago', state: 'IL' }
      ];

      for (const location of partnerLocations) {
        const orgId = orgMap.get(location.org);
        if (orgId) {
          const { error } = await supabase.from('partner_locations').insert({
            organization_id: orgId,
            location_name: location.location_name,
            location_number: location.location_number,
            city: location.city,
            state: location.state
          });
          if (error) console.error(`Partner location insert error (${location.location_name}):`, error);
        }
      }

      // 7. CREATE WORK ORDERS
      console.log('Creating work orders...');
      const workOrders = [
        { title: 'Leaking Faucet Repair', org: 'ABC Property Management', trade: 'Plumbing', assignee: 'joe@pipes.com', status: 'completed' as const },
        { title: 'HVAC System Maintenance', org: 'XYZ Commercial Properties', trade: 'HVAC', assignee: 'cool@coolair.com', status: 'in_progress' as const },
        { title: 'Electrical Outlet Installation', org: 'Premium Facilities Group', trade: 'Electrical', assignee: 'spark@sparks.com', status: 'assigned' as const },
        { title: 'Office Deep Cleaning', org: 'ABC Property Management', trade: 'Cleaning', assignee: 'fix@fixit.com', status: 'received' as const },
        { title: 'Carpet Installation', org: 'XYZ Commercial Properties', trade: 'General Maintenance', assignee: null, status: 'received' as const },
        { title: 'Bathroom Plumbing Upgrade', org: 'Premium Facilities Group', trade: 'Plumbing', assignee: 'sub2@pipes.com', status: 'completed' as const },
        { title: 'Security Camera Installation', org: 'ABC Property Management', trade: 'Security Systems', assignee: 'sub2@sparks.com', status: 'in_progress' as const },
        { title: 'Landscape Maintenance', org: 'XYZ Commercial Properties', trade: 'Landscaping', assignee: 'fix@fixit.com', status: 'assigned' as const },
        { title: 'Kitchen Appliance Repair', org: 'Premium Facilities Group', trade: 'Appliance Repair', assignee: 'joe@pipes.com', status: 'completed' as const },
        { title: 'Conference Room Painting', org: 'ABC Property Management', trade: 'Painting', assignee: 'fix@fixit.com', status: 'in_progress' as const },
        { title: 'Carpentry Work - Shelving', org: 'XYZ Commercial Properties', trade: 'Carpentry', assignee: 'sub2@pipes.com', status: 'assigned' as const },
        { title: 'General Building Maintenance', org: 'Premium Facilities Group', trade: 'General Maintenance', assignee: 'cool@coolair.com', status: 'received' as const },
        { title: 'Emergency Electrical Repair', org: 'ABC Property Management', trade: 'Electrical', assignee: 'spark@sparks.com', status: 'completed' as const },
        { title: 'Parking Lot Maintenance', org: 'XYZ Commercial Properties', trade: 'General Maintenance', assignee: 'fix@fixit.com', status: 'in_progress' as const },
        { title: 'Roof Inspection and Repair', org: 'Premium Facilities Group', trade: 'General Maintenance', assignee: 'sub2@sparks.com', status: 'assigned' as const },
        { title: 'Window Cleaning Service', org: 'ABC Property Management', trade: 'Cleaning', assignee: 'cool@coolair.com', status: 'completed' as const }
      ];

      const workOrderIds: string[] = [];
      for (const wo of workOrders) {
        const workOrderId = crypto.randomUUID();
        workOrderIds.push(workOrderId);
        
        const orgId = orgMap.get(wo.org);
        const tradeId = tradeMap.get(wo.trade);
        const assigneeId = wo.assignee ? userMap.get(wo.assignee) : null;
        const creatorId = userMap.get('admin@workorderpro.com');

        if (orgId && tradeId && creatorId) {
          const { error } = await supabase.from('work_orders').insert({
            id: workOrderId,
            title: wo.title,
            organization_id: orgId,
            trade_id: tradeId,
            assigned_to: assigneeId,
            status: wo.status,
            created_by: creatorId,
            description: `${wo.title} for ${wo.org}`,
            location_name: `Location for ${wo.title}`,
            city: wo.org === 'ABC Property Management' ? 'New York' : wo.org === 'XYZ Commercial Properties' ? 'Los Angeles' : 'Chicago',
            state: wo.org === 'ABC Property Management' ? 'NY' : wo.org === 'XYZ Commercial Properties' ? 'CA' : 'IL'
          });
          if (error) console.error(`Work order insert error (${wo.title}):`, error);
        }
      }

      // 8. CREATE WORK ORDER ASSIGNMENTS
      console.log('Creating work order assignments...');
      for (let i = 0; i < Math.min(8, workOrderIds.length); i++) {
        const workOrderId = workOrderIds[i];
        const assigneeEmail = workOrders[i].assignee;
        if (assigneeEmail) {
          const assigneeId = userMap.get(assigneeEmail);
          const assignerId = userMap.get('admin@workorderpro.com');
          
          if (assigneeId && assignerId) {
            const { error } = await supabase.from('work_order_assignments').insert({
              work_order_id: workOrderId,
              assigned_to: assigneeId,
              assigned_by: assignerId,
              assignment_type: 'lead'
            });
            if (error) console.error(`Assignment insert error:`, error);
          }
        }
      }

      // 9. CREATE WORK ORDER REPORTS
      console.log('Creating work order reports...');
      const completedOrders = workOrders.filter(wo => wo.status === 'completed');
      for (let i = 0; i < completedOrders.length && i < workOrderIds.length; i++) {
        const wo = completedOrders[i];
        if (wo.assignee) {
          const assigneeId = userMap.get(wo.assignee);
          const workOrderId = workOrderIds[workOrders.indexOf(wo)];
          
          if (assigneeId && workOrderId) {
            const { error } = await supabase.from('work_order_reports').insert({
              work_order_id: workOrderId,
              subcontractor_user_id: assigneeId,
              work_performed: `Completed ${wo.title}`,
              invoice_amount: 150 + Math.floor(Math.random() * 300),
              status: 'approved' as const,
              hours_worked: 2 + Math.floor(Math.random() * 6),
              materials_used: 'Standard materials and supplies'
            });
            if (error) console.error(`Report insert error:`, error);
          }
        }
      }

      // 10. CREATE INVOICES AND INVOICE WORK ORDERS
      console.log('Creating invoices...');
      const subcontractorOrgs = ['Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC'];
      for (const orgName of subcontractorOrgs) {
        const orgId = orgMap.get(orgName);
        const submitterId = userMap.get(orgName === 'Pipes & More Plumbing' ? 'joe@pipes.com' : 
                                        orgName === 'Sparks Electric' ? 'spark@sparks.com' : 'cool@coolair.com');
        
        if (orgId && submitterId) {
          const invoiceId = crypto.randomUUID();
          const totalAmount = 500 + Math.floor(Math.random() * 1000);
          
          // Create invoice
          const { error: invoiceError } = await supabase.from('invoices').insert({
            subcontractor_organization_id: orgId,
            submitted_by: submitterId,
            total_amount: totalAmount,
            status: 'submitted',
            external_invoice_number: `EXT-${Math.floor(Math.random() * 10000)}`,
            internal_invoice_number: `INV-2025-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`
          });
          if (invoiceError) console.error(`Invoice insert error:`, invoiceError);

          // Create invoice work orders (link to completed work orders from this org)
          const relatedWorkOrders = workOrderIds.slice(0, 2); // Link first 2 work orders
          for (const workOrderId of relatedWorkOrders) {
            const { error: iwoError } = await supabase.from('invoice_work_orders').insert({
              invoice_id: invoiceId,
              work_order_id: workOrderId,
              amount: totalAmount / relatedWorkOrders.length,
              description: `Work completed for work order`
            });
            if (iwoError) console.error(`Invoice work order insert error:`, iwoError);
          }
        }
      }

      // 11. CREATE EMPLOYEE REPORTS AND RECEIPTS
      console.log('Creating employee reports and receipts...');
      const employees = ['employee1@workorderpro.com', 'employee2@workorderpro.com', 'employee3@workorderpro.com'];
      for (const employeeEmail of employees) {
        const employeeId = userMap.get(employeeEmail);
        if (employeeId) {
          // Create employee report
          const randomWorkOrderId = workOrderIds[Math.floor(Math.random() * workOrderIds.length)];
          const { error: reportError } = await supabase.from('employee_reports').insert({
            employee_user_id: employeeId,
            work_order_id: randomWorkOrderId,
            report_date: new Date().toISOString().split('T')[0],
            hours_worked: 6 + Math.floor(Math.random() * 3),
            hourly_rate_snapshot: 25 + Math.floor(Math.random() * 10),
            work_performed: `Internal work performed by ${employeeEmail}`,
            notes: 'Regular maintenance work completed'
          });
          if (reportError) console.error(`Employee report insert error:`, reportError);

          // Create receipt
          const { error: receiptError } = await supabase.from('receipts').insert({
            employee_user_id: employeeId,
            receipt_date: new Date().toISOString().split('T')[0],
            vendor_name: `Hardware Store ${Math.floor(Math.random() * 3) + 1}`,
            amount: 25 + Math.floor(Math.random() * 100),
            description: 'Materials and supplies'
          });
          if (receiptError) console.error(`Receipt insert error:`, receiptError);
        }
      }

      console.log('✅ Comprehensive database seeding completed!');
      
      toast({
        title: "Success",
        description: "Complete test dataset created successfully! Check the System Health page for details.",
      });
      
      await fetchCounts();
    } catch (error: any) {
      console.error('Seeding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to seed database",
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