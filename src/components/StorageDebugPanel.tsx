import React, { useState, useEffect, useCallback } from 'react';
import { X, Database, Download, Upload, Trash2, TestTube, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useToast } from '@/hooks/use-toast';
import type { StorageTestResult, StorageHealthStatus } from '@/types/offline';

interface StorageDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageDebugPanel({ isOpen, onClose }: StorageDebugPanelProps) {
  const [testResults, setTestResults] = useState<StorageTestResult[]>([]);
  const [healthStatus, setHealthStatus] = useState<StorageHealthStatus | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  const {
    isReady,
    storageStats,
    storageState,
    isUsingFallback,
    initializationState,
    exportData,
    clearCache,
    resetStorageWithConfirmation,
    storageManager
  } = useOfflineStorage();
  
  const { toast } = useToast();

  // Close with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const runStorageTests = useCallback(async () => {
    if (!storageManager) return;
    
    setIsRunningTests(true);
    try {
      // Access debug methods if available (development only)
      const debugUtils = (storageManager as any).debugUtils;
      if (debugUtils?.testStorageInitialization) {
        const results = await debugUtils.testStorageInitialization();
        setTestResults(results);
      }
      
      if (debugUtils?.getHealthStatus) {
        const health = await debugUtils.getHealthStatus();
        setHealthStatus(health);
      }
    } catch (error) {
      console.error('Failed to run storage tests:', error);
      toast({
        title: "Test Failed",
        description: "Failed to run storage tests",
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
    }
  }, [storageManager, toast]);

  const handleExportData = useCallback(async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workorder-storage-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Storage data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export storage data",
        variant: "destructive",
      });
    }
  }, [exportData, toast]);

  const handleClearStorage = useCallback(async () => {
    if (!showConfirmClear) {
      setShowConfirmClear(true);
      return;
    }
    
    try {
      await clearCache();
      setShowConfirmClear(false);
      toast({
        title: "Storage Cleared",
        description: "All cached data has been cleared",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear storage",
        variant: "destructive",
      });
    }
  }, [showConfirmClear, clearCache, toast]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ready': return 'default';
      case 'fallback': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="absolute top-4 right-4 w-96 max-h-[90vh] overflow-y-auto">
        <Card className="bg-background/95 backdrop-blur shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Debug Panel
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Storage Status */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage Type:</span>
                    <Badge variant={isUsingFallback ? 'secondary' : 'default'}>
                      {isUsingFallback ? 'Memory' : 'IndexedDB'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={getStatusBadgeVariant(initializationState)}>
                      {initializationState}
                    </Badge>
                  </div>
                  
                  {storageState.retryCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retry Count:</span>
                      <Badge variant="outline">{storageState.retryCount}</Badge>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Storage Statistics */}
            {storageStats && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Storage Usage</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Used: {(storageStats.usedSpace / 1024 / 1024).toFixed(1)}MB</div>
                      <div>Total: {(storageStats.totalSpace / 1024 / 1024).toFixed(1)}MB</div>
                      <div>Drafts: {storageStats.draftCount}</div>
                      <div>Photos: {storageStats.photoCount}</div>
                      <div>Queue: {storageStats.syncQueueSize}</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Health Status */}
            {healthStatus && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Health:</span>
                      <Badge variant={getHealthBadgeVariant(healthStatus.overallHealth)}>
                        {healthStatus.overallHealth}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-3 w-3 ${healthStatus.schemaValid ? 'text-green-500' : 'text-red-500'}`} />
                        Schema Valid
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-3 w-3 ${healthStatus.dataIntegrity ? 'text-green-500' : 'text-red-500'}`} />
                        Data Integrity
                      </div>
                      <div>Performance Score: {healthStatus.performanceScore}/100</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Test Results</h4>
                    <div className="space-y-1">
                      {testResults.map((test, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span>{test.testName}</span>
                          <Badge variant={test.passed ? 'default' : 'destructive'}>
                            {test.passed ? 'Pass' : 'Fail'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runStorageTests}
                disabled={isRunningTests}
              >
                <TestTube className="h-4 w-4 mr-1" />
                {isRunningTests ? 'Testing...' : 'Run Tests'}
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              
              <Button 
                variant={showConfirmClear ? "destructive" : "outline"} 
                size="sm" 
                onClick={handleClearStorage}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {showConfirmClear ? 'Confirm Clear' : 'Clear Storage'}
              </Button>
              
              <Button variant="outline" size="sm" onClick={resetStorageWithConfirmation}>
                Reset DB
              </Button>
            </div>

            {showConfirmClear && (
              <Alert>
                <AlertDescription className="text-sm">
                  Click "Confirm Clear" again to clear all cached data. This action cannot be undone.
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => setShowConfirmClear(false)}
                  >
                    Cancel
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground">
              Development Mode Only • Press ESC to close
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}