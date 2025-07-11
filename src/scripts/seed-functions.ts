// Browser-compatible version of seed functions
import { supabase } from '@/integrations/supabase/client';

const organizations = [
  // Internal organization
  {
    name: 'WorkOrderPro Internal',
    contact_email: 'admin@workorderpro.com',
    contact_phone: '(555) 000-0000',
    address: '100 Main Street, Suite 200, Business City, BC 12345',
    organization_type: 'internal' as const,
    initials: 'WOP'
  },
  // Partner organizations
  {
    name: 'ABC Property Management',
    contact_email: 'contact@abc.com',
    contact_phone: '(555) 123-4567',
    address: '123 Business Ave, New York, NY 10001',
    organization_type: 'partner' as const,
    initials: 'ABC'
  },
  {
    name: 'XYZ Commercial Properties',
    contact_email: 'contact@xyz.com',
    contact_phone: '(555) 234-5678',
    address: '456 Corporate Blvd, Los Angeles, CA 90210',
    organization_type: 'partner' as const,
    initials: 'XYZ'
  },
  {
    name: 'Premium Facilities Group',
    contact_email: 'contact@premium.com',
    contact_phone: '(555) 345-6789',
    address: '789 Enterprise Dr, Chicago, IL 60601',
    organization_type: 'partner' as const,
    initials: 'PFG'
  },
  // Subcontractor organizations
  {
    name: 'Pipes & More Plumbing',
    contact_email: 'contact@pipesmore.com',
    contact_phone: '(555) 987-6543',
    address: '456 Trade Ave, Plumber City, PC 67890',
    organization_type: 'subcontractor' as const,
    initials: 'PMP'
  },
  {
    name: 'Sparks Electric',
    contact_email: 'contact@sparkselectric.com',
    contact_phone: '(555) 876-5432',
    address: '789 Electric Blvd, Sparks Town, ST 54321',
    organization_type: 'subcontractor' as const,
    initials: 'SPE'
  },
  {
    name: 'Cool Air HVAC',
    contact_email: 'contact@coolairhvac.com',
    contact_phone: '(555) 765-4321',
    address: '321 HVAC Street, Cool City, CC 43210',
    organization_type: 'subcontractor' as const,
    initials: 'CAH'
  },
  {
    name: 'Wood Works Carpentry',
    contact_email: 'contact@woodworks.com',
    contact_phone: '(555) 654-3210',
    address: '654 Carpenter Lane, Wood Village, WV 32109',
    organization_type: 'subcontractor' as const,
    initials: 'WWC'
  },
  {
    name: 'Brush Strokes Painting',
    contact_email: 'contact@brushstrokes.com',
    contact_phone: '(555) 543-2109',
    address: '987 Paint Avenue, Color Town, CT 21098',
    organization_type: 'subcontractor' as const,
    initials: 'BSP'
  },
  {
    name: 'Fix-It Maintenance',
    contact_email: 'contact@fixit.com',
    contact_phone: '(555) 432-1098',
    address: '147 Repair Road, Fix City, FC 10987',
    organization_type: 'subcontractor' as const,
    initials: 'FIM'
  },
  {
    name: 'Green Thumb Landscaping',
    contact_email: 'contact@greenthumb.com',
    contact_phone: '(555) 321-0987',
    address: '258 Garden Street, Green Valley, GV 09876',
    organization_type: 'subcontractor' as const,
    initials: 'GTL'
  }
];

