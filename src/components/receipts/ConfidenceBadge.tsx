import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  /** Confidence value as decimal (0-1), will be converted to percentage for display */
  confidence: number;
  className?: string;
  showTooltip?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  className = "",
  showTooltip = true 
}) => {
  // Validation: warn if confidence seems to be in percentage format
  if (confidence > 1) {
    console.warn('ConfidenceBadge received confidence > 1:', confidence, 'Expected decimal format (0-1)');
  }
  const getVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'destructive';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High Accuracy';
    if (confidence >= 0.5) return 'Medium Accuracy';
    return 'Low Accuracy - Please Verify';
  };

  const badge = (
    <Badge 
      variant={getVariant(confidence)} 
      className={`text-xs ${className}`}
    >
      {Math.round(confidence * 100)}%
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getConfidenceText(confidence)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};