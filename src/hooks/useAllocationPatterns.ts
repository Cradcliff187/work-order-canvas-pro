import { useMemo, useCallback } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  store_location?: string;
  organization?: {
    name: string;
  };
}

interface AllocationPattern {
  id: string;
  name: string;
  description: string;
  type: 'even_split' | 'maintenance_priority' | 'vendor_specific' | 'amount_tier' | 'recent_pattern';
  allocations: Array<{
    work_order_id: string;
    percentage: number;
    priority: number;
  }>;
  confidence: number;
  applicableConditions: {
    minWorkOrders?: number;
    minAmount?: number;
    maxAmount?: number;
    requiredVendor?: string[];
    requiredTitles?: string[];
  };
}

interface PatternHistory {
  patterns: Array<{
    workOrderIds: string[];
    allocations: Array<{
      work_order_id: string;
      percentage: number;
    }>;
    vendor?: string;
    amount: number;
    timestamp: number;
  }>;
}

interface UseAllocationPatternsOptions {
  workOrders: WorkOrder[];
  totalAmount: number;
  vendor?: string;
  enableHaptics?: boolean;
}

interface UseAllocationPatternsReturn {
  // Pattern suggestions
  suggestions: AllocationPattern[];
  
  // Pattern management
  applyPattern: (patternId: string) => Array<{ work_order_id: string; allocated_amount: number }>;
  savePattern: (name: string, allocations: Array<{ work_order_id: string; allocated_amount: number }>) => void;
  
  // Quick actions
  splitEvenly: () => Array<{ work_order_id: string; allocated_amount: number }>;
  roundToNearest: (amount: number, allocations: Array<{ work_order_id: string; allocated_amount: number }>) => Array<{ work_order_id: string; allocated_amount: number }>;
  distributeRemaining: (allocations: Array<{ work_order_id: string; allocated_amount: number }>) => Array<{ work_order_id: string; allocated_amount: number }>;
  
  // Pattern detection
  detectSimilarPattern: (allocations: Array<{ work_order_id: string; allocated_amount: number }>) => AllocationPattern | null;
  getPatternConfidence: (patternId: string) => number;
  
  // History management
  getPatternHistory: () => PatternHistory;
  clearPatternHistory: () => void;
}

const STORAGE_KEY = 'allocation_patterns_history';

// Built-in pattern templates
const BUILT_IN_PATTERNS: AllocationPattern[] = [
  {
    id: 'even_split',
    name: 'Even Split',
    description: 'Split amount equally across all work orders',
    type: 'even_split',
    allocations: [],
    confidence: 0.9,
    applicableConditions: {
      minWorkOrders: 2
    }
  },
  {
    id: 'maintenance_priority',
    name: 'Maintenance Priority',
    description: '70% to maintenance, 30% to others',
    type: 'maintenance_priority',
    allocations: [],
    confidence: 0.8,
    applicableConditions: {
      minWorkOrders: 2,
      requiredTitles: ['maintenance', 'repair', 'hvac', 'plumbing', 'electrical']
    }
  },
  {
    id: 'large_amount_tier',
    name: 'Large Amount Distribution',
    description: '50%-30%-20% distribution for bulk purchases',
    type: 'amount_tier',
    allocations: [],
    confidence: 0.7,
    applicableConditions: {
      minWorkOrders: 3,
      minAmount: 500
    }
  }
];

