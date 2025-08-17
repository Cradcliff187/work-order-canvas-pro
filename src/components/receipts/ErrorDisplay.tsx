import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Wifi, 
  Camera, 
  RefreshCw, 
  Edit3, 
  Info,
  AlertTriangle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { getErrorMessage, type ErrorMessage, type ErrorSeverity } from '@/utils/errorMessages';

interface ErrorDisplayProps {
  error: string | Error | any;
  onRetry?: () => void;
  onManualEntry?: () => void;
  onDismiss?: () => void;
  showSuggestions?: boolean;
  className?: string;
}

const severityConfig = {
  info: {
    icon: Info,
    variant: 'default' as const,
    iconClass: 'text-info',
    alertClass: 'border-info/20 bg-info/5'
  },
  warning: {
    icon: AlertTriangle,
    variant: 'default' as const,
    iconClass: 'text-warning',
    alertClass: 'border-warning/20 bg-warning/5'
  },
  error: {
    icon: AlertCircle,
    variant: 'destructive' as const,
    iconClass: 'text-destructive',
    alertClass: 'border-destructive/20 bg-destructive/5'
  },
  critical: {
    icon: XCircle,
    variant: 'destructive' as const,
    iconClass: 'text-destructive',
    alertClass: 'border-destructive/30 bg-destructive/10'
  }
};

const getContextualIcon = (error: ErrorMessage): React.ComponentType<any> => {
  // Return contextual icons based on error type
  if (error.title.toLowerCase().includes('connection') || 
      error.title.toLowerCase().includes('network')) {
    return Wifi;
  }
  
  if (error.title.toLowerCase().includes('photo') || 
      error.title.toLowerCase().includes('image') ||
      error.title.toLowerCase().includes('camera')) {
    return Camera;
  }
  
  // Default to severity-based icon
  return severityConfig[error.severity].icon;
};

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onManualEntry, 
  onDismiss,
  showSuggestions = true,
  className = ""
}: ErrorDisplayProps) {
  const errorMessage = getErrorMessage(error);
  const config = severityConfig[errorMessage.severity];
  const IconComponent = getContextualIcon(errorMessage);

  return (
    <div className={`space-y-4 ${className}`}>
      <Alert 
        variant={config.variant}
        className={`${config.alertClass} border-l-4`}
      >
        <IconComponent className={`h-4 w-4 ${config.iconClass}`} />
        <AlertTitle className="font-semibold">
          {errorMessage.title}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm leading-relaxed">
            {errorMessage.description}
          </p>
          
          {errorMessage.recoveryHint && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30 border border-muted">
              <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">Tip:</span> {errorMessage.recoveryHint}
              </p>
            </div>
          )}
          
          {showSuggestions && errorMessage.suggestions && errorMessage.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                What you can try:
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {errorMessage.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold text-[10px] mt-1">•</span>
                    <span className="leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        {errorMessage.canRetry && onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {errorMessage.action || 'Try Again'}
          </Button>
        )}
        
        {errorMessage.allowManualEntry && onManualEntry && (
          <Button 
            onClick={onManualEntry}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Enter Manually
          </Button>
        )}
        
        {onDismiss && (
          <Button 
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

// Simplified error display for inline use
export function InlineErrorDisplay({ 
  error, 
  onRetry,
  className = ""
}: Pick<ErrorDisplayProps, 'error' | 'onRetry' | 'className'>) {
  const errorMessage = getErrorMessage(error);
  const config = severityConfig[errorMessage.severity];
  const IconComponent = getContextualIcon(errorMessage);

  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${config.alertClass} border ${className}`}>
      <IconComponent className={`h-4 w-4 ${config.iconClass} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{errorMessage.title}</p>
        <p className="text-xs text-muted-foreground truncate">{errorMessage.description}</p>
      </div>
      {errorMessage.canRetry && onRetry && (
        <Button 
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Toast-friendly error display
export function getErrorForToast(error: string | Error | any) {
  const errorMessage = getErrorMessage(error);
  
  return {
    title: errorMessage.title,
    description: errorMessage.description,
    variant: errorMessage.severity === 'error' || errorMessage.severity === 'critical' 
      ? 'destructive' as const 
      : 'default' as const
  };
}