import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface UsePullToRefreshOptions {
  queryKey: string | readonly string[];
  onRefresh?: () => Promise<void>;
  threshold?: number;
  successMessage?: string;
  errorMessage?: string;
}

export const usePullToRefresh = ({
  queryKey,
  onRefresh,
  threshold = 70,
  successMessage = 'Data refreshed successfully',
  errorMessage = 'Failed to refresh data'
}: UsePullToRefreshOptions) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleRefresh = async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Default behavior: invalidate the query
        await queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
      }
      
      toast({
        title: successMessage,
        description: 'Your data has been updated'
      });
    } catch (error) {
      console.error('Pull to refresh error:', error);
      toast({
        title: errorMessage,
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  return {
    handleRefresh,
    threshold,
    isMobile
  };
};