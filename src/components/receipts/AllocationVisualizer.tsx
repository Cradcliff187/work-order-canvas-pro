import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Target,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

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

interface Allocation {
  work_order_id: string;
  allocated_amount: number;
}

interface AllocationVisualizerProps {
  workOrders: WorkOrder[];
  allocations: Allocation[];
  totalAmount: number;
  mode: 'pie' | 'bar' | 'progress';
  className?: string;
}

// Color palette for work orders (HSL-based for theming)
const WORK_ORDER_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220, 70%, 50%)', // Blue
  'hsl(140, 70%, 50%)', // Green
  'hsl(280, 70%, 50%)', // Purple
  'hsl(25, 70%, 50%)',  // Orange
  'hsl(340, 70%, 50%)', // Pink
  'hsl(190, 70%, 50%)', // Cyan
  'hsl(60, 70%, 50%)',  // Yellow
  'hsl(300, 70%, 50%)', // Magenta
];

const AllocationVisualizer: React.FC<AllocationVisualizerProps> = ({
  workOrders,
  allocations,
  totalAmount,
  mode,
  className
}) => {
  // Prepare visualization data
  const visualData = useMemo(() => {
    if (!allocations || !Array.isArray(allocations) || !workOrders || !Array.isArray(workOrders)) {
      return [];
    }
    
    const data = allocations.map((allocation, index) => {
      const workOrder = workOrders.find(wo => wo.id === allocation.work_order_id);
      const percentage = totalAmount > 0 ? (allocation.allocated_amount / totalAmount) * 100 : 0;
      
      return {
        id: allocation.work_order_id,
        name: workOrder?.work_order_number || `WO-${allocation.work_order_id.slice(0, 6)}`,
        title: workOrder?.title || 'Unknown Work Order',
        value: allocation.allocated_amount,
        percentage: Math.round(percentage * 10) / 10,
        color: WORK_ORDER_COLORS[index % WORK_ORDER_COLORS.length],
        organization: workOrder?.organization?.name
      };
    });

    // Add remaining amount if under-allocated
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    const remaining = totalAmount - totalAllocated;
    
    if (remaining > 0.01) {
      data.push({
        id: 'remaining',
        name: 'Unallocated',
        title: 'Remaining Amount',
        value: remaining,
        percentage: Math.round((remaining / totalAmount) * 1000) / 10,
        color: 'hsl(var(--muted-foreground))',
        organization: undefined
      });
    }

    return data;
  }, [workOrders, allocations, totalAmount]);

  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
  const completionPercentage = totalAmount > 0 ? (totalAllocated / totalAmount) * 100 : 0;
  const isComplete = Math.abs(totalAmount - totalAllocated) < 0.01;
  const isOverAllocated = totalAllocated > totalAmount + 0.01;

  // Animated Pie Chart Component
  const AnimatedPieChart = () => (
    <div className="relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visualData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {visualData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={entry.id === 'remaining' ? 'hsl(var(--border))' : 'transparent'}
                strokeDasharray={entry.id === 'remaining' ? '4 4' : '0'}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {isComplete ? (
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-1" />
            ) : isOverAllocated ? (
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-1" />
            ) : (
              <Target className="h-8 w-8 text-primary mx-auto mb-1" />
            )}
          </motion.div>
          <div className="text-sm font-medium">
            {Math.round(completionPercentage)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {isComplete ? 'Complete' : isOverAllocated ? 'Over' : 'Allocated'}
          </div>
        </div>
      </div>
    </div>
  );

  // Stacked Bar Chart Component
  const StackedBarChart = () => (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[{ name: 'allocation', ...visualData.reduce((acc, item) => ({ ...acc, [item.id]: item.value }), {}) }]}
          layout="horizontal"
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <XAxis type="number" domain={[0, totalAmount]} hide />
          <YAxis type="category" dataKey="name" hide />
          {visualData.map((entry, index) => (
            <Bar
              key={entry.id}
              dataKey={entry.id}
              stackId="allocation"
              fill={entry.color}
              stroke={entry.id === 'remaining' ? 'hsl(var(--border))' : 'transparent'}
              strokeDasharray={entry.id === 'remaining' ? '4 4' : '0'}
              animationBegin={index * 100}
              animationDuration={600}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // Progress Ring Component
  const ProgressRings = () => (
    <div className="space-y-3">
      {visualData.filter(item => item.id !== 'remaining').map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">
                {item.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.percentage}%
              </span>
            </div>
            <Progress 
              value={item.percentage} 
              className="h-2"
              style={{
                '--progress-background': item.color
              } as React.CSSProperties}
            />
          </div>
          <Badge 
            variant="outline" 
            className="text-xs font-mono shrink-0"
            style={{ borderColor: item.color }}
          >
            ${item.value.toFixed(2)}
          </Badge>
        </motion.div>
      ))}
    </div>
  );

  if (!visualData.length || totalAmount <= 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No allocations to visualize</p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="p-4 bg-gradient-to-br from-background to-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {mode === 'pie' && <PieChartIcon className="h-4 w-4 text-primary" />}
            {mode === 'bar' && <BarChart3 className="h-4 w-4 text-primary" />}
            {mode === 'progress' && <Target className="h-4 w-4 text-primary" />}
            <h3 className="text-sm font-medium">Allocation Overview</h3>
          </div>
          
          <Badge 
            variant={isComplete ? "success" : isOverAllocated ? "destructive" : "secondary"}
            className="text-xs"
          >
            ${totalAllocated.toFixed(2)} / ${totalAmount.toFixed(2)}
          </Badge>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'pie' && <AnimatedPieChart />}
            {mode === 'bar' && <StackedBarChart />}
            {mode === 'progress' && <ProgressRings />}
          </motion.div>
        </AnimatePresence>

        {/* Legend for pie/bar charts */}
        {(mode === 'pie' || mode === 'bar') && (
          <div className="mt-4 space-y-2">
            {visualData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + (index * 0.05), duration: 0.2 }}
                className="flex items-center gap-2 text-xs"
              >
                <div 
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ 
                    backgroundColor: item.color,
                    border: item.id === 'remaining' ? '1px dashed hsl(var(--border))' : 'none'
                  }}
                />
                <span className="text-foreground font-medium">
                  {item.name}
                </span>
                <span className="text-muted-foreground">
                  {item.title}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-muted-foreground">
                    {item.percentage}%
                  </span>
                  <span className="font-mono">
                    ${item.value.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default AllocationVisualizer;