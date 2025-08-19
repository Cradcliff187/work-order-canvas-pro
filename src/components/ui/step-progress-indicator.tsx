import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';

interface Step {
  label: string;
  icon?: React.ComponentType<any>;
}

interface StepProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
  className?: string;
}

export function StepProgressIndicator({
  currentStep,
  totalSteps,
  steps,
  className
}: StepProgressIndicatorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
    
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Step {currentStep} of {totalSteps}</span>
          <span className="text-muted-foreground">{steps[currentStep - 1]?.label}</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const IconComponent = step.icon;

          return (
            <div key={stepNumber} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                    {
                      'bg-primary border-primary text-primary-foreground': isCompleted,
                      'bg-primary/10 border-primary text-primary animate-pulse': isCurrent,
                      'bg-muted border-muted-foreground/30 text-muted-foreground': !isCompleted && !isCurrent,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                
                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center transition-colors duration-300',
                    {
                      'text-primary': isCompleted || isCurrent,
                      'text-muted-foreground': !isCompleted && !isCurrent,
                    }
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Progress Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-colors duration-300',
                    {
                      'bg-primary': stepNumber < currentStep,
                      'bg-muted': stepNumber >= currentStep,
                    }
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}