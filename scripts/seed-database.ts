import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

// Supabase Admin Client (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  "https://inudoymofztrvxhrlrek.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE2MjY1OSwiZXhwIjoyMDY3NzM4NjU5fQ.Ypex_XOLwpBjNI-RM7YbdZiOxYKKLKWHNOJX5jMOULs", // Service role key needed
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper Functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  userType: 'admin' | 'partner' | 'subcontractor',
  companyName?: string,
  phone?: string
) {
  console.log(`Creating user: ${email}`);
  
  // Create auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName
    }
  });

  if (authError) {
    console.error(`Error creating auth user ${email}:`, authError);
    return null;
  }

  // Create profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      user_id: authUser.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      company_name: companyName,
      phone
    })
    .select()
    .single();

  if (profileError) {
    console.error(`Error creating profile for ${email}:`, profileError);
    return null;
  }

  return profile;
}

async function assignUserToOrganization(userId: string, organizationId: string) {
  const { error } = await supabaseAdmin
    .from('user_organizations')
    .insert({
      user_id: userId,
      organization_id: organizationId
    });

  if (error) {
    console.error('Error assigning user to organization:', error);
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing seed data...');
  
  // Delete in reverse dependency order
  await supabaseAdmin.from('work_order_attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('work_order_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('user_organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('email_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Delete profiles (will cascade to auth users via trigger)
  const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id');
  if (profiles) {
    for (const profile of profiles) {
      await supabaseAdmin.auth.admin.deleteUser(profile.user_id);
    }
  }
  
  await supabaseAdmin.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await clearExistingData();

    // 1. Create Organizations
    console.log('📄 Creating organizations...');
    const organizations = await Promise.all([
      supabaseAdmin
        .from('organizations')
        .insert({
          name: 'ABC Property Management',
          contact_email: 'contact@abcproperty.com',
          contact_phone: '(555) 123-4567',
          address: '123 Business Ave, Chicago, IL 60601'
        })
        .select()
        .single(),
      supabaseAdmin
        .from('organizations')
        .insert({
          name: 'XYZ Commercial Properties',
          contact_email: 'info@xyzcommercial.com',
          contact_phone: '(555) 234-5678',
          address: '456 Corporate Blvd, Dallas, TX 75201'
        })
        .select()
        .single(),
      supabaseAdmin
        .from('organizations')
        .insert({
          name: 'Premium Facilities Group',
          contact_email: 'admin@premiumfacilities.com',
          contact_phone: '(555) 345-6789',
          address: '789 Enterprise Dr, Miami, FL 33101'
        })
        .select()
        .single()
    ]);

    const [abcOrg, xyzOrg, premiumOrg] = organizations.map(org => org.data!);

    // 2. Create Users
    console.log('👥 Creating users...');
    
    // Admins
    const admin1 = await createUser('admin@workorderpro.com', 'Test123!', 'John', 'Admin', 'admin', 'WorkOrderPro', '(555) 000-0001');
    const admin2 = await createUser('admin2@workorderpro.com', 'Test123!', 'Jane', 'Administrator', 'admin', 'WorkOrderPro', '(555) 000-0002');

    // Partners
    const partner1 = await createUser('partner1@abc.com', 'Test123!', 'Mike', 'Johnson', 'partner', 'ABC Property Management', '(555) 111-0001');
    const partner2 = await createUser('partner2@xyz.com', 'Test123!', 'Sarah', 'Davis', 'partner', 'XYZ Commercial Properties', '(555) 222-0001');
    const partner3 = await createUser('partner3@premium.com', 'Test123!', 'Robert', 'Wilson', 'partner', 'Premium Facilities Group', '(555) 333-0001');

    // Subcontractors
    const plumber = await createUser('plumber@trade.com', 'Test123!', 'Tom', 'Plumber', 'subcontractor', 'AquaFix Plumbing', '(555) 444-0001');
    const electrician = await createUser('electrician@trade.com', 'Test123!', 'Steve', 'Sparks', 'subcontractor', 'Bolt Electric', '(555) 444-0002');
    const hvac = await createUser('hvac@trade.com', 'Test123!', 'Alex', 'Climate', 'subcontractor', 'CoolAir HVAC', '(555) 444-0003');
    const carpenter = await createUser('carpenter@trade.com', 'Test123!', 'Bill', 'Builder', 'subcontractor', 'WoodCraft Carpentry', '(555) 444-0004');
    const painter = await createUser('painter@trade.com', 'Test123!', 'Pablo', 'Brush', 'subcontractor', 'ColorMaster Painting', '(555) 444-0005');
    const maintenance = await createUser('maintenance@trade.com', 'Test123!', 'Rick', 'Repair', 'subcontractor', 'FixIt Maintenance', '(555) 444-0006');
    const landscaper = await createUser('landscaper@trade.com', 'Test123!', 'Green', 'Thumb', 'subcontractor', 'GreenScape Landscaping', '(555) 444-0007');

    // Assign partners to organizations
    if (partner1) await assignUserToOrganization(partner1.id, abcOrg.id);
    if (partner2) await assignUserToOrganization(partner2.id, xyzOrg.id);
    if (partner3) await assignUserToOrganization(partner3.id, premiumOrg.id);

    // 3. Get existing trades
    console.log('🔧 Getting trades...');
    const { data: trades } = await supabaseAdmin.from('trades').select('*');
    const tradesMap = new Map(trades?.map(t => [t.name, t]) || []);

    // 4. Create Work Orders
    console.log('📋 Creating work orders...');
    const workOrdersData = [
      // Received (5)
      {
        title: 'Leaky Faucet in Office Kitchen',
        description: 'Main kitchen faucet is dripping constantly. Water pooling under sink.',
        store_location: 'ABC Chicago Main Office',
        street_address: '100 N Michigan Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60601',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Plumbing')?.id,
        status: 'received' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-12-01')
      },
      {
        title: 'Electrical Outlet Not Working',
        description: 'Conference room outlet has no power. Checked breaker - appears fine.',
        store_location: 'XYZ Dallas Office',
        street_address: '200 S Ervay St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('Electrical')?.id,
        status: 'received' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-12-02')
      },
      {
        title: 'HVAC Unit Making Noise',
        description: 'Roof unit making grinding noise. Temperature control seems affected.',
        store_location: 'Premium Miami Office',
        street_address: '300 Biscayne Blvd',
        city: 'Miami',
        state: 'FL',
        zip_code: '33101',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('HVAC')?.id,
        status: 'received' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-12-03')
      },
      {
        title: 'Ceiling Tile Replacement',
        description: 'Water damaged ceiling tiles in lobby need replacement.',
        store_location: 'ABC Chicago Branch',
        street_address: '400 W Madison St',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60661',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'received' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-12-04')
      },
      {
        title: 'Door Lock Replacement',
        description: 'Main entrance lock is sticking. Key sometimes doesn\'t turn.',
        store_location: 'XYZ Dallas Branch',
        street_address: '500 Commerce St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75202',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'received' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-12-05')
      },

      // Assigned (8)
      {
        title: 'Bathroom Sink Repair',
        description: 'Employee bathroom sink drain is clogged. Water backing up.',
        store_location: 'Premium Miami Branch',
        street_address: '600 SE 1st Ave',
        city: 'Miami',
        state: 'FL',
        zip_code: '33131',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Plumbing')?.id,
        status: 'assigned' as const,
        assigned_to: plumber?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-11-20'),
        date_assigned: new Date('2024-11-21'),
        estimated_completion_date: '2024-12-15'
      },
      {
        title: 'Light Fixture Installation',
        description: 'Install new LED fixtures in warehouse area. 6 units total.',
        store_location: 'ABC Chicago Warehouse',
        street_address: '700 W Lake St',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60661',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Electrical')?.id,
        status: 'assigned' as const,
        assigned_to: electrician?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-11-22'),
        date_assigned: new Date('2024-11-23'),
        estimated_completion_date: '2024-12-16'
      },
      {
        title: 'AC Filter Replacement',
        description: 'Replace all HVAC filters throughout building. Quarterly maintenance.',
        store_location: 'XYZ Dallas Main',
        street_address: '800 Main St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75202',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('HVAC')?.id,
        status: 'assigned' as const,
        assigned_to: hvac?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-11-25'),
        date_assigned: new Date('2024-11-26'),
        estimated_completion_date: '2024-12-17'
      },
      {
        title: 'Cabinet Door Repair',
        description: 'Kitchen cabinet door hinges loose. Door hanging crooked.',
        store_location: 'Premium Miami Main',
        street_address: '900 Flagler St',
        city: 'Miami',
        state: 'FL',
        zip_code: '33130',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Carpentry')?.id,
        status: 'assigned' as const,
        assigned_to: carpenter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-11-27'),
        date_assigned: new Date('2024-11-28'),
        estimated_completion_date: '2024-12-18'
      },
      {
        title: 'Office Wall Touch-up',
        description: 'Scuff marks and nail holes in conference room walls need touch-up.',
        store_location: 'ABC Chicago Tower',
        street_address: '1000 N State St',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60610',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Painting')?.id,
        status: 'assigned' as const,
        assigned_to: painter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-11-29'),
        date_assigned: new Date('2024-11-30'),
        estimated_completion_date: '2024-12-19'
      },
      {
        title: 'Window Cleaning Service',
        description: 'All exterior windows need professional cleaning. 2nd floor.',
        store_location: 'XYZ Dallas Tower',
        street_address: '1100 Elm St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'assigned' as const,
        assigned_to: maintenance?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-12-01'),
        date_assigned: new Date('2024-12-02'),
        estimated_completion_date: '2024-12-20'
      },
      {
        title: 'Landscaping Maintenance',
        description: 'Trim bushes and trees around building perimeter. Monthly service.',
        store_location: 'Premium Miami Garden',
        street_address: '1200 Ocean Dr',
        city: 'Miami',
        state: 'FL',
        zip_code: '33139',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Landscaping')?.id,
        status: 'assigned' as const,
        assigned_to: landscaper?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-12-03'),
        date_assigned: new Date('2024-12-04'),
        estimated_completion_date: '2024-12-21'
      },
      {
        title: 'OVERDUE: Parking Lot Lighting',
        description: 'Two parking lot lights are out. Safety concern for evening hours.',
        store_location: 'ABC Chicago Parking',
        street_address: '1300 W Division St',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60622',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Electrical')?.id,
        status: 'assigned' as const,
        assigned_to: electrician?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-11-01'),
        date_assigned: new Date('2024-11-02'),
        estimated_completion_date: '2024-11-15' // Overdue!
      },

      // In Progress (7)
      {
        title: 'Toilet Repair - Stall 3',
        description: 'Toilet in stall 3 runs continuously. Tank mechanism needs adjustment.',
        store_location: 'XYZ Dallas Restroom',
        street_address: '1400 Young St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('Plumbing')?.id,
        status: 'in_progress' as const,
        assigned_to: plumber?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-11-10'),
        date_assigned: new Date('2024-11-11'),
        estimated_completion_date: '2024-12-22'
      },
      {
        title: 'Breaker Panel Upgrade',
        description: 'Replace old breaker panel in utility room. Code compliance required.',
        store_location: 'Premium Miami Electrical',
        street_address: '1500 Collins Ave',
        city: 'Miami',
        state: 'FL',
        zip_code: '33139',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Electrical')?.id,
        status: 'in_progress' as const,
        assigned_to: electrician?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-11-12'),
        date_assigned: new Date('2024-11-13'),
        estimated_completion_date: '2024-12-23'
      },
      {
        title: 'Thermostat Replacement',
        description: 'Digital thermostat malfunctioning. Temperature readings inaccurate.',
        store_location: 'ABC Chicago HVAC',
        street_address: '1600 N Halsted St',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60614',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('HVAC')?.id,
        status: 'in_progress' as const,
        assigned_to: hvac?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-11-14'),
        date_assigned: new Date('2024-11-15'),
        estimated_completion_date: '2024-12-24'
      },
      {
        title: 'Shelving Installation',
        description: 'Install metal shelving units in storage room. 8 units needed.',
        store_location: 'XYZ Dallas Storage',
        street_address: '1700 Ross Ave',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('Carpentry')?.id,
        status: 'in_progress' as const,
        assigned_to: carpenter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-11-16'),
        date_assigned: new Date('2024-11-17'),
        estimated_completion_date: '2024-12-25'
      },
      {
        title: 'Exterior Wall Painting',
        description: 'South exterior wall needs complete repainting. Weather damage visible.',
        store_location: 'Premium Miami Exterior',
        street_address: '1800 Lincoln Rd',
        city: 'Miami',
        state: 'FL',
        zip_code: '33139',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Painting')?.id,
        status: 'in_progress' as const,
        assigned_to: painter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-11-18'),
        date_assigned: new Date('2024-11-19'),
        estimated_completion_date: '2024-12-26'
      },
      {
        title: 'Floor Tile Replacement',
        description: 'Replace cracked tiles in main lobby. 12 tiles need replacement.',
        store_location: 'ABC Chicago Lobby',
        street_address: '1900 W Chicago Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60622',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'in_progress' as const,
        assigned_to: maintenance?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-11-20'),
        date_assigned: new Date('2024-11-21'),
        estimated_completion_date: '2024-12-27'
      },
      {
        title: 'Garden Bed Renovation',
        description: 'Replace plants in front garden beds. Spring preparation work.',
        store_location: 'XYZ Dallas Garden',
        street_address: '2000 McKinney Ave',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('Landscaping')?.id,
        status: 'in_progress' as const,
        assigned_to: landscaper?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-11-22'),
        date_assigned: new Date('2024-11-23'),
        estimated_completion_date: '2024-12-28'
      },

      // Completed (8)
      {
        title: 'Kitchen Faucet Replacement',
        description: 'Replace old kitchen faucet with new energy-efficient model.',
        store_location: 'Premium Miami Kitchen',
        street_address: '2100 Coral Way',
        city: 'Miami',
        state: 'FL',
        zip_code: '33145',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Plumbing')?.id,
        status: 'completed' as const,
        assigned_to: plumber?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-10-01'),
        date_assigned: new Date('2024-10-02'),
        date_completed: new Date('2024-10-15'),
        actual_completion_date: '2024-10-15',
        final_completion_date: '2024-10-15',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 450.00
      },
      {
        title: 'Outlet Installation - Conference Room',
        description: 'Install 4 new outlets in conference room for AV equipment.',
        store_location: 'ABC Chicago Conference',
        street_address: '2200 N Lincoln Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60614',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Electrical')?.id,
        status: 'completed' as const,
        assigned_to: electrician?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-10-03'),
        date_assigned: new Date('2024-10-04'),
        date_completed: new Date('2024-10-18'),
        actual_completion_date: '2024-10-18',
        final_completion_date: '2024-10-18',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 850.00
      },
      {
        title: 'Air Vent Cleaning',
        description: 'Professional cleaning of all air vents and ducts in building.',
        store_location: 'XYZ Dallas HVAC Clean',
        street_address: '2300 Commerce St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('HVAC')?.id,
        status: 'completed' as const,
        assigned_to: hvac?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-10-05'),
        date_assigned: new Date('2024-10-06'),
        date_completed: new Date('2024-10-20'),
        actual_completion_date: '2024-10-20',
        final_completion_date: '2024-10-20',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 1200.00
      },
      {
        title: 'Conference Table Repair',
        description: 'Repair scratches and refinish conference room table surface.',
        store_location: 'Premium Miami Conference',
        street_address: '2400 SW 8th St',
        city: 'Miami',
        state: 'FL',
        zip_code: '33135',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Carpentry')?.id,
        status: 'completed' as const,
        assigned_to: carpenter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-10-07'),
        date_assigned: new Date('2024-10-08'),
        date_completed: new Date('2024-10-22'),
        actual_completion_date: '2024-10-22',
        final_completion_date: '2024-10-22',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 650.00
      },
      {
        title: 'Office Repainting - 3rd Floor',
        description: 'Complete repainting of 3rd floor office spaces. New corporate colors.',
        store_location: 'ABC Chicago 3rd Floor',
        street_address: '2500 N Clybourn Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60614',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('Painting')?.id,
        status: 'completed' as const,
        assigned_to: painter?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-10-09'),
        date_assigned: new Date('2024-10-10'),
        date_completed: new Date('2024-10-25'),
        actual_completion_date: '2024-10-25',
        final_completion_date: '2024-10-25',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 2400.00
      },
      {
        title: 'Carpet Cleaning Service',
        description: 'Deep clean all carpeted areas. Quarterly maintenance service.',
        store_location: 'XYZ Dallas Carpet',
        street_address: '2600 Turtle Creek Blvd',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75219',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'completed' as const,
        assigned_to: maintenance?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-10-11'),
        date_assigned: new Date('2024-10-12'),
        date_completed: new Date('2024-10-28'),
        actual_completion_date: '2024-10-28',
        final_completion_date: '2024-10-28',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 800.00
      },
      {
        title: 'Seasonal Landscaping',
        description: 'Fall cleanup and winter preparation for all landscaped areas.',
        store_location: 'Premium Miami Landscape',
        street_address: '2700 Biscayne Blvd',
        city: 'Miami',
        state: 'FL',
        zip_code: '33137',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Landscaping')?.id,
        status: 'completed' as const,
        assigned_to: landscaper?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-10-13'),
        date_assigned: new Date('2024-10-14'),
        date_completed: new Date('2024-10-30'),
        actual_completion_date: '2024-10-30',
        final_completion_date: '2024-10-30',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 1500.00
      },
      {
        title: 'Security System Maintenance',
        description: 'Annual maintenance and testing of building security system.',
        store_location: 'ABC Chicago Security',
        street_address: '2800 N Sheffield Ave',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60657',
        organization_id: abcOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'completed' as const,
        assigned_to: maintenance?.id,
        assigned_to_type: 'subcontractor' as const,
        created_by: partner1?.id,
        date_submitted: new Date('2024-10-15'),
        date_assigned: new Date('2024-10-16'),
        date_completed: new Date('2024-11-01'),
        actual_completion_date: '2024-11-01',
        final_completion_date: '2024-11-01',
        subcontractor_report_submitted: true,
        subcontractor_invoice_amount: 950.00
      },

      // Cancelled (2)
      {
        title: 'Window Replacement Project',
        description: 'Replace all windows on 2nd floor. Project scope changed.',
        store_location: 'XYZ Dallas Windows',
        street_address: '2900 Live Oak St',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75204',
        organization_id: xyzOrg.id,
        trade_id: tradesMap.get('General Maintenance')?.id,
        status: 'cancelled' as const,
        created_by: partner2?.id,
        date_submitted: new Date('2024-09-01'),
        admin_completion_notes: 'Project cancelled due to budget constraints. Will revisit next quarter.'
      },
      {
        title: 'Roof Leak Investigation',
        description: 'Investigate reported roof leak in northeast corner of building.',
        store_location: 'Premium Miami Roof',
        street_address: '3000 NE 1st Ave',
        city: 'Miami',
        state: 'FL',
        zip_code: '33137',
        organization_id: premiumOrg.id,
        trade_id: tradesMap.get('Roofing')?.id,
        status: 'cancelled' as const,
        created_by: partner3?.id,
        date_submitted: new Date('2024-09-15'),
        admin_completion_notes: 'False alarm. No leak found after further inspection.'
      }
    ];

    const workOrders = [];
    for (const woData of workOrdersData) {
      const { data: workOrder } = await supabaseAdmin
        .from('work_orders')
        .insert(woData)
        .select()
        .single();
      
      if (workOrder) {
        // Generate work order number
        const { data: workOrderNumber } = await supabaseAdmin.rpc('generate_work_order_number');
        if (workOrderNumber) {
          await supabaseAdmin
            .from('work_orders')
            .update({ work_order_number: workOrderNumber })
            .eq('id', workOrder.id);
          workOrder.work_order_number = workOrderNumber;
        }
        workOrders.push(workOrder);
      }
    }

    // 5. Create Work Order Reports for completed orders
    console.log('📊 Creating work order reports...');
    const completedOrders = workOrders.filter(wo => wo.status === 'completed');
    const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress');
    
    const reportsData = [
      // Reports for completed orders
      ...completedOrders.slice(0, 6).map((wo, index) => ({
        work_order_id: wo.id,
        subcontractor_user_id: wo.assigned_to,
        work_performed: `Completed ${wo.title.toLowerCase()}. ${index % 2 === 0 ? 'All work performed according to specifications.' : 'Work completed with minor modifications as discussed with client.'}`,
        materials_used: index % 3 === 0 ? 'Standard materials from supplier inventory' : index % 3 === 1 ? 'Premium materials as requested by client' : 'Eco-friendly materials used per company policy',
        hours_worked: 2 + (index * 1.5),
        invoice_amount: wo.subcontractor_invoice_amount || (200 + index * 100),
        invoice_number: `INV-2024-${String(1000 + index).padStart(4, '0')}`,
        notes: index % 2 === 0 ? 'Work completed without issues.' : 'Minor delays due to material delivery, but completed on schedule.',
        status: 'approved' as const,
        reviewed_by_user_id: index % 2 === 0 ? admin1?.id : admin2?.id,
        reviewed_at: addDays(new Date(wo.date_completed!), 1).toISOString(),
        review_notes: 'Work quality excellent. Invoice approved for payment.'
      })),
      
      // Reports for some in-progress orders
      ...inProgressOrders.slice(0, 4).map((wo, index) => ({
        work_order_id: wo.id,
        subcontractor_user_id: wo.assigned_to,
        work_performed: `Progress update for ${wo.title.toLowerCase()}. Work is ${25 + index * 20}% complete.`,
        materials_used: index % 2 === 0 ? 'Materials delivered and staged' : 'Additional materials ordered',
        hours_worked: 1 + (index * 0.5),
        invoice_amount: 100 + (index * 50),
        invoice_number: `INV-2024-${String(2000 + index).padStart(4, '0')}`,
        notes: 'Work progressing as scheduled. No issues to report.',
        status: index % 2 === 0 ? 'submitted' as const : 'reviewed' as const,
        reviewed_by_user_id: index % 2 === 0 ? null : (index % 4 === 1 ? admin1?.id : admin2?.id),
        reviewed_at: index % 2 === 0 ? null : new Date().toISOString(),
        review_notes: index % 2 === 0 ? null : 'Progress looks good. Continue as planned.'
      })),

      // Some pending reports
      {
        work_order_id: inProgressOrders[4]?.id,
        subcontractor_user_id: inProgressOrders[4]?.assigned_to,
        work_performed: 'Completed material assessment and started work. Foundation work in progress.',
        materials_used: 'Concrete, rebar, waterproofing materials',
        hours_worked: 8,
        invoice_amount: 750,
        invoice_number: 'INV-2024-3001',
        notes: 'Weather delays on first day, but caught up on schedule.',
        status: 'submitted' as const
      },
      {
        work_order_id: inProgressOrders[5]?.id,
        subcontractor_user_id: inProgressOrders[5]?.assigned_to,
        work_performed: 'Initial site preparation completed. Materials organized and work area secured.',
        materials_used: 'Safety equipment, staging materials, tools',
        hours_worked: 4,
        invoice_amount: 300,
        invoice_number: 'INV-2024-3002',
        notes: 'Site prep went smoothly. Ready to begin main work phase.',
        status: 'submitted' as const
      }
    ].filter(report => report.work_order_id); // Filter out any undefined work_order_ids

    for (const reportData of reportsData) {
      await supabaseAdmin
        .from('work_order_reports')
        .insert(reportData);
    }

    // 6. Create Work Order Attachments
    console.log('📎 Creating work order attachments...');
    const attachmentsData = [
      {
        work_order_id: completedOrders[0]?.id,
        file_name: 'before_repair.jpg',
        file_url: 'https://placeholder.co/600x400/png?text=Before+Repair',
        file_type: 'photo' as const,
        file_size: 245760,
        uploaded_by_user_id: completedOrders[0]?.assigned_to
      },
      {
        work_order_id: completedOrders[0]?.id,
        file_name: 'after_repair.jpg',
        file_url: 'https://placeholder.co/600x400/png?text=After+Repair',
        file_type: 'photo' as const,
        file_size: 287360,
        uploaded_by_user_id: completedOrders[0]?.assigned_to
      },
      {
        work_order_id: completedOrders[1]?.id,
        file_name: 'electrical_schematic.pdf',
        file_url: 'https://placeholder.co/600x400/png?text=Electrical+Schematic',
        file_type: 'document' as const,
        file_size: 1024000,
        uploaded_by_user_id: completedOrders[1]?.assigned_to
      },
      {
        work_order_id: completedOrders[2]?.id,
        file_name: 'invoice_hvac_cleaning.pdf',
        file_url: 'https://placeholder.co/600x400/png?text=HVAC+Invoice',
        file_type: 'invoice' as const,
        file_size: 156432,
        uploaded_by_user_id: completedOrders[2]?.assigned_to
      },
      {
        work_order_id: inProgressOrders[0]?.id,
        file_name: 'progress_photo_1.jpg',
        file_url: 'https://placeholder.co/600x400/png?text=Progress+Photo+1',
        file_type: 'photo' as const,
        file_size: 334567,
        uploaded_by_user_id: inProgressOrders[0]?.assigned_to
      },
      {
        work_order_id: inProgressOrders[1]?.id,
        file_name: 'material_receipt.pdf',
        file_url: 'https://placeholder.co/600x400/png?text=Material+Receipt',
        file_type: 'document' as const,
        file_size: 89432,
        uploaded_by_user_id: inProgressOrders[1]?.assigned_to
      },
      {
        work_order_id: inProgressOrders[2]?.id,
        file_name: 'site_photo.jpg',
        file_url: 'https://placeholder.co/600x400/png?text=Site+Photo',
        file_type: 'photo' as const,
        file_size: 456123,
        uploaded_by_user_id: inProgressOrders[2]?.assigned_to
      },
      {
        work_order_id: inProgressOrders[3]?.id,
        file_name: 'work_permit.pdf',
        file_url: 'https://placeholder.co/600x400/png?text=Work+Permit',
        file_type: 'document' as const,
        file_size: 234567,
        uploaded_by_user_id: inProgressOrders[3]?.assigned_to
      }
    ].filter(attachment => attachment.work_order_id); // Filter out any undefined work_order_ids

    for (const attachmentData of attachmentsData) {
      await supabaseAdmin
        .from('work_order_attachments')
        .insert(attachmentData);
    }

    // 7. Update email templates with better content
    console.log('📧 Updating email templates...');
    const emailTemplatesData = [
      {
        template_name: 'work_order_received',
        subject: 'New Work Order Received - {{work_order_number}}',
        html_content: `
          <h2>New Work Order Received</h2>
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Location:</strong> {{store_location}}</p>
          <p><strong>Address:</strong> {{street_address}}, {{city}}, {{state}} {{zip_code}}</p>
          <p><strong>Trade:</strong> {{trade_name}}</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Submitted:</strong> {{date_submitted}}</p>
          <p>This work order has been received and is pending assignment.</p>
        `,
        text_content: 'New Work Order Received: {{work_order_number}}\nLocation: {{store_location}}\nDescription: {{description}}'
      },
      {
        template_name: 'work_order_assigned',
        subject: 'Work Order Assignment - {{work_order_number}}',
        html_content: `
          <h2>Work Order Assignment</h2>
          <p>You have been assigned to work order {{work_order_number}}.</p>
          <p><strong>Location:</strong> {{store_location}}</p>
          <p><strong>Address:</strong> {{street_address}}, {{city}}, {{state}} {{zip_code}}</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Expected Completion:</strong> {{estimated_completion_date}}</p>
          <p>Please contact the client to schedule the work.</p>
        `,
        text_content: 'Work Order Assignment: {{work_order_number}}\nLocation: {{store_location}}\nDescription: {{description}}'
      },
      {
        template_name: 'report_submitted',
        subject: 'Work Report Submitted - {{work_order_number}}',
        html_content: `
          <h2>Work Report Submitted</h2>
          <p>A work report has been submitted for work order {{work_order_number}}.</p>
          <p><strong>Submitted by:</strong> {{subcontractor_name}}</p>
          <p><strong>Work Performed:</strong> {{work_performed}}</p>
          <p><strong>Invoice Amount:</strong> ${{invoice_amount}}</p>
          <p>Please review and approve the report in the admin dashboard.</p>
        `,
        text_content: 'Work Report Submitted for {{work_order_number}}\nSubmitted by: {{subcontractor_name}}\nAmount: ${{invoice_amount}}'
      },
      {
        template_name: 'report_approved',
        subject: 'Work Report Approved - {{work_order_number}}',
        html_content: `
          <h2>Work Report Approved</h2>
          <p>Your work report for {{work_order_number}} has been approved.</p>
          <p><strong>Invoice Amount:</strong> ${{invoice_amount}}</p>
          <p><strong>Review Notes:</strong> {{review_notes}}</p>
          <p>Payment will be processed according to standard terms.</p>
        `,
        text_content: 'Work Report Approved for {{work_order_number}}\nAmount: ${{invoice_amount}}\nNotes: {{review_notes}}'
      },
      {
        template_name: 'work_order_completed',
        subject: 'Work Order Completed - {{work_order_number}}',
        html_content: `
          <h2>Work Order Completed</h2>
          <p>Work order {{work_order_number}} has been completed.</p>
          <p><strong>Location:</strong> {{store_location}}</p>
          <p><strong>Completed by:</strong> {{subcontractor_name}}</p>
          <p><strong>Completion Date:</strong> {{actual_completion_date}}</p>
          <p><strong>Final Cost:</strong> ${{subcontractor_invoice_amount}}</p>
          <p>Thank you for your business!</p>
        `,
        text_content: 'Work Order Completed: {{work_order_number}}\nLocation: {{store_location}}\nCompleted: {{actual_completion_date}}'
      }
    ];

    for (const template of emailTemplatesData) {
      await supabaseAdmin
        .from('email_templates')
        .upsert(template, { onConflict: 'template_name' });
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Organizations: 3`);
    console.log(`   • Users: 12 (2 admins, 3 partners, 7 subcontractors)`);
    console.log(`   • Work Orders: ${workOrders.length}`);
    console.log(`   • Work Order Reports: ${reportsData.length}`);
    console.log(`   • Attachments: ${attachmentsData.length}`);
    console.log(`   • Email Templates: 5`);
    console.log('\n🔑 Test Login Credentials:');
    console.log('   Admin: admin@workorderpro.com / Test123!');
    console.log('   Partner: partner1@abc.com / Test123!');
    console.log('   Subcontractor: plumber@trade.com / Test123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();