import React from 'react';
import { AlertTriangle, Camera, RefreshCw, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlatformName, isIOS, isAndroid } from '@/utils/mobileDetection';

interface CameraPermissionHelperProps {
  isVisible: boolean;
  onClose: () => void;
  onRetry: () => void;
  permissionDeniedReason?: 'denied' | 'unavailable' | 'not_supported';
  showFallbackOption?: boolean;
  onUseFallback?: () => void;
}

const CameraPermissionHelper: React.FC<CameraPermissionHelperProps> = ({
  isVisible,
  onClose,
  onRetry,
  permissionDeniedReason = 'denied',
  showFallbackOption = true,
  onUseFallback,
}) => {
  if (!isVisible) return null;

  const platform = getPlatformName();

  const getInstructions = () => {
    if (permissionDeniedReason === 'not_supported') {
      return {
        title: 'Camera Not Supported',
        description: 'Your device or browser doesn\'t support camera access.',
        steps: [
          'Use the file upload option below to select photos from your device',
          'Ensure your browser is up to date',
          'Try using a different browser if available'
        ]
      };
    }

    if (platform === 'ios') {
      return {
        title: 'Enable Camera Access in iOS Safari',
        description: 'Follow these steps to allow camera access:',
        steps: [
          'Open your iPhone Settings app',
          'Scroll down and tap "Safari"',
          'Tap "Camera" and select "Allow"',
          'Return to this page and try again',
          '',
          'Alternative: In Safari, tap the "Aa" icon in the address bar, then "Website Settings", and enable Camera'
        ]
      };
    }

    if (platform === 'android') {
      return {
        title: 'Enable Camera Access in Android',
        description: 'Follow these steps to allow camera access:',
        steps: [
          'Tap the camera/lock icon in the address bar',
          'Select "Allow" for camera permissions',
          'If that doesn\'t work, go to your device Settings',
          'Find "Apps" → [Your Browser] → "Permissions" → "Camera"',
          'Enable camera access and return to this page'
        ]
      };
    }

    return {
      title: 'Enable Camera Access in Your Browser',
      description: 'Follow these steps to allow camera access:',
      steps: [
        'Look for a camera icon in your browser\'s address bar',
        'Click on it and select "Allow"',
        'If you don\'t see an icon, check your browser settings',
        'Go to Settings → Privacy and Security → Site Settings → Camera',
        'Make sure this website is allowed to access your camera'
      ]
    };
  };

  const instructions = getInstructions();

  const getPlatformIcon = () => {
    if (isIOS()) return '📱';
    if (isAndroid()) return '🤖';
    return '💻';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="flex items-center gap-2 justify-center">
            <span>{getPlatformIcon()}</span>
            {instructions.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Camera className="h-4 w-4" />
            <AlertTitle>Camera Permission Required</AlertTitle>
            <AlertDescription>
              {instructions.description}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Steps to enable:</h4>
            <ol className="text-sm space-y-1 pl-4">
              {instructions.steps.map((step, index) => 
                step ? (
                  <li key={index} className="list-decimal">
                    {step}
                  </li>
                ) : (
                  <div key={index} className="h-2" />
                )
              )}
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={onRetry} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Camera Again
            </Button>
            
            {showFallbackOption && onUseFallback && (
              <Button 
                onClick={onUseFallback} 
                variant="outline" 
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos Instead
              </Button>
            )}
            
            <Button 
              onClick={onClose} 
              variant="ghost" 
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraPermissionHelper;