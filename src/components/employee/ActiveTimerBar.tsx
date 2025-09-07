import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { useClockState } from '@/hooks/useClockState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatElapsedTime } from '@/utils/timeFormatters';
import { cn } from '@/lib/utils';

export const ActiveTimerBar: React.FC = () => {
  const { 
    isClocked, 
    elapsedTime, 
    workOrderId, 
    projectId, 
    clockOut,
    isClockingOut 
  } = useClockState();

  // Get work item details
  const { data: workItem } = useQuery({
    queryKey: ['active-work-item', workOrderId, projectId],
    queryFn: async () => {
      if (workOrderId) {
        const { data } = await supabase
          .from('work_orders')
          .select('title, work_order_number')
          .eq('id', workOrderId)
          .single();
        return data ? { name: data.title || `Work Order #${data.work_order_number}`, type: 'Work Order' } : null;
      }
      
      if (projectId) {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        return data ? { name: data.name, type: 'Project' } : null;
      }
      
      return null;
    },
    enabled: isClocked && (!!workOrderId || !!projectId),
  });

  // Don't render if not clocked in
  if (!isClocked) {
    return null;
  }

  const handleClockOut = () => {
    clockOut.mutate(false);
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          {/* Left: Clock icon and elapsed time */}
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {formatElapsedTime(elapsedTime)}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
          
          {/* Center: Work item details */}
          <div className="flex-1 text-center px-4">
            {workItem ? (
              <div>
                <p className="text-sm font-medium text-foreground truncate">
                  {workItem.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {workItem.type}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading work item...</p>
            )}
          </div>
          
          {/* Right: Clock out button */}
          <Button
            onClick={handleClockOut}
            variant="outline"
            size="sm"
            disabled={isClockingOut}
            className="text-xs border-primary/30 hover:bg-primary/10"
          >
            {isClockingOut ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Clocking Out
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Clock Out
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};