import React, { useCallback, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalUploadSheet } from '@/components/upload/UniversalUploadSheet';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showRemoveButton?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  size = 'lg',
  className,
  showRemoveButton = true,
}) => {
  const { profile, updateProfile } = useAuth();
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  
  const {
    uploadFiles,
    removeFile: removeUploadedFile,
    uploadProgress,
    isUploading,
    uploadedFiles,
    reset: resetUploads,
  } = useFileUpload({
    context: 'avatar',
    maxFiles: 1,
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    onComplete: (files) => {
      if (files.length > 0) {
        setShowUploadSheet(false);
        resetUploads();
      }
    },
    onError: (error) => {
      console.error('Avatar upload error:', error);
    },
  });

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
    xl: 'h-40 w-40',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length > 0) {
        await uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  const handleRemoveAvatar = async () => {
    try {
      // Remove from storage and update profile
      if (profile?.avatar_url) {
        await removeUploadedFile(profile.avatar_url);
        await updateProfile?.({ avatar_url: null });
      }
    } catch (error) {
      console.error('Failed to remove avatar:', error);
    }
  };

  // Get current upload progress
  const currentProgress = Object.values(uploadProgress)[0];

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Avatar Display */}
      <div
        className={cn(
          'relative group cursor-pointer transition-all duration-200',
          sizeClasses[size],
          'hover:scale-105',
          isUploading && 'pointer-events-none'
        )}
        onClick={() => setShowUploadSheet(true)}
      >
        {/* Avatar */}
        <Avatar className={cn('w-full h-full transition-all duration-200', isUploading && 'opacity-50')}>
          <AvatarImage 
            src={profile?.avatar_url} 
            alt={profile ? `${profile.first_name} ${profile.last_name}` : 'User'} 
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="text-white text-center">
              <Camera className={cn('mx-auto mb-1', iconSizes[size])} />
              <span className="text-xs font-medium">Upload</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className={cn('animate-spin text-white', iconSizes[size])} />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && currentProgress && (
        <div className="w-full max-w-xs space-y-2">
          <Progress value={currentProgress.progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {currentProgress.progress}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {currentProgress?.status === 'error' && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {currentProgress.error}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {/* Upload Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => setShowUploadSheet(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          {profile?.avatar_url ? 'Change' : 'Upload'}
        </Button>

        {/* Remove Button */}
        {showRemoveButton && profile?.avatar_url && (
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={handleRemoveAvatar}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-muted-foreground max-w-xs">
        <p>Click to upload new avatar</p>
        <p>JPG, PNG, or WebP • Max 5MB</p>
        <p>Image will be cropped to a square</p>
      </div>

      {/* Upload Sheet */}
      <UniversalUploadSheet
        trigger={null}
        onFilesSelected={handleFilesSelected}
        accept="image/jpeg,image/png,image/webp"
        multiple={false}
      />
    </div>
  );
};