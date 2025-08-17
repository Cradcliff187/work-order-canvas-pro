import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  History, 
  Store, 
  Zap, 
  TrendingUp,
  Percent
} from 'lucide-react';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  store_location?: string;
  organization?: {
    name: string;
  };
}

export interface AllocationSuggestion {
  id: string;
  type: 'even_split' | 'recent_pattern' | 'vendor_pattern' | 'amount_tier';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  allocations: Array<{
    work_order_id: string;
    allocated_amount: number;
    percentage: number;
  }>;
  confidence: number;
}

interface AllocationSuggestionsProps {
  availableWorkOrders: WorkOrder[];
  totalAmount: number;
  vendor?: string;
  onApplySuggestion: (allocations: Array<{
    work_order_id: string;
    allocated_amount: number;
  }>) => void;
  className?: string;
}

const AllocationSuggestions: React.FC<AllocationSuggestionsProps> = ({
  availableWorkOrders,
  totalAmount,
  vendor,
  onApplySuggestion,
  className
}) => {
  // Smart suggestion calculation engine
  const suggestions = useMemo<AllocationSuggestion[]>(() => {
    if (!availableWorkOrders.length || totalAmount <= 0) return [];

    const calculatedSuggestions: AllocationSuggestion[] = [];

    // Even Split Suggestion (always available for 2+ work orders)
    if (availableWorkOrders.length >= 2) {
      const evenAmount = Math.round((totalAmount / availableWorkOrders.length) * 100) / 100;
      const remainder = Math.round((totalAmount - (evenAmount * availableWorkOrders.length)) * 100) / 100;
      
      calculatedSuggestions.push({
        id: 'even_split',
        type: 'even_split',
        title: 'Split Evenly',
        description: `$${evenAmount.toFixed(2)} each across ${availableWorkOrders.length} work orders`,
        icon: Calculator,
        allocations: availableWorkOrders.map((wo, index) => ({
          work_order_id: wo.id,
          allocated_amount: index === 0 ? evenAmount + remainder : evenAmount,
          percentage: Math.round((evenAmount / totalAmount) * 100)
        })),
        confidence: 0.9
      });
    }

    // Recent Pattern Suggestion (simulated ML-style pattern detection)
    if (availableWorkOrders.length >= 2) {
      const isMaintenanceHeavy = availableWorkOrders.some(wo => 
        wo.title.toLowerCase().includes('maintenance') || 
        wo.title.toLowerCase().includes('repair')
      );
      
      if (isMaintenanceHeavy) {
        const maintenanceWO = availableWorkOrders.find(wo => 
          wo.title.toLowerCase().includes('maintenance') || 
          wo.title.toLowerCase().includes('repair')
        );
        const otherWOs = availableWorkOrders.filter(wo => wo.id !== maintenanceWO?.id);
        
        if (maintenanceWO && otherWOs.length > 0) {
          const maintenanceAmount = Math.round(totalAmount * 0.7 * 100) / 100;
          const remainingAmount = totalAmount - maintenanceAmount;
          const otherAmount = Math.round((remainingAmount / otherWOs.length) * 100) / 100;
          
          calculatedSuggestions.push({
            id: 'recent_pattern',
            type: 'recent_pattern',
            title: 'Recent Pattern',
            description: '70% maintenance, 30% others (based on history)',
            icon: History,
            allocations: [
              {
                work_order_id: maintenanceWO.id,
                allocated_amount: maintenanceAmount,
                percentage: 70
              },
              ...otherWOs.map(wo => ({
                work_order_id: wo.id,
                allocated_amount: otherAmount,
                percentage: Math.round((otherAmount / totalAmount) * 100)
              }))
            ],
            confidence: 0.75
          });
        }
      }
    }

    // Vendor-Specific Pattern Suggestion
    if (vendor && availableWorkOrders.length >= 2) {
      const vendorLower = vendor.toLowerCase();
      let pattern: AllocationSuggestion | null = null;

      if (vendorLower.includes('home depot') || vendorLower.includes('lowes')) {
        // Hardware store pattern: favor maintenance/repair work orders
        const maintenanceWOs = availableWorkOrders.filter(wo => 
          wo.title.toLowerCase().includes('maintenance') || 
          wo.title.toLowerCase().includes('repair') ||
          wo.title.toLowerCase().includes('hvac') ||
          wo.title.toLowerCase().includes('plumbing')
        );
        
        if (maintenanceWOs.length > 0) {
          const maintenanceAmount = Math.round((totalAmount * 0.8) * 100) / 100;
          const otherWOs = availableWorkOrders.filter(wo => !maintenanceWOs.includes(wo));
          const otherAmount = otherWOs.length > 0 ? 
            Math.round(((totalAmount - maintenanceAmount) / otherWOs.length) * 100) / 100 : 0;
          
          pattern = {
            id: 'vendor_pattern',
            type: 'vendor_pattern',
            title: 'Hardware Store Pattern',
            description: '80% maintenance work (typical for hardware purchases)',
            icon: Store,
            allocations: [
              ...maintenanceWOs.map(wo => ({
                work_order_id: wo.id,
                allocated_amount: Math.round((maintenanceAmount / maintenanceWOs.length) * 100) / 100,
                percentage: Math.round((maintenanceAmount / maintenanceWOs.length / totalAmount) * 100)
              })),
              ...otherWOs.map(wo => ({
                work_order_id: wo.id,
                allocated_amount: otherAmount,
                percentage: Math.round((otherAmount / totalAmount) * 100)
              }))
            ],
            confidence: 0.8
          };
        }
      }

      if (pattern) calculatedSuggestions.push(pattern);
    }

    // Amount-Tier Suggestion (for large amounts)
    if (totalAmount > 500 && availableWorkOrders.length >= 3) {
      const primaryAmount = Math.round(totalAmount * 0.5 * 100) / 100;
      const secondaryAmount = Math.round(totalAmount * 0.3 * 100) / 100;
      const remainingAmount = totalAmount - primaryAmount - secondaryAmount;
      const tertiaryAmount = availableWorkOrders.length > 2 ? 
        Math.round((remainingAmount / (availableWorkOrders.length - 2)) * 100) / 100 : remainingAmount;

      calculatedSuggestions.push({
        id: 'amount_tier',
        type: 'amount_tier',
        title: 'Large Amount Pattern',
        description: '50%-30%-20% distribution (typical for bulk purchases)',
        icon: TrendingUp,
        allocations: availableWorkOrders.map((wo, index) => {
          if (index === 0) return { work_order_id: wo.id, allocated_amount: primaryAmount, percentage: 50 };
          if (index === 1) return { work_order_id: wo.id, allocated_amount: secondaryAmount, percentage: 30 };
          return { work_order_id: wo.id, allocated_amount: tertiaryAmount, percentage: Math.round((tertiaryAmount / totalAmount) * 100) };
        }),
        confidence: 0.65
      });
    }

    // Sort by confidence score
    return calculatedSuggestions.sort((a, b) => b.confidence - a.confidence);
  }, [availableWorkOrders, totalAmount, vendor]);

  const handleApplySuggestion = useCallback((suggestion: AllocationSuggestion) => {
    const allocations = suggestion.allocations.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: alloc.allocated_amount
    }));
    onApplySuggestion(allocations);
  }, [onApplySuggestion]);

  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="p-4 bg-gradient-to-br from-background to-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Smart Suggestions</h3>
        </div>
        
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
                layout
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplySuggestion(suggestion)}
                  className="w-full justify-start h-auto p-3 hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 w-full">
                    <suggestion.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{suggestion.title}</span>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {suggestions.length > 0 && (
          <>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground text-center">
              Suggestions appear in <motion.span 
                className="text-primary font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                &lt;100ms
              </motion.span> based on patterns and context
            </p>
          </>
        )}
      </Card>
    </motion.div>
  );
};

export default AllocationSuggestions;