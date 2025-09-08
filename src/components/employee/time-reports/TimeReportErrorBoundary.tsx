import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

interface FormDataBackup {
  reportDate: string;
  workPerformed: string;
  materialsUsed: string;
  hoursWorked: number;
  notes: string;
  files: File[];
  timestamp: number;
}

interface TimeReportErrorBoundaryProps {
  children: ReactNode;
  workOrderId?: string;
  onError?: (error: Error, formData?: FormDataBackup) => void;
  onDataRestore?: (data: FormDataBackup) => void;
}

interface TimeReportErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCategory: 'submission' | 'form' | 'file' | 'data' | 'component';
  fallbackLevel: number;
  preservedData?: FormDataBackup;
  retryCount: number;
}

export class TimeReportErrorBoundary extends Component<
  TimeReportErrorBoundaryProps,
  TimeReportErrorBoundaryState
> {
  private backupKey: string;

  constructor(props: TimeReportErrorBoundaryProps) {
    super(props);
    this.backupKey = `timeReport_${props.workOrderId || 'draft'}`;
    
    this.state = {
      hasError: false,
      errorCategory: 'component',
      fallbackLevel: 1,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TimeReportErrorBoundaryState> {
    // Categorize the error
    let errorCategory: TimeReportErrorBoundaryState['errorCategory'] = 'component';
    
    if (error.message.includes('submission') || error.message.includes('mutation')) {
      errorCategory = 'submission';
    } else if (error.message.includes('form') || error.message.includes('validation')) {
      errorCategory = 'form';
    } else if (error.message.includes('file') || error.message.includes('upload')) {
      errorCategory = 'file';
    } else if (error.message.includes('data') || error.message.includes('query')) {
      errorCategory = 'data';
    }

    return {
      hasError: true,
      error,
      errorCategory,
      fallbackLevel: 1,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TimeReportErrorBoundary caught an error:', error, errorInfo);
    
    // Try to preserve any form data
    this.preserveFormData();
    
    // Call onError callback if provided
    this.props.onError?.(error, this.state.preservedData);
    
    // Show user notification
    toast.error("Don't worry - your work has been saved. Click retry to continue.");
  }

  componentDidMount() {
    // Check for previously saved data
    this.checkForSavedData();
  }

  preserveFormData = () => {
    try {
      // Try to extract form data from the DOM or React context
      const formElements = document.querySelectorAll('input, textarea, select');
      const formData: Partial<FormDataBackup> = {
        timestamp: Date.now(),
      };

      formElements.forEach((element) => {
        const input = element as HTMLInputElement;
        const name = input.name || input.id;
        
        if (name === 'reportDate') formData.reportDate = input.value;
        if (name === 'workPerformed') formData.workPerformed = input.value;
        if (name === 'materialsUsed') formData.materialsUsed = input.value;
        if (name === 'hoursWorked') formData.hoursWorked = parseFloat(input.value) || 0;
        if (name === 'notes') formData.notes = input.value;
      });

      const backup: FormDataBackup = {
        reportDate: formData.reportDate || '',
        workPerformed: formData.workPerformed || '',
        materialsUsed: formData.materialsUsed || '',
        hoursWorked: formData.hoursWorked || 0,
        notes: formData.notes || '',
        files: [], // Files can't be preserved in localStorage
        timestamp: formData.timestamp || Date.now(),
      };

      // Save to localStorage
      localStorage.setItem(this.backupKey, JSON.stringify(backup));
      
      this.setState({ preservedData: backup });
    } catch (error) {
      console.warn('Could not preserve form data:', error);
    }
  };

  checkForSavedData = () => {
    try {
      const savedData = localStorage.getItem(this.backupKey);
      if (savedData) {
        const backup: FormDataBackup = JSON.parse(savedData);
        
        // Check if data is recent (within 24 hours)
        const isRecent = Date.now() - backup.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent) {
          this.setState({ preservedData: backup });
          toast.info("Unsaved time report found. Would you like to restore it?", {
            action: {
              label: "Restore",
              onClick: () => this.restoreData(),
            },
          });
        } else {
          // Clean up old data
          localStorage.removeItem(this.backupKey);
        }
      }
    } catch (error) {
      console.warn('Could not check for saved data:', error);
    }
  };

  restoreData = () => {
    if (this.state.preservedData) {
      this.props.onDataRestore?.(this.state.preservedData);
      toast.success("Data restored successfully");
    }
  };

  clearSavedData = () => {
    localStorage.removeItem(this.backupKey);
    this.setState({ preservedData: undefined });
  };

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Exponential backoff for network errors
    if (this.state.errorCategory === 'submission' && newRetryCount <= 3) {
      const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s
      
      toast.loading("Retrying in a moment...");
      
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: undefined,
          retryCount: newRetryCount,
        });
      }, delay);
    } else {
      // Immediate retry for other errors
      this.setState({
        hasError: false,
        error: undefined,
        retryCount: newRetryCount,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      fallbackLevel: 1,
      retryCount: 0,
    });
  };

  getErrorMessage = (): string => {
    const { errorCategory } = this.state;
    
    switch (errorCategory) {
      case 'submission':
        return "Your time report couldn't be submitted, but your work is saved. Click retry to try again.";
      case 'form':
        return "The form encountered an issue. Your data has been preserved - click restore to continue.";
      case 'file':
        return "File upload failed. Your report data is safe. You can retry uploading or submit without files.";
      case 'data':
        return "Unable to load work order data. Please check your connection and try again.";
      default:
        return "Something went wrong with the time report. Your work has been saved automatically.";
    }
  };

  exportData = () => {
    if (this.state.preservedData) {
      const dataText = Object.entries(this.state.preservedData)
        .filter(([key]) => key !== 'files' && key !== 'timestamp')
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      navigator.clipboard.writeText(dataText);
      toast.success("Form data copied to clipboard");
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Time Report Error</CardTitle>
              </div>
              <CardDescription>
                {this.getErrorMessage()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.preservedData && (
                <Alert>
                  <Save className="h-4 w-4" />
                  <AlertDescription>
                    Your work from {new Date(this.state.preservedData.timestamp).toLocaleTimeString()} has been saved.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1"
                  disabled={this.state.retryCount >= 5}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.state.retryCount >= 5 ? 'Max retries reached' : 'Try Again'}
                </Button>
                
                {this.state.preservedData && (
                  <Button 
                    variant="outline" 
                    onClick={this.restoreData}
                  >
                    Restore Data
                  </Button>
                )}
              </div>

              {this.state.retryCount >= 3 && (
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    onClick={this.exportData}
                    className="w-full"
                  >
                    Copy Data to Clipboard
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    If problems persist, contact support with the copied data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}