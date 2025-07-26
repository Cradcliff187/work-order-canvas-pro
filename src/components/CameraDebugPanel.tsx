import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bug, ChevronDown, RefreshCw, Smartphone, Monitor, Camera, AlertTriangle } from 'lucide-react';
import type { DebugInfo } from '@/hooks/useCamera';

interface CameraDebugPanelProps {
  debugMode: boolean;
  debugInfo: DebugInfo | null;
  errors: Array<{ timestamp: string; error: string; context: string }>;
  onToggleDebug: () => void;
  onRefreshInfo: () => void;
}

export const CameraDebugPanel: React.FC<CameraDebugPanelProps> = ({
  debugMode,
  debugInfo,
  errors,
  onToggleDebug,
  onRefreshInfo
}) => {
  // Only render in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  const [isExpanded, setIsExpanded] = React.useState(false);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getErrorSeverity = (context: string) => {
    if (context === 'Permission' || context === 'Support') return 'destructive';
    if (context === 'Capture' || context === 'Compression') return 'default';
    return 'secondary';
  };

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <CardTitle className="text-sm">Camera Debug</CardTitle>
            <Badge variant={debugMode ? 'default' : 'secondary'} className="text-xs">
              {debugMode ? 'ON' : 'OFF'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshInfo}
              disabled={!debugMode}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant={debugMode ? 'destructive' : 'default'}
              size="sm"
              onClick={onToggleDebug}
            >
              {debugMode ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {debugMode && (
        <CardContent className="pt-0">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-2">
                <span className="text-sm">Debug Information</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 mt-3">
              {debugInfo && (
                <>
                  {/* Platform Information */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      {getPlatformIcon(debugInfo.platform)}
                      Platform
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Platform:</span>
                        <Badge variant="outline" className="ml-2">
                          {debugInfo.platform}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mobile:</span>
                        <Badge variant={debugInfo.isMobile ? 'default' : 'secondary'} className="ml-2">
                          {debugInfo.isMobile ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>User Agent:</span>
                      <code className="block mt-1 text-xs bg-muted p-2 rounded break-all">
                        {debugInfo.userAgent}
                      </code>
                    </div>
                  </div>

                  <Separator />

                  {/* Camera Capabilities */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Camera Capabilities
                    </h4>
                    {debugInfo.capabilities ? (
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Has Camera:</span>
                          <Badge variant={debugInfo.capabilities.hasCamera ? 'default' : 'destructive'}>
                            {debugInfo.capabilities.hasCamera ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Multiple Cameras:</span>
                          <Badge variant={debugInfo.capabilities.hasMultipleCameras ? 'default' : 'secondary'}>
                            {debugInfo.capabilities.hasMultipleCameras ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Image Capture API:</span>
                          <Badge variant={debugInfo.capabilities.supportsImageCapture ? 'default' : 'secondary'}>
                            {debugInfo.capabilities.supportsImageCapture ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Device Count:</span>
                          <Badge variant="outline">
                            {debugInfo.deviceCount}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No capability data available</p>
                    )}
                  </div>

                  <Separator />

                  {/* Recent Errors */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Recent Errors ({errors.length})
                    </h4>
                    {errors.length > 0 ? (
                      <ScrollArea className="h-32 w-full border rounded">
                        <div className="p-2 space-y-2">
                          {errors.map((error, index) => (
                            <div key={index} className="text-xs border-l-2 border-destructive pl-2">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={getErrorSeverity(error.context)} className="text-xs">
                                  {error.context}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {formatTimestamp(error.timestamp)}
                                </span>
                              </div>
                              <p className="mt-1 text-muted-foreground break-words">
                                {error.error}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-xs text-muted-foreground">No errors recorded</p>
                    )}
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
};