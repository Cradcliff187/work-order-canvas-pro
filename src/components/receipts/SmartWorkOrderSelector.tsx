import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Clock, CheckCircle, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  store_location?: string;
  street_address?: string;
  city?: string;
  state?: string;
  status: string;
  date_submitted?: string;
}

interface SmartWorkOrderSelectorProps {
  availableWorkOrders: WorkOrder[];
  recentWorkOrders?: WorkOrder[];
  selectedWorkOrderId?: string;
  onSelect: (workOrderId: string | undefined) => void;
  className?: string;
}

export const SmartWorkOrderSelector: React.FC<SmartWorkOrderSelectorProps> = ({
  availableWorkOrders,
  recentWorkOrders = [],
  selectedWorkOrderId,
  onSelect,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Get the 3 most recent work orders for suggestions
  const suggestedWorkOrders = useMemo(() => {
    const recent = recentWorkOrders.slice(0, 3);
    // If we don't have enough recent orders, fill with latest available
    if (recent.length < 3) {
      const additionalOrders = availableWorkOrders
        .filter(wo => !recent.find(r => r.id === wo.id))
        .sort((a, b) => new Date(b.date_submitted || 0).getTime() - new Date(a.date_submitted || 0).getTime())
        .slice(0, 3 - recent.length);
      return [...recent, ...additionalOrders];
    }
    return recent;
  }, [recentWorkOrders, availableWorkOrders]);

  // Filter work orders based on search
  const filteredWorkOrders = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return availableWorkOrders.filter(wo =>
      wo.work_order_number.toLowerCase().includes(query) ||
      wo.title.toLowerCase().includes(query) ||
      wo.store_location?.toLowerCase().includes(query) ||
      wo.city?.toLowerCase().includes(query)
    );
  }, [availableWorkOrders, searchQuery]);

  const handleWorkOrderSelect = (workOrderId: string) => {
    onSelect(workOrderId === selectedWorkOrderId ? undefined : workOrderId);
    setSearchQuery('');
    setIsSearching(false);
  };

  const selectedWorkOrder = availableWorkOrders.find(wo => wo.id === selectedWorkOrderId);

  const WorkOrderCard = ({ workOrder, isSelected = false, isSuggested = false }: {
    workOrder: WorkOrder;
    isSelected?: boolean;
    isSuggested?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleWorkOrderSelect(workOrder.id)}
      className={cn(
        'relative p-4 rounded-lg border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border bg-card hover:bg-accent/50'
      )}
    >
      {isSuggested && (
        <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
          Suggested
        </Badge>
      )}
      
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 text-primary"
        >
          <CheckCircle className="h-5 w-5" />
        </motion.div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{workOrder.work_order_number}</span>
          <Badge variant="outline" className="text-xs">
            {workOrder.status}
          </Badge>
        </div>
        
        <h4 className="font-medium text-foreground line-clamp-2">
          {workOrder.title}
        </h4>
        
        {workOrder.store_location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{workOrder.store_location}</span>
            {workOrder.city && <span>• {workOrder.city}</span>}
          </div>
        )}
        
        {workOrder.date_submitted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(workOrder.date_submitted).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Selected Work Order Display */}
      <AnimatePresence>
        {selectedWorkOrder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Selected Work Order</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelect(undefined)}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
            <WorkOrderCard workOrder={selectedWorkOrder} isSelected={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearching(!!e.target.value.trim());
          }}
          placeholder="Search work orders..."
          className="pl-10"
        />
      </div>

      <AnimatePresence mode="wait">
        {isSearching && searchQuery.trim() ? (
          /* Search Results */
          <motion.div
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <h3 className="text-sm font-medium text-foreground">
              Search Results ({filteredWorkOrders.length})
            </h3>
            {filteredWorkOrders.length > 0 ? (
              <div className="grid gap-3 max-h-64 overflow-y-auto">
                {filteredWorkOrders.map((workOrder) => (
                  <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    isSelected={workOrder.id === selectedWorkOrderId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No work orders found matching "{searchQuery}"</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* Suggested Work Orders */
          <motion.div
            key="suggestions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {!selectedWorkOrder && (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Recent Work Orders</h3>
                  <Badge variant="secondary" className="text-xs">Quick Select</Badge>
                </div>
                {suggestedWorkOrders.length > 0 ? (
                  <motion.div 
                    className="grid gap-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                  >
                    {suggestedWorkOrders.map((workOrder) => (
                      <motion.div
                        key={workOrder.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        <WorkOrderCard
                          workOrder={workOrder}
                          isSelected={workOrder.id === selectedWorkOrderId}
                          isSuggested={true}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent work orders available</p>
                    <p className="text-xs">Use search to find work orders</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};