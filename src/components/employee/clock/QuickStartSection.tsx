import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { TypeBadge } from '../badges';

interface RecentlyClockedWorkOrder {
  id: string;
  work_order_number: string;
}

interface WorkOrder {
  id: string;
  number: string;
  title: string;
  assigneeName?: string;
}

interface QuickStartSectionProps {
  recentlyClockedWorkOrders: RecentlyClockedWorkOrder[];
  recentWorkOrders: WorkOrder[];
  onQuickClockIn: (workOrderId: string) => void;
  onBrowseClick: () => void;
}

export const QuickStartSection: React.FC<QuickStartSectionProps> = ({
  recentlyClockedWorkOrders,
  recentWorkOrders,
  onQuickClockIn,
  onBrowseClick,
}) => {
  return (
    <>
      {/* Quick Select Chips */}
      {recentlyClockedWorkOrders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Start</h4>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {recentlyClockedWorkOrders.map((workOrder) => (
              <Badge
                key={workOrder.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 px-3 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0"
                onClick={() => onQuickClockIn(workOrder.id)}
              >
                {workOrder.work_order_number}
              </Badge>
            ))}
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-accent/80 transition-all duration-200 px-3 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0"
              onClick={onBrowseClick}
            >
              <Plus className="h-4 w-4 mr-1" />
              Browse
            </Badge>
          </div>
        </div>
      )}

      {/* Recent Work Orders Horizontal Scroll */}
      {recentWorkOrders.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Work Orders</h4>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {recentWorkOrders.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-64">
                <Card 
                  className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-blue-500 bg-gradient-to-br from-background to-muted/30 hover:from-primary/5 hover:to-primary/5"
                  onClick={() => onQuickClockIn(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TypeBadge type="work_order" variant="compact" />
                      {item.assigneeName && (
                        <Badge variant="secondary" className="text-xs truncate">
                          {item.assigneeName}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-xs text-muted-foreground">
                        WO-{item.number}
                      </div>
                      <h4 className="font-bold text-sm leading-tight line-clamp-2">
                        {item.title}
                      </h4>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};