
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  organizations: { name: string } | null;
  trades: { name: string } | null;
  attachment_count?: number;
  work_order_assignments?: Array<{
    assigned_to: string;
    assignment_type: string;
    profiles?: {
      first_name: string;
      last_name: string;
    } | null;
  }>;
  location_contact_name?: string | null;
  location_contact_phone?: string | null;
  location_contact_email?: string | null;
};

interface WorkOrderFilters {
  status?: string[];
  trade_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export function usePartnerWorkOrders(filters?: WorkOrderFilters) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['partner-work-orders', filters, profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);
      
      if (organizationIds.length === 0) {
        return { data: [], totalCount: 0 };
      }

      let query = supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name),
          trades!trade_id(name),
          work_order_attachments(count),
          work_order_assignments(
            assigned_to,
            assignment_type,
            profiles!work_order_assignments_assigned_to_fkey(first_name, last_name)
          )
        `, { count: 'exact' })
        .in('organization_id', organizationIds);

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['work_order_status'][]);
      }
      if (filters?.trade_id) {
        query = query.eq('trade_id', filters.trade_id);
      }
      if (filters?.search) {
        query = query.or(`work_order_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%,store_location.ilike.%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('date_submitted', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('date_submitted', filters.date_to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;

      // Transform data to include attachment count
      const transformedData = (data || []).map((wo: any) => ({
        ...wo,
        attachment_count: wo.work_order_attachments?.[0]?.count || 0
      }));

      return {
        data: transformedData,
        totalCount: count || 0,
      };
    },
    enabled: !!profile?.id,
  });
}

