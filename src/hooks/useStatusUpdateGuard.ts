import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useStatusUpdateGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Store original method to restore later
    const originalFrom = supabase.from.bind(supabase);
    
    // Intercept supabase.from calls
    (supabase as any).from = function(table: string) {
      const result = originalFrom(table);
      
      if (table === 'work_orders') {
        const originalUpdate = result.update.bind(result);
        
        result.update = function(values: any) {
          if (values && typeof values === 'object' && 'status' in values) {
            const error = new Error();
            
            console.error(
              '🚫 FORBIDDEN: Direct work_order status update detected!\n' +
              'Use useWorkOrderStatusManager.changeStatus() instead.\n' +
              'This bypasses audit logging, notifications, and validation.\n\n' +
              'Stack trace:',
              error.stack
            );
            
            // Show toast warning in development
            toast({
              title: "⚠️ Direct Status Update Blocked",
              description: "Use useWorkOrderStatusManager.changeStatus() instead. Check console for details.",
              variant: "destructive"
            });
          }
          
          return originalUpdate(values);
        };
      }
      
      return result;
    };

    // Cleanup function to restore original method
    return () => {
      (supabase as any).from = originalFrom;
    };
  }, []);
}