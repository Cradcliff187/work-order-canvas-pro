import { Clock, MapPin } from 'lucide-react';
import { ElapsedTimeDisplay } from './ElapsedTimeDisplay';

interface ActiveSessionDisplayProps {
  workOrderId: string | null;
  projectId: string | null;
  elapsedTime: number;
}

export function ActiveSessionDisplay({
  workOrderId,
  projectId,
  elapsedTime
}: ActiveSessionDisplayProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Active Session</span>
        </div>
        <ElapsedTimeDisplay 
          timeMs={elapsedTime} 
          format="compact" 
          variant="default" 
          className="text-sm text-muted-foreground"
        />
      </div>
      
      {(workOrderId || projectId) && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">
              {workOrderId ? `Work Order: ${workOrderId}` : `Project: ${projectId}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}