export function usePartnerWorkOrderStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['partner-work-order-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);
      
      if (organizationIds.length === 0) {
        return {
          total: 0,
          active: 0,
          completedThisMonth: 0,
          avgCompletionDays: 0
        };
      }

      // Get all work orders for user's organizations
      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select('status, date_submitted, date_completed')
        .in('organization_id', organizationIds);

      if (error) throw error;

      const total = workOrders.length;
      const active = workOrders.filter(wo => 
        ['received', 'assigned', 'in_progress'].includes(wo.status)
      ).length;

      // Completed this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const completedThisMonth = workOrders.filter(wo => 
        wo.status === 'completed' && 
        wo.date_completed && 
        new Date(wo.date_completed) >= thisMonth
      ).length;

      // Average completion time
      const completedWithDates = workOrders.filter(wo => 
        wo.status === 'completed' && wo.date_submitted && wo.date_completed
      );
      
      let avgCompletionDays = 0;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, wo) => {
          const submitted = new Date(wo.date_submitted);
          const completed = new Date(wo.date_completed!);
          const diffDays = Math.ceil((completed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        avgCompletionDays = Math.round(totalDays / completedWithDates.length);
      }

      return {
        total,
        active,
        completedThisMonth,
        avgCompletionDays
      };
    },
    enabled: !!profile?.id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (workOrder: {
      title: string;
      store_location: string;
      street_address: string;
      city: string;
      state: string;
      zip_code: string;
      location_street_address?: string;
      location_city?: string;
      location_state?: string;
      location_zip_code?: string;
      location_contact_name?: string;
      location_contact_email?: string;
      location_contact_phone?: string;
      trade_id: string;
      description: string;
      organization_id: string;
      partner_po_number?: string;
      partner_location_number?: string;
      location_name?: string;
    }) => {
      if (!profile?.id) throw new Error('No user profile');

      // Partner location validation and auto-fill
      let validatedWorkOrder = { ...workOrder };

      if (workOrder.partner_location_number && workOrder.organization_id) {
        try {
          const { data: partnerLocation, error: locationError } = await supabase
            .from('partner_locations')
            .select('location_name, location_number')
            .eq('organization_id', workOrder.organization_id)
            .eq('location_number', workOrder.partner_location_number)
            .eq('is_active', true)
            .maybeSingle();

          if (locationError) {
            console.warn('Partner location validation failed:', locationError.message);
          } else if (partnerLocation) {
            // Auto-fill location_name and store_location from partner_locations
            validatedWorkOrder.location_name = partnerLocation.location_name;
            validatedWorkOrder.store_location = partnerLocation.location_name;
          } else {
            console.warn(`Partner location not found: location_number '${workOrder.partner_location_number}' does not exist for organization '${workOrder.organization_id}'`);
          }
        } catch (validationError) {
          console.warn('Partner location validation error:', validationError);
        }
      }

      // Generate work order number first
      let workOrderNumber: string;
      
      // Determine location code
      let locationCode = validatedWorkOrder.partner_location_number;
      
      // If organization doesn't use partner location numbers, auto-generate
      if (!locationCode) {
        const { data: nextLocationCode, error: locationError } = await supabase.rpc(
          'generate_next_location_number',
          { org_id: validatedWorkOrder.organization_id }
        );
        
        if (locationError) throw new Error(`Error generating location number: ${locationError.message}`);
        if (!nextLocationCode) throw new Error('Failed to generate location number');
        
        locationCode = nextLocationCode;
      }
      
      // Generate the actual work order number (this increments the sequence)
      const { data: generatedNumber, error: numberError } = await supabase.rpc(
        'generate_work_order_number_per_location',
        { 
          org_id: validatedWorkOrder.organization_id,
          location_code: locationCode
        }
      );
      
      if (numberError) throw new Error(`Error generating work order number: ${numberError.message}`);
      if (!generatedNumber) throw new Error('Failed to generate work order number');
      
      workOrderNumber = generatedNumber;

      const { data, error } = await supabase
        .from('work_orders')
        .insert({
          work_order_number: workOrderNumber,
          title: validatedWorkOrder.title,
          description: validatedWorkOrder.description,
          organization_id: validatedWorkOrder.organization_id,
          trade_id: validatedWorkOrder.trade_id,
          store_location: validatedWorkOrder.store_location || null,
          street_address: validatedWorkOrder.street_address || null,
          city: validatedWorkOrder.city || null,
          state: validatedWorkOrder.state || null,
          zip_code: validatedWorkOrder.zip_code || null,
          location_street_address: validatedWorkOrder.location_street_address || null,
          location_city: validatedWorkOrder.location_city || null,
          location_state: validatedWorkOrder.location_state || null,
          location_zip_code: validatedWorkOrder.location_zip_code || null,
          location_name: validatedWorkOrder.location_name || null,
          partner_po_number: validatedWorkOrder.partner_po_number || null,
          partner_location_number: locationCode,
          created_by: profile.id,
          status: 'received',
          date_submitted: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      try {
        // Check if we should create a new partner location
        const isNewLocation = !variables.partner_location_number && 
          variables.organization_id &&
          variables.store_location &&
          variables.location_street_address &&
          variables.location_city &&
          variables.location_state &&
          variables.location_zip_code;

        if (isNewLocation) {
          // Check if organization uses partner location numbers
          const { data: org } = await supabase
            .from('organizations')
            .select('uses_partner_location_numbers')
            .eq('id', variables.organization_id)
            .single();

          // FIXED: Corrected the logic - auto-generate when org DOES NOT use location numbers
          if (!org?.uses_partner_location_numbers) {
            // Generate new location number for organizations that don't use custom location numbers
            const { data: locationNumber, error: genError } = await supabase
              .rpc('generate_next_location_number', { org_id: variables.organization_id });

            if (!genError && locationNumber) {
              const insertData = {
                organization_id: variables.organization_id,
                location_number: locationNumber,
                location_name: variables.store_location,
                street_address: variables.location_street_address,
                city: variables.location_city,
                state: variables.location_state,
                zip_code: variables.location_zip_code,
                contact_name: variables.location_contact_name || null,
                contact_email: variables.location_contact_email || null,
                contact_phone: variables.location_contact_phone || null,
                is_active: true
              };

              // Create the partner location
              const { error: createError } = await supabase
                .from('partner_locations')
                .insert(insertData);

              if (!createError) {
                // Update the work order with the new location number
                await supabase
                  .from('work_orders')
                  .update({ partner_location_number: locationNumber })
                  .eq('id', data.id);

                queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
                
                toast({
                  title: 'New location added',
                  description: `Location "${variables.store_location}" has been saved with number ${locationNumber}`
                });
              }
            }
          }
        }

        // Handle existing partner location with provided location number
        const shouldSaveLocation = variables.partner_location_number && 
          variables.organization_id &&
          variables.location_street_address &&
          variables.location_city &&
          variables.location_state &&
          variables.location_zip_code;

        if (shouldSaveLocation) {
          // Check if location already exists
          const { data: existingLocation } = await supabase
            .from('partner_locations')
            .select('id')
            .eq('organization_id', variables.organization_id)
            .eq('location_number', variables.partner_location_number!)
            .maybeSingle();

          // Only create if location doesn't exist
          if (!existingLocation) {
              const { error: locationError } = await supabase
                .from('partner_locations')
                .insert({
                  organization_id: variables.organization_id,
                  location_number: variables.partner_location_number!,
                  location_name: variables.store_location || variables.location_name || 'New Location',
                  street_address: variables.location_street_address,
                  city: variables.location_city,
                  state: variables.location_state,
                  zip_code: variables.location_zip_code,
                  contact_name: variables.location_contact_name || null,
                  contact_email: variables.location_contact_email || null,
                  contact_phone: variables.location_contact_phone || null,
                  is_active: true
                });

            if (locationError) {
              console.warn('Failed to auto-save partner location:', locationError.message);
            } else {
              queryClient.invalidateQueries({ queryKey: ['partner-locations'] });
              console.log('Auto-saved new partner location:', variables.partner_location_number);
            }
          }
        }
      } catch (error) {
        console.warn('Error during location auto-creation:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['partner-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['partner-work-order-stats'] });
      toast({ 
        title: 'Work order submitted successfully', 
        description: `Work Order #${data.work_order_number} has been created.`
      });
      return data;
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating work order', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

export function useWorkOrderById(id: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['work-order', id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user profile');

      // Get user's organizations first
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', profile.id);

      if (userOrgsError) throw userOrgsError;
      
      const organizationIds = userOrgs.map(org => org.organization_id);

      // First query: Get work order details
      const { data: workOrder, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          organizations!organization_id(name, contact_email, contact_phone),
          trades!trade_id(name, description),
          
          created_user:profiles!created_by(first_name, last_name)
        `)
        .eq('id', id)
        .in('organization_id', organizationIds)
        .single();

      if (error) throw error;

      // Second query: Get partner location contact info if available
      let locationContactInfo = null;
      if (workOrder.partner_location_number && workOrder.organization_id) {
        const { data: locationData } = await supabase
          .from('partner_locations')
          .select('contact_name, contact_phone, contact_email')
          .eq('organization_id', workOrder.organization_id)
          .eq('location_number', workOrder.partner_location_number)
          .maybeSingle();

        locationContactInfo = locationData;
      }

      // Merge the results
      return {
        ...workOrder,
        location_contact_name: locationContactInfo?.contact_name || null,
        location_contact_phone: locationContactInfo?.contact_phone || null,
        location_contact_email: locationContactInfo?.contact_email || null,
      };
    },
    enabled: !!profile?.id && !!id,
  });
}
