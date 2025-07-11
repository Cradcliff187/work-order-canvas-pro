import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWorkOrderNumberGenerationProps {
  organizationId?: string;
  locationNumber?: string;
}

interface WorkOrderNumberResult {
  workOrderNumber: string;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  warning: string | null;
  requiresInitials: boolean;
  organizationName?: string;
}

export function useWorkOrderNumberGeneration({ organizationId, locationNumber }: UseWorkOrderNumberGenerationProps): WorkOrderNumberResult {
  const [workOrderNumber, setWorkOrderNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresInitials, setRequiresInitials] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!organizationId) {
      setWorkOrderNumber('');
      setError(null);
      setIsFallback(false);
      setWarning(null);
      setRequiresInitials(false);
      setOrganizationName(undefined);
      return;
    }

    const generateNumber = async () => {
      setIsLoading(true);
      setError(null);
      setWarning(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('generate_work_order_number_v2', {
          org_id: organizationId,
          location_number: locationNumber || null
        });

        if (rpcError) {
          console.error('RPC Error generating work order number:', rpcError);
          // Try fallback to simple generation
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('generate_work_order_number_simple', {
            org_id: organizationId,
            location_number: locationNumber || null
          });
          
          if (fallbackError) {
            throw new Error(`Failed to generate work order number: ${rpcError.message}`);
          }
          
          setWorkOrderNumber(fallbackData || '');
          setIsFallback(true);
          setWarning('Using fallback numbering due to system error');
          setRequiresInitials(false);
          return;
        }

        if (data && typeof data === 'object') {
          const result = data as any;
          setWorkOrderNumber(result.work_order_number || '');
          setIsFallback(result.is_fallback || false);
          setWarning(result.warning || null);
          setRequiresInitials(result.requires_initials || false);
          setOrganizationName(result.organization_name);
          
          // Log for monitoring if using fallback
          if (result.is_fallback) {
            console.warn('Work order number generation using fallback:', result.warning);
          }
        } else {
          // Handle legacy string response
          setWorkOrderNumber(String(data || ''));
          setIsFallback(false);
          setWarning(null);
          setRequiresInitials(false);
        }
      } catch (err) {
        console.error('Error generating work order number:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate work order number';
        setError(errorMessage);
        setWorkOrderNumber('');
        setIsFallback(false);
        setWarning(null);
        setRequiresInitials(false);
      } finally {
        setIsLoading(false);
      }
    };

    generateNumber();
  }, [organizationId, locationNumber]);

  return {
    workOrderNumber,
    isLoading,
    error,
    isFallback,
    warning,
    requiresInitials,
    organizationName,
  };
}