export const useAllocationPatterns = ({
  workOrders,
  totalAmount,
  vendor,
  enableHaptics = true
}: UseAllocationPatternsOptions): UseAllocationPatternsReturn => {
  const { onFormSave, onSubmitSuccess } = useHapticFeedback();

  // Load pattern history from localStorage
  const patternHistory = useMemo((): PatternHistory => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { patterns: [] };
    } catch {
      return { patterns: [] };
    }
  }, []);

  // Generate dynamic pattern suggestions
  const suggestions = useMemo((): AllocationPattern[] => {
    if (!workOrders.length || totalAmount <= 0) return [];

    const patterns: AllocationPattern[] = [];

    // Even Split Pattern (always available for 2+ work orders)
    if (workOrders.length >= 2) {
      const evenPercentage = Math.round((100 / workOrders.length) * 10) / 10;
      patterns.push({
        ...BUILT_IN_PATTERNS[0],
        allocations: workOrders.map((wo, index) => ({
          work_order_id: wo.id,
          percentage: index === 0 ? evenPercentage + (100 - (evenPercentage * workOrders.length)) : evenPercentage,
          priority: 1
        }))
      });
    }

    // Maintenance Priority Pattern
    const maintenanceWOs = workOrders.filter(wo => 
      BUILT_IN_PATTERNS[1].applicableConditions.requiredTitles?.some(keyword =>
        wo.title.toLowerCase().includes(keyword)
      )
    );

    if (maintenanceWOs.length > 0 && workOrders.length >= 2) {
      const otherWOs = workOrders.filter(wo => !maintenanceWOs.includes(wo));
      const maintenancePercentage = 70 / maintenanceWOs.length;
      const otherPercentage = otherWOs.length > 0 ? 30 / otherWOs.length : 0;

      patterns.push({
        ...BUILT_IN_PATTERNS[1],
        allocations: [
          ...maintenanceWOs.map(wo => ({
            work_order_id: wo.id,
            percentage: maintenancePercentage,
            priority: 1
          })),
          ...otherWOs.map(wo => ({
            work_order_id: wo.id,
            percentage: otherPercentage,
            priority: 2
          }))
        ]
      });
    }

    // Large Amount Tier Pattern
    if (totalAmount >= 500 && workOrders.length >= 3) {
      patterns.push({
        ...BUILT_IN_PATTERNS[2],
        allocations: workOrders.map((wo, index) => ({
          work_order_id: wo.id,
          percentage: index === 0 ? 50 : index === 1 ? 30 : 20 / (workOrders.length - 2),
          priority: index + 1
        }))
      });
    }

    // Vendor-Specific Patterns
    if (vendor) {
      const vendorLower = vendor.toLowerCase();
      
      if (vendorLower.includes('home depot') || vendorLower.includes('lowes')) {
        if (maintenanceWOs.length > 0) {
          patterns.push({
            id: 'hardware_store_pattern',
            name: 'Hardware Store Pattern',
            description: '80% maintenance for hardware purchases',
            type: 'vendor_specific',
            allocations: [
              ...maintenanceWOs.map(wo => ({
                work_order_id: wo.id,
                percentage: 80 / maintenanceWOs.length,
                priority: 1
              })),
              ...workOrders.filter(wo => !maintenanceWOs.includes(wo)).map(wo => ({
                work_order_id: wo.id,
                percentage: 20 / (workOrders.length - maintenanceWOs.length),
                priority: 2
              }))
            ],
            confidence: 0.85,
            applicableConditions: {
              requiredVendor: ['home depot', 'lowes'],
              minWorkOrders: 2
            }
          });
        }
      }
    }

    // Recent Pattern Detection
    const recentPatterns = patternHistory.patterns
      .filter(p => Date.now() - p.timestamp < 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .filter(p => Math.abs(p.amount - totalAmount) / totalAmount < 0.3) // Similar amount (±30%)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentPatterns.length > 0) {
      const recentPattern = recentPatterns[0];
      // Map to current work orders
      const mappedAllocations = recentPattern.allocations
        .map(alloc => {
          const matchingWO = workOrders.find(wo => wo.id === alloc.work_order_id);
          return matchingWO ? {
            work_order_id: matchingWO.id,
            percentage: alloc.percentage,
            priority: 1
          } : null;
        })
        .filter(Boolean) as Array<{ work_order_id: string; percentage: number; priority: number }>;

      if (mappedAllocations.length > 0) {
        patterns.push({
          id: 'recent_pattern',
          name: 'Recent Pattern',
          description: `Similar to your recent ${recentPattern.vendor ? recentPattern.vendor + ' ' : ''}allocation`,
          type: 'recent_pattern',
          allocations: mappedAllocations,
          confidence: 0.75,
          applicableConditions: {}
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }, [workOrders, totalAmount, vendor, patternHistory]);

  // Apply a pattern
  const applyPattern = useCallback((patternId: string) => {
    const pattern = suggestions.find(p => p.id === patternId);
    if (!pattern) return [];

    if (enableHaptics) onFormSave();

    return pattern.allocations.map(alloc => ({
      work_order_id: alloc.work_order_id,
      allocated_amount: Math.round((alloc.percentage / 100) * totalAmount * 100) / 100
    }));
  }, [suggestions, totalAmount, enableHaptics, onFormSave]);

  // Save a pattern to history
  const savePattern = useCallback((name: string, allocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    const pattern = {
      workOrderIds: allocations.map(a => a.work_order_id),
      allocations: allocations.map(a => ({
        work_order_id: a.work_order_id,
        percentage: Math.round((a.allocated_amount / totalAmount) * 100 * 10) / 10
      })),
      vendor,
      amount: totalAmount,
      timestamp: Date.now()
    };

    const updatedHistory = {
      patterns: [pattern, ...patternHistory.patterns.slice(0, 49)] // Keep last 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    
    if (enableHaptics) onSubmitSuccess();
  }, [totalAmount, vendor, patternHistory, enableHaptics, onSubmitSuccess]);

  // Quick action: Split evenly
  const splitEvenly = useCallback(() => {
    if (!workOrders.length) return [];
    
    const evenAmount = Math.floor((totalAmount / workOrders.length) * 100) / 100;
    const remainder = Math.round((totalAmount - (evenAmount * workOrders.length)) * 100) / 100;
    
    if (enableHaptics) onFormSave();
    
    return workOrders.map((wo, index) => ({
      work_order_id: wo.id,
      allocated_amount: index === 0 ? evenAmount + remainder : evenAmount
    }));
  }, [workOrders, totalAmount, enableHaptics, onFormSave]);

  // Quick action: Round to nearest amount
  const roundToNearest = useCallback((amount: number, allocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    return allocations.map(alloc => ({
      ...alloc,
      allocated_amount: Math.round(alloc.allocated_amount / amount) * amount
    }));
  }, []);

  // Quick action: Distribute remaining amount
  const distributeRemaining = useCallback((allocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    const remaining = totalAmount - totalAllocated;
    
    if (Math.abs(remaining) < 0.01 || !allocations.length) return allocations;
    
    const perAllocation = Math.round((remaining / allocations.length) * 100) / 100;
    const finalRemainder = Math.round((remaining - (perAllocation * allocations.length)) * 100) / 100;
    
    return allocations.map((alloc, index) => ({
      ...alloc,
      allocated_amount: alloc.allocated_amount + perAllocation + (index === 0 ? finalRemainder : 0)
    }));
  }, [totalAmount]);

  // Detect similar pattern
  const detectSimilarPattern = useCallback((allocations: Array<{ work_order_id: string; allocated_amount: number }>) => {
    const currentPattern = allocations.map(a => ({
      work_order_id: a.work_order_id,
      percentage: Math.round((a.allocated_amount / totalAmount) * 100 * 10) / 10
    }));

    // Find similar patterns in history
    const similarPatterns = patternHistory.patterns.filter(p => {
      const similarity = currentPattern.reduce((score, curr) => {
        const historyAlloc = p.allocations.find(h => h.work_order_id === curr.work_order_id);
        return historyAlloc ? score + (1 - Math.abs(curr.percentage - historyAlloc.percentage) / 100) : score;
      }, 0) / currentPattern.length;
      
      return similarity > 0.8; // 80% similarity threshold
    });

    if (similarPatterns.length === 0) return null;

    const mostSimilar = similarPatterns.sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return {
      id: 'detected_pattern',
      name: 'Detected Pattern',
      description: `Similar to pattern from ${new Date(mostSimilar.timestamp).toLocaleDateString()}`,
      type: 'recent_pattern' as const,
      allocations: currentPattern.map(c => ({ ...c, priority: 1 })),
      confidence: 0.8,
      applicableConditions: {}
    };
  }, [totalAmount, patternHistory]);

  // Get pattern confidence
  const getPatternConfidence = useCallback((patternId: string) => {
    const pattern = suggestions.find(p => p.id === patternId);
    return pattern?.confidence || 0;
  }, [suggestions]);

  // Get pattern history
  const getPatternHistory = useCallback(() => patternHistory, [patternHistory]);

  // Clear pattern history
  const clearPatternHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    suggestions,
    applyPattern,
    savePattern,
    splitEvenly,
    roundToNearest,
    distributeRemaining,
    detectSimilarPattern,
    getPatternConfidence,
    getPatternHistory,
    clearPatternHistory
  };
};