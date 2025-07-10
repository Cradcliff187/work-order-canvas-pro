import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
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
  const { profile } = useAuth();
  const { uploading, progress, error, uploadAvatar, deleteAvatar } = useAvatarUpload();
  const [isDragOver, setIsDragOver] = useState(false);

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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        await uploadAvatar(file);
      }
      setIsDragOver(false);
    },
    [uploadAvatar]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    disabled: uploading,
  });

  const handleRemoveAvatar = async () => {
    await deleteAvatar();
  };

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Avatar Display with Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative group cursor-pointer transition-all duration-200',
          sizeClasses[size],
          isDragActive || isDragOver ? 'scale-105' : 'hover:scale-105',
          uploading && 'pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        
        {/* Avatar */}
        <Avatar className={cn('w-full h-full transition-all duration-200', uploading && 'opacity-50')}>
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
        {!uploading && (
          <div className={cn(
            'absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'flex items-center justify-center',
            isDragActive || isDragOver ? 'opacity-100' : ''
          )}>
            <div className="text-white text-center">
              <Camera className={cn('mx-auto mb-1', iconSizes[size])} />
              <span className="text-xs font-medium">
                {isDragActive ? 'Drop here' : 'Upload'}
              </span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className={cn('animate-spin text-white', iconSizes[size])} />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full max-w-xs space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {/* Upload Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {profile?.avatar_url ? 'Change' : 'Upload'}
        </Button>

        {/* Remove Button */}
        {showRemoveButton && profile?.avatar_url && (
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={handleRemoveAvatar}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-muted-foreground max-w-xs">
        <p>Click or drag and drop to upload</p>
        <p>JPG, PNG, or WebP • Max 5MB</p>
        <p>Image will be cropped to a square</p>
      </div>
    </div>
  );
};