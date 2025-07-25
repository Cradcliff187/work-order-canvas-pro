import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FixResult {
  success: boolean;
  updated_count?: number;
  message: string;
}

export function FixWorkOrderNumbersButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const { toast } = useToast();

  const handleFixNumbers = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('fix_existing_work_order_numbers');
      
      if (error) {
        throw new Error(error.message);
      }

      const fixResult = data as unknown as FixResult;
      setResult(fixResult);
      
      if (fixResult?.success) {
        toast({
          title: "Work Order Numbers Fixed",
          description: `Successfully updated ${fixResult.updated_count} work order numbers`,
        });
      } else {
        toast({
          title: "Fix Failed",
          description: fixResult?.message || "Failed to fix work order numbers",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fixing work order numbers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix work order numbers",
        variant: "destructive",
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
          This will fix work order numbering to be sequential per location. 
          Each location will have its own sequence starting from 001.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={handleFixNumbers}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fixing Work Order Numbers...
          </>
        ) : (
          'Fix Work Order Numbers'
        )}
      </Button>

      {result && (
        <Alert className={result.success ? "border-green-500" : "border-red-500"}>
          <AlertDescription>
            <strong>{result.success ? 'Success:' : 'Error:'}</strong> {result.message}
            {result.updated_count !== undefined && (
              <div className="mt-1">
                Updated {result.updated_count} work order numbers
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}