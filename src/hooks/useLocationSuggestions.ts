import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationSuggestion {
  location_number: string;
  location_name: string;
  location_street_address: string;
  location_city: string;
  location_state: string;
  location_zip_code: string;
  full_address: string;
  usage_count: number;
  last_used: string;
}

interface UseLocationSuggestionsOptions {
  organizationId?: string;
  searchTerm?: string;
  enabled?: boolean;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useLocationSuggestions({
  organizationId,
  searchTerm = '',
  enabled = true
}: UseLocationSuggestionsOptions) {
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 300);

  const fetchLocationSuggestions = useCallback(async (): Promise<LocationSuggestion[]> => {
    if (!organizationId) return [];

    let query = supabase
      .from('work_orders')
      .select(`
        partner_location_number,
        store_location,
        location_street_address,
        location_city,
        location_state,
        location_zip_code,
        street_address,
        city,
        state,
        zip_code,
        created_at
      `)
      .eq('organization_id', organizationId)
      .not('partner_location_number', 'is', null);

    // Apply search filters if term is provided
    if (debouncedSearchTerm) {
      query = query.or(
        `partner_location_number.ilike.%${debouncedSearchTerm}%,` +
        `store_location.ilike.%${debouncedSearchTerm}%,` +
        `location_street_address.ilike.%${debouncedSearchTerm}%,` +
        `location_city.ilike.%${debouncedSearchTerm}%,` +
        `street_address.ilike.%${debouncedSearchTerm}%,` +
        `city.ilike.%${debouncedSearchTerm}%`
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Process and aggregate results
    const locationMap = new Map<string, {
      location_number: string;
      location_name: string;
      location_street_address: string;
      location_city: string;
      location_state: string;
      location_zip_code: string;
      usage_count: number;
      last_used: string;
    }>();

    data?.forEach(wo => {
      if (!wo.partner_location_number) return;

      const key = wo.partner_location_number;
      const existing = locationMap.get(key);

      // Prefer structured address fields, fallback to legacy fields
      const streetAddress = wo.location_street_address || wo.street_address || '';
      const city = wo.location_city || wo.city || '';
      const state = wo.location_state || wo.state || '';
      const zipCode = wo.location_zip_code || wo.zip_code || '';

      if (existing) {
        existing.usage_count++;
        if (wo.created_at > existing.last_used) {
          existing.last_used = wo.created_at;
          // Update with most recent address info if more complete
          if (!existing.location_street_address && streetAddress) {
            existing.location_street_address = streetAddress;
          }
          if (!existing.location_city && city) {
            existing.location_city = city;
          }
          if (!existing.location_state && state) {
            existing.location_state = state;
          }
          if (!existing.location_zip_code && zipCode) {
            existing.location_zip_code = zipCode;
          }
        }
      } else {
        locationMap.set(key, {
          location_number: wo.partner_location_number,
          location_name: wo.store_location || '',
          location_street_address: streetAddress,
          location_city: city,
          location_state: state,
          location_zip_code: zipCode,
          usage_count: 1,
          last_used: wo.created_at
        });
      }
    });

    // Convert to array and add computed full_address
    const suggestions: LocationSuggestion[] = Array.from(locationMap.values())
      .map(location => ({
        ...location,
        full_address: [
          location.location_street_address,
          location.location_city,
          location.location_state,
          location.location_zip_code
        ].filter(Boolean).join(', ')
      }))
      .sort((a, b) => {
        // Sort by usage count desc, then by last used desc
        if (a.usage_count !== b.usage_count) {
          return b.usage_count - a.usage_count;
        }
        return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
      });

    return suggestions;
  }, [organizationId, debouncedSearchTerm]);

  return useQuery({
    queryKey: ['location-suggestions', organizationId, debouncedSearchTerm],
    queryFn: fetchLocationSuggestions,
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to format location for display
export function formatLocationDisplay(suggestion: LocationSuggestion): string {
  const parts = [suggestion.location_number];
  
  if (suggestion.location_name) {
    parts.push(`- ${suggestion.location_name}`);
  }
  
  if (suggestion.full_address) {
    parts.push(`(${suggestion.full_address})`);
  }
  
  return parts.join(' ');
}

// Helper function to generate directions URL
export function getDirectionsUrl(suggestion: LocationSuggestion): string {
  if (!suggestion.full_address) return '';
  
  const encodedAddress = encodeURIComponent(suggestion.full_address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
}