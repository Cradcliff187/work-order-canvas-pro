import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseWorkOrderNumberGenerationProps {
  organizationId?: string;
  locationNumber?: string;
}

export function useWorkOrderNumberGeneration({ organizationId, locationNumber }: UseWorkOrderNumberGenerationProps) {
  const [workOrderNumber, setWorkOrderNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setWorkOrderNumber('');
      setError(null);
      return;
    }

    const generateNumber = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('generate_work_order_number_v2', {
          org_id: organizationId,
          location_number: locationNumber || null
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setWorkOrderNumber(data || '');
      } catch (err) {
        console.error('Error generating work order number:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate work order number');
        setWorkOrderNumber('');
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
  };
}