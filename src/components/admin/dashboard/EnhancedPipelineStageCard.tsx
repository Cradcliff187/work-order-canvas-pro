import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, UserCheck, Clock, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PipelineStage } from '@/hooks/useWorkOrderPipeline';

const STAGE_ICONS = {
  'New': Package,
  'Assigned': UserCheck,
  'In Progress': Clock,
  'Awaiting Reports': FileText,
  'Completed': CheckCircle,
};

const STAGE_COLORS = {
  'New': 'text-muted-foreground',
  'Assigned': 'text-primary',
  'In Progress': 'text-warning',
  'Awaiting Reports': 'text-warning',
  'Completed': 'text-success',
};

interface EnhancedPipelineStageCardProps {
  stage: PipelineStage;
  onClick: () => void;
}

export function EnhancedPipelineStageCard({ stage, onClick }: EnhancedPipelineStageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = STAGE_ICONS[stage.stageName as keyof typeof STAGE_ICONS];
  const iconColorClass = STAGE_COLORS[stage.stageName as keyof typeof STAGE_COLORS];

  // Calculate quick stats for tooltip
  // Note: WorkOrderSummary doesn't include assignment data, so we'll use stage-level counts
  const avgAge = stage.workOrders.length > 0 
    ? Math.round(stage.workOrders.reduce((sum, wo) => {
        const daysSinceSubmission = Math.floor(
          (Date.now() - new Date(wo.date_submitted).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysSinceSubmission;
      }, 0) / stage.workOrders.length)
    : 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg smooth-transition-colors group border-border/50 hover:border-primary/30 relative overflow-hidden"
              onClick={onClick}
            >
              {/* Subtle gradient overlay on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />

              <CardContent className="p-4 space-y-3 relative z-10">
                {/* Header with icon and stage name */}
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      scale: isHovered ? 1.1 : 1,
                      rotate: isHovered ? 5 : 0 
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className={`h-5 w-5 ${iconColorClass} group-hover:text-primary smooth-transition-colors`} />
                  </motion.div>
                  <h3 className="font-medium text-sm text-foreground truncate">{stage.stageName}</h3>
                </div>

                {/* Total count - animated */}
                <div className="text-center">
                  <motion.div 
                    key={stage.totalCount}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 20
                    }}
                    className="text-3xl font-bold text-foreground group-hover:text-primary smooth-transition-colors"
                  >
                    {stage.totalCount}
                  </motion.div>
                </div>

                {/* Badges row */}
                <div className="flex justify-center gap-2 min-h-[20px]">
                  <AnimatePresence mode="wait">
                    {stage.recentCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {stage.recentCount} new
                        </Badge>
                      </motion.div>
                    )}
                    {stage.overdueCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
                          {stage.overdueCount} overdue
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{stage.stageName} Details</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">{stage.totalCount}</span>
              </div>
              {stage.totalCount > 0 && (
                <div className="flex justify-between">
                  <span>Avg. Age:</span>
                  <span className="font-medium">{avgAge} days</span>
                </div>
              )}
              {stage.recentCount > 0 && (
                <div className="flex justify-between text-blue-400">
                  <span>Recent:</span>
                  <span className="font-medium">{stage.recentCount}</span>
                </div>
              )}
              {stage.overdueCount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Overdue:</span>
                  <span className="font-medium">{stage.overdueCount}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}