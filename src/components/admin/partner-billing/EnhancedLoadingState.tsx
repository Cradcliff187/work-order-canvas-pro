import React from 'react';
import { Loader2, FileText, Mail, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface EnhancedLoadingStateProps {
  type?: 'pdf' | 'email' | 'payment' | 'general';
  message?: string;
  progress?: number;
  subMessage?: string;
}

export const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  type = 'general',
  message,
  progress,
  subMessage,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-primary" />;
      case 'email':
        return <Mail className="w-8 h-8 text-primary" />;
      case 'payment':
        return <CreditCard className="w-8 h-8 text-primary" />;
      default:
        return <Loader2 className="w-8 h-8 text-primary animate-spin" />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'pdf':
        return 'Generating PDF invoice...';
      case 'email':
        return 'Sending invoice email...';
      case 'payment':
        return 'Processing payment...';
      default:
        return 'Loading...';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="flex items-center justify-center">
          {getIcon()}
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">
            {message || getDefaultMessage()}
          </h3>
          {subMessage && (
            <p className="text-sm text-muted-foreground">
              {subMessage}
            </p>
          )}
        </div>

        {progress !== undefined && (
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Please wait...</span>
        </div>
      </CardContent>
    </Card>
  );
};