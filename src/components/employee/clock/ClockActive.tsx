import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, DollarSign, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { useClockState } from '@/hooks/useClockState';
import { useClockTimer } from '@/hooks/useClockTimer';
import { calculateEarnings } from '@/utils/timeFormatters';
import { ElapsedTimeDisplay } from './ElapsedTimeDisplay';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';

interface ClockActiveProps {
  onClockOut: () => void;
  isClockingOut: boolean;
}

export const ClockActive: React.FC<ClockActiveProps> = ({
  onClockOut,
  isClockingOut
}) => {
  const { clockInTime, workOrderId, locationAddress, hourlyRate } = useClockState();
  const { elapsedTime } = useClockTimer();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { uploadFiles } = useFileUpload({
    context: 'workOrder',
    workOrderId: workOrderId || undefined,
  });

  const handlePhotoCapture = () => {
    if (!workOrderId) {
      toast({
        title: "No active work order",
        description: "Please ensure you're clocked in to a work order",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large", 
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    
    try {
      await uploadFiles([file]);
      toast({
        title: "Photo uploaded successfully",
        description: "Photo added to work order",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      // Clear the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/30 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-success/20 rounded-full p-3 flex-shrink-0">
              <Clock className="h-8 w-8 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold">Clocked In</h3>
                <Badge variant="outline" className="border-success text-success bg-success/10">
                  Active
                </Badge>
              </div>
              
              {/* Timer Display */}
              <ElapsedTimeDisplay 
                timeMs={elapsedTime} 
                format="detailed" 
                variant="large" 
                className="mb-2"
              />
              
              {/* Earnings */}
              {hourlyRate && (
                <div className="flex items-center gap-2 text-sm font-semibold bg-success/10 rounded-lg p-2 mb-2">
                  <DollarSign className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-success tabular-nums">
                    {calculateEarnings(elapsedTime, hourlyRate)} earned
                  </span>
                </div>
              )}

              {/* Work Order and Start Time */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium truncate">
                  {workOrderId ? `Work Order: ${workOrderId}` : 'General Time'}
                </p>
                <p className="truncate">
                  Started: {clockInTime ? format(new Date(clockInTime), 'h:mm a') : '--'}
                </p>
                {locationAddress && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{locationAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button 
              variant="outline"
              onClick={handlePhotoCapture}
              disabled={isUploadingPhoto || !workOrderId}
              size="lg"
              className="h-12 px-6 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Camera className="h-5 w-5 mr-2" />
              {isUploadingPhoto ? 'Uploading...' : 'Take Photo'}
            </Button>
            
            <Button 
              variant="destructive"
              onClick={onClockOut}
              disabled={isClockingOut}
              size="lg"
              className="h-12 px-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
            </Button>
          </div>

          {/* Hidden Camera Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Capture photo"
          />
        </div>
      </CardContent>
    </Card>
  );
};