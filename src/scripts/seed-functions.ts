// Browser-compatible version of seed functions
import { supabase } from '@/integrations/supabase/client';

const organizations = [
  {
    name: 'ABC Property Management',
    contact_email: 'contact@abc.com',
    contact_phone: '(555) 123-4567',
    address: '123 Business Ave, New York, NY 10001'
  },
  {
    name: 'XYZ Commercial Properties',
    contact_email: 'contact@xyz.com',
    contact_phone: '(555) 234-5678',
    address: '456 Corporate Blvd, Los Angeles, CA 90210'
  },
  {
    name: 'Premium Facilities Group',
    contact_email: 'contact@premium.com',
    contact_phone: '(555) 345-6789',
    address: '789 Enterprise Dr, Chicago, IL 60601'
  }
];

const users = [
  { email: 'admin@workorderpro.com', first_name: 'Admin', last_name: 'User', user_type: 'admin' as const },
  { email: 'admin2@workorderpro.com', first_name: 'Admin', last_name: 'Two', user_type: 'admin' as const },
  { email: 'partner1@abc.com', first_name: 'John', last_name: 'Smith', user_type: 'partner' as const, company_name: 'ABC Property Management' },
  { email: 'partner2@xyz.com', first_name: 'Sarah', last_name: 'Johnson', user_type: 'partner' as const, company_name: 'XYZ Commercial Properties' },
  { email: 'partner3@premium.com', first_name: 'Mike', last_name: 'Wilson', user_type: 'partner' as const, company_name: 'Premium Facilities Group' },
  { email: 'plumber@trade.com', first_name: 'Bob', last_name: 'Pipes', user_type: 'subcontractor' as const, company_name: 'Pipes & More Plumbing' },
  { email: 'electrician@trade.com', first_name: 'Tom', last_name: 'Sparks', user_type: 'subcontractor' as const, company_name: 'Sparks Electric' },
  { email: 'hvac@trade.com', first_name: 'Lisa', last_name: 'Cool', user_type: 'subcontractor' as const, company_name: 'Cool Air HVAC' },
  { email: 'carpenter@trade.com', first_name: 'Dave', last_name: 'Wood', user_type: 'subcontractor' as const, company_name: 'Wood Works Carpentry' },
  { email: 'painter@trade.com', first_name: 'Anna', last_name: 'Brush', user_type: 'subcontractor' as const, company_name: 'Brush Strokes Painting' },
  { email: 'maintenance@trade.com', first_name: 'Jim', last_name: 'Fix', user_type: 'subcontractor' as const, company_name: 'Fix-It Maintenance' },
  { email: 'landscaper@trade.com', first_name: 'Green', last_name: 'Thumb', user_type: 'subcontractor' as const, company_name: 'Green Thumb Landscaping' }
];

const trades = [
  { name: 'Plumbing', description: 'Plumbing repairs and maintenance' },
  { name: 'Electrical', description: 'Electrical work and repairs' },
  { name: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
  { name: 'Carpentry', description: 'Wood work and construction' },
  { name: 'Painting', description: 'Interior and exterior painting' },
  { name: 'General Maintenance', description: 'General repairs and maintenance' },
  { name: 'Landscaping', description: 'Grounds and landscaping work' },
  { name: 'Roofing', description: 'Roof repairs and maintenance' },
  { name: 'Flooring', description: 'Floor installation and repair' },
  { name: 'Appliance Repair', description: 'Kitchen and laundry appliance repairs' }
];

const emailTemplates = [
  {
    template_name: 'work_order_received',
    subject: 'New Work Order Received - {{work_order_number}}',
    html_content: '<h1>Work Order Received</h1><p>A new work order has been submitted: {{work_order_number}}</p>',
    text_content: 'Work Order Received\n\nA new work order has been submitted: {{work_order_number}}'
  },
  {
    template_name: 'work_order_assigned',
    subject: 'Work Order Assigned - {{work_order_number}}',
    html_content: '<h1>Work Order Assigned</h1><p>You have been assigned work order: {{work_order_number}}</p>',
    text_content: 'Work Order Assigned\n\nYou have been assigned work order: {{work_order_number}}'
  },
  {
    template_name: 'report_submitted',
    subject: 'Work Report Submitted - {{work_order_number}}',
    html_content: '<h1>Report Submitted</h1><p>A work report has been submitted for: {{work_order_number}}</p>',
    text_content: 'Report Submitted\n\nA work report has been submitted for: {{work_order_number}}'
  },
  {
    template_name: 'report_approved',
    subject: 'Work Report Approved - {{work_order_number}}',
    html_content: '<h1>Report Approved</h1><p>Your work report has been approved for: {{work_order_number}}</p>',
    text_content: 'Report Approved\n\nYour work report has been approved for: {{work_order_number}}'
  },
  {
    template_name: 'work_order_completed',
    subject: 'Work Order Completed - {{work_order_number}}',
    html_content: '<h1>Work Order Completed</h1><p>Work order has been completed: {{work_order_number}}</p>',
    text_content: 'Work Order Completed\n\nWork order has been completed: {{work_order_number}}'
  }
];

export const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create organizations
    console.log('📁 Creating organizations...');
    const { data: createdOrgs, error: orgError } = await supabase
      .from('organizations')
      .upsert(organizations, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      throw new Error(`Failed to create organizations: ${orgError.message}`);
    }
    console.log(`✅ Created/updated ${createdOrgs?.length} organizations`);

    // 2. Create email templates
    console.log('📧 Creating email templates...');
    const { error: templateError } = await supabase
      .from('email_templates')
      .upsert(emailTemplates, { 
        onConflict: 'template_name',
        ignoreDuplicates: false 
      });

    if (templateError) {
      console.error('Email template creation error:', templateError);
      throw new Error(`Failed to create email templates: ${templateError.message}`);
    }
    console.log(`✅ Created/updated ${emailTemplates.length} email templates`);

    // 3. Create trades
    console.log('🔧 Creating trades...');
    const { error: tradesError } = await supabase
      .from('trades')
      .upsert(trades, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      });

    if (tradesError) {
      console.error('Trades creation error:', tradesError);
      throw new Error(`Failed to create trades: ${tradesError.message}`);
    }
    console.log(`✅ Created/updated ${trades.length} trades`);

    // 4. Create users (simplified for browser)
    console.log('👥 Creating users...');
    let createdUserCount = 0;

    for (const user of users) {
      try {
        // Check if user exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', user.email)
          .single();

        if (!existingProfile) {
          // Create auth user
          const { data: authUser, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: 'Test123!',
            options: {
              data: {
                first_name: user.first_name,
                last_name: user.last_name
              }
            }
          });

          if (authError) {
            console.warn(`Failed to create auth user ${user.email}:`, authError.message);
            continue;
          }

          if (authUser.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                user_id: authUser.user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                company_name: user.company_name
              });

            if (!profileError) {
              createdUserCount++;
            }
          }
        }
      } catch (error) {
        console.warn(`Error creating user ${user.email}:`, error);
      }
    }

    console.log(`✅ Created/verified ${createdUserCount} users`);
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};