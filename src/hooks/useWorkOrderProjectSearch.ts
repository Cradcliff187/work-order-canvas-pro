import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface WorkOrderProjectItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  location?: string;
  organization_name?: string;
  organization_initials?: string;
  status?: string;
}

export function useWorkOrderProjectSearch(searchTerm: string) {
  const [items, setItems] = useState<WorkOrderProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    let isMounted = true;

    async function fetchItems() {
      setLoading(true);
      try {
        const results: WorkOrderProjectItem[] = [];

        // Search work orders
        let workOrderQuery = supabase
          .from('work_orders')
          .select(`
            id,
            work_order_number,
            title,
            store_location,
            status,
            organizations!organization_id(name, initials)
          `)
          .limit(50);

        if (debouncedSearch) {
          const searchPattern = `%${debouncedSearch.trim()}%`;
          workOrderQuery = workOrderQuery.or(
            `work_order_number.ilike.${searchPattern},title.ilike.${searchPattern},store_location.ilike.${searchPattern}`
          );
        }

        const { data: workOrders, error: woError } = await workOrderQuery;
        if (woError) throw woError;

        // Transform work orders
        if (workOrders) {
          results.push(...workOrders.map(wo => ({
            id: wo.id,
            type: 'work_order' as const,
            number: wo.work_order_number,
            title: wo.title || '',
            location: wo.store_location || undefined,
            organization_name: wo.organizations?.name,
            organization_initials: wo.organizations?.initials,
            status: wo.status,
          })));
        }

        // Search projects - removed status filter to show all projects
        let projectQuery = supabase
          .from('projects')
          .select(`
            id,
            project_number,
            name,
            location_address,
            status,
            organizations!organization_id(name, initials)
          `)
          .limit(50);

        if (debouncedSearch) {
          const searchPattern = `%${debouncedSearch.trim()}%`;
          projectQuery = projectQuery.or(
            `project_number.ilike.${searchPattern},name.ilike.${searchPattern},location_address.ilike.${searchPattern}`
          );
        }

        const { data: projects, error: projError } = await projectQuery;
        if (projError) throw projError;

        // Transform projects
        if (projects) {
          results.push(...projects.map(proj => ({
            id: proj.id,
            type: 'project' as const,
            number: proj.project_number || proj.name,
            title: proj.name || '',
            location: proj.location_address || undefined,
            organization_name: proj.organizations?.name,
            organization_initials: proj.organizations?.initials,
          })));
        }

        if (isMounted) {
          setItems(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (isMounted) {
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchItems();
    return () => { isMounted = false; };
  }, [debouncedSearch]);

  return { items, loading };
}

// Helper function to fetch a single item by ID and type
export async function fetchItemById(id: string, type: 'work_order' | 'project'): Promise<WorkOrderProjectItem | null> {
  try {
    if (type === 'work_order') {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          title,
          store_location,
          status,
          organizations!organization_id(name, initials)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: 'work_order',
        number: data.work_order_number,
        title: data.title || '',
        location: data.store_location || undefined,
        organization_name: data.organizations?.name,
        organization_initials: data.organizations?.initials,
        status: data.status,
      };
    } else {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_number,
          name,
          location_address,
          status,
          organizations!organization_id(name, initials)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: 'project',
        number: data.project_number || data.name,
        title: data.name || '',
        location: data.location_address || undefined,
        organization_name: data.organizations?.name,
        organization_initials: data.organizations?.initials,
      };
    }
  } catch (error) {
    console.error('Error fetching item by ID:', error);
    return null;
  }
}