const users = [
  // Admin users (employees)
  { email: 'admin@workorderpro.com', first_name: 'Admin', last_name: 'User', user_type: 'admin' as const, organization_name: 'WorkOrderPro Internal' },
  { email: 'admin2@workorderpro.com', first_name: 'Admin', last_name: 'Two', user_type: 'admin' as const, organization_name: 'WorkOrderPro Internal' },
  // Partner users
  { email: 'partner1@abc.com', first_name: 'John', last_name: 'Smith', user_type: 'partner' as const, company_name: 'ABC Property Management', organization_name: 'ABC Property Management' },
  { email: 'partner2@xyz.com', first_name: 'Sarah', last_name: 'Johnson', user_type: 'partner' as const, company_name: 'XYZ Commercial Properties', organization_name: 'XYZ Commercial Properties' },
  { email: 'partner3@premium.com', first_name: 'Mike', last_name: 'Wilson', user_type: 'partner' as const, company_name: 'Premium Facilities Group', organization_name: 'Premium Facilities Group' },
  // Subcontractor users
  { email: 'plumber@trade.com', first_name: 'Bob', last_name: 'Pipes', user_type: 'subcontractor' as const, company_name: 'Pipes & More Plumbing', organization_name: 'Pipes & More Plumbing' },
  { email: 'electrician@trade.com', first_name: 'Tom', last_name: 'Sparks', user_type: 'subcontractor' as const, company_name: 'Sparks Electric', organization_name: 'Sparks Electric' },
  { email: 'hvac@trade.com', first_name: 'Lisa', last_name: 'Cool', user_type: 'subcontractor' as const, company_name: 'Cool Air HVAC', organization_name: 'Cool Air HVAC' },
  { email: 'carpenter@trade.com', first_name: 'Dave', last_name: 'Wood', user_type: 'subcontractor' as const, company_name: 'Wood Works Carpentry', organization_name: 'Wood Works Carpentry' },
  { email: 'painter@trade.com', first_name: 'Anna', last_name: 'Brush', user_type: 'subcontractor' as const, company_name: 'Brush Strokes Painting', organization_name: 'Brush Strokes Painting' },
  { email: 'maintenance@trade.com', first_name: 'Jim', last_name: 'Fix', user_type: 'subcontractor' as const, company_name: 'Fix-It Maintenance', organization_name: 'Fix-It Maintenance' },
  { email: 'landscaper@trade.com', first_name: 'Green', last_name: 'Thumb', user_type: 'subcontractor' as const, company_name: 'Green Thumb Landscaping', organization_name: 'Green Thumb Landscaping' }
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

    // 4. Create users and profiles
    console.log('👥 Creating users and profiles...');
    let createdUserCount = 0;
    let updatedUserCount = 0;

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email}`);
        
        // Check if profile already exists (indicates auth user exists)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, user_id, user_type, is_employee')
          .eq('email', user.email)
          .single();
        
        let authUserId: string;
        let profileId: string;

        if (existingProfile) {
          // User exists, get their auth user ID
          authUserId = existingProfile.user_id;
          profileId = existingProfile.id;
          // Update profile if needed
          if (existingProfile.user_type !== user.user_type || 
              existingProfile.is_employee !== (user.user_type === 'admin')) {
            await supabase
              .from('profiles')
              .update({
                user_type: user.user_type,
                is_employee: user.user_type === 'admin',
                company_name: user.company_name
              })
              .eq('id', profileId);
            console.log(`  ↻ Updated profile for ${user.email}`);
          }
          updatedUserCount++;
        } else {
          // Create new auth user using signUp (browser compatible)
          const { data: authUser, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: 'Test123!',
            options: {
              data: {
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type
              }
            }
          });

          if (authError) {
            console.warn(`  ⚠️ Failed to create auth user ${user.email}:`, authError.message);
            continue;
          }

          if (!authUser.user) {
            console.warn(`  ⚠️ No user returned for ${user.email}`);
            continue;
          }

          authUserId = authUser.user.id;

          // Create profile (will be handled by trigger, but let's ensure it exists)
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: authUserId,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              user_type: user.user_type,
              company_name: user.company_name,
              is_employee: user.user_type === 'admin'
            }, {
              onConflict: 'user_id'
            })
            .select('id')
            .single();

          if (profileError) {
            console.warn(`  ⚠️ Failed to create profile for ${user.email}:`, profileError.message);
            continue;
          }
          profileId = newProfile.id;
          createdUserCount++;
          console.log(`  ✓ Created user and profile for ${user.email}`);
        }

        // Handle user-organization relationship
        if (user.organization_name && profileId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', user.organization_name)
            .single();

          if (org) {
            // Check if relationship already exists
            const { data: existingRelation } = await supabase
              .from('user_organizations')
              .select('id')
              .eq('user_id', profileId)
              .eq('organization_id', org.id)
              .single();

            if (!existingRelation) {
              const { error: relationError } = await supabase
                .from('user_organizations')
                .insert({
                  user_id: profileId,
                  organization_id: org.id
                });

              if (relationError) {
                console.warn(`  ⚠️ Failed to create organization relationship for ${user.email}:`, relationError.message);
              } else {
                console.log(`  ✓ Linked ${user.email} to ${user.organization_name}`);
              }
            }
          } else {
            console.warn(`  ⚠️ Organization not found: ${user.organization_name}`);
          }
        }

      } catch (error) {
        console.warn(`❌ Error processing user ${user.email}:`, error);
      }
    }

    console.log(`✅ Created ${createdUserCount} new users, updated ${updatedUserCount} existing users`);
    
    // Validate results
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('email, user_type, is_employee')
      .in('email', users.map(u => u.email));

    const { data: finalRelations } = await supabase
      .from('user_organizations')
      .select('*');

    console.log(`📊 Final validation: ${finalProfiles?.length || 0} profiles, ${finalRelations?.length || 0} organization relationships`);
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};