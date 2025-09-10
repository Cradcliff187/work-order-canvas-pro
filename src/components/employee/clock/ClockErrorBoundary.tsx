import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Clock, WifiOff } from 'lucide-react';

interface ClockErrorBoundaryProps {
  children: ReactNode;
  fallbackLevel?: 'simplified' | 'basic' | 'notice';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ClockErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCategory: 'auth' | 'network' | 'business' | 'component';
  retryCount: number;
  lastRetryTime: number;
}

interface ErrorCategoryInfo {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  canRetry: boolean;
  maxRetries: number;
}

export class ClockErrorBoundary extends Component<ClockErrorBoundaryProps, ClockErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  public state: ClockErrorBoundaryState = {
    hasError: false,
    errorCategory: 'component',
    retryCount: 0,
    lastRetryTime: 0,
  };

  private errorCategories: Record<string, ErrorCategoryInfo> = {
    auth: {
      icon: AlertTriangle,
      title: 'Authentication Issue',
      description: 'Clock system authentication expired. Please refresh the page to continue time tracking.',
      canRetry: true,
      maxRetries: 1,
    },
    network: {
      icon: WifiOff,
      title: 'Connection Problem',
      description: 'Unable to connect to time tracking server. Check your internet connection.',
      canRetry: true,
      maxRetries: 3,
    },
    business: {
      icon: Clock,
      title: 'Setup Required',
      description: 'Time tracking setup incomplete. Contact your supervisor for assistance.',
      canRetry: false,
      maxRetries: 0,
    },
    component: {
      icon: AlertTriangle,
      title: 'Clock Interface Error',
      description: 'Time tracking interface encountered an error. Trying to recover.',
      canRetry: true,
      maxRetries: 2,
    },
  };

  public static getDerivedStateFromError(error: Error): Partial<ClockErrorBoundaryState> {
    const errorCategory = ClockErrorBoundary.categorizeError(error);
    return { 
      hasError: true, 
      error,
      errorCategory,
    };
  }

  private static categorizeError(error: Error): ClockErrorBoundaryState['errorCategory'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('profile') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('hourly') || message.includes('assignment') || message.includes('setup')) {
      return 'business';
    }
    return 'component';
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ClockErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public componentWillUnmount() {
    this.retryTimeouts.forEach(clearTimeout);
  }

  private handleRetry = () => {
    const { errorCategory, retryCount } = this.state;
    const categoryInfo = this.errorCategories[errorCategory];

    if (!categoryInfo.canRetry || retryCount >= categoryInfo.maxRetries) {
      return;
    }

    // Clear any existing timeouts
    this.retryTimeouts.forEach(clearTimeout);

    const newRetryCount = retryCount + 1;
    const retryDelay = this.getRetryDelay(newRetryCount);

    this.setState({
      retryCount: newRetryCount,
      lastRetryTime: Date.now(),
    });

    const timeout = setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined 
      });
    }, retryDelay);

    this.retryTimeouts.push(timeout);
  };

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff: 2s, 5s, 10s
    const delays = [2000, 5000, 10000];
    return delays[Math.min(retryCount - 1, delays.length - 1)] || 10000;
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private renderSimplifiedClock = () => {
    return (
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60]">
        <Card className="p-4 shadow-lg">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Basic Time Tracking</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" disabled>
                Clock In (Limited Mode)
              </Button>
              <Button size="sm" variant="outline" disabled>
                Clock Out (Limited Mode)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  private renderErrorUI = () => {
    const { error, errorCategory, retryCount } = this.state;
    const categoryInfo = this.errorCategories[errorCategory];
    const Icon = categoryInfo.icon;
    const canRetry = categoryInfo.canRetry && retryCount < categoryInfo.maxRetries;

    return (
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60]">
        <Alert variant="destructive" className="max-w-sm shadow-lg">
          <Icon className="h-4 w-4" />
          <AlertTitle className="text-sm">{categoryInfo.title}</AlertTitle>
          <AlertDescription className="text-xs mb-3">
            {categoryInfo.description}
          </AlertDescription>
          <div className="flex gap-2">
            {canRetry && (
              <Button 
                onClick={this.handleRetry}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again ({categoryInfo.maxRetries - retryCount} left)
              </Button>
            )}
            {errorCategory === 'auth' && (
              <Button 
                onClick={this.handleRefresh}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                Refresh Page
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  };

  public render() {
    if (this.state.hasError) {
      const { fallbackLevel = 'simplified' } = this.props;
      
      if (fallbackLevel === 'notice') {
        return this.renderErrorUI();
      }
      
      if (fallbackLevel === 'basic' || fallbackLevel === 'simplified') {
        return this.renderErrorUI();
      }

      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ClockErrorBoundary;