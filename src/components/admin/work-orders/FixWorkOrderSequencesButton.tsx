import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface FixResult {
  success: boolean;
  locations_fixed?: number;
  message: string;
}

export function FixWorkOrderSequencesButton(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const { toast } = useToast();

  const handleFixSequences = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('fix_work_order_sequence_numbers');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const fixResult = data as unknown as FixResult;
      setResult(fixResult);

      if (fixResult.success) {
        toast({
          title: 'Success',
          description: `Fixed sequence numbers for ${fixResult.locations_fixed} locations`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed',
          description: fixResult.message || 'Failed to fix sequence numbers',
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      setResult({
        success: false,
        message: errorMessage,
      });
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This function will analyze existing work orders and fix any gaps in sequence numbers 
          by resetting the sequence counters to match the highest work order number for each location.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleFixSequences}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Fix Work Order Sequence Numbers
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            <strong>{result.success ? 'Success' : 'Error'}:</strong> {result.message}
            {result.success && result.locations_fixed && (
              <div className="mt-2">
                Fixed sequence numbers for {result.locations_fixed} organization-location combinations.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}