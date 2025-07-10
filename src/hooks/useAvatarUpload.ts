import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage } from '@/utils/imageCompression';
import { useToast } from '@/hooks/use-toast';

export interface AvatarUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export const useAvatarUpload = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<AvatarUploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const cropImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate square crop dimensions
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        canvas.width = size;
        canvas.height = size;

        // Draw cropped image
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(croppedFile);
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return null;
    }

    try {
      setState({ uploading: true, progress: 0, error: null });

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please select a JPG, PNG, or WebP image');
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      setState(prev => ({ ...prev, progress: 20 }));

      // Crop to square
      const croppedFile = await cropImageToSquare(file);
      setState(prev => ({ ...prev, progress: 40 }));

      // Compress to 500x500px max
      const { file: compressedFile } = await compressImage(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.8,
      });
      setState(prev => ({ ...prev, progress: 60 }));

      // Delete old avatar if exists
      const oldAvatarPath = `${user.id}/avatar.jpg`;
      await supabase.storage.from('avatars').remove([oldAvatarPath]);

      setState(prev => ({ ...prev, progress: 80 }));

      // Upload new avatar
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      setState(prev => ({ ...prev, progress: 90 }));

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to prevent caching
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      await updateProfile({ avatar_url: avatarUrl });

      setState(prev => ({ ...prev, progress: 100 }));

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully.',
      });

      return avatarUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setState(prev => ({ ...prev, uploading: false }));
    }
  };

  const deleteAvatar = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState({ uploading: true, progress: 0, error: null });

      // Delete from storage
      const avatarPath = `${user.id}/avatar.jpg`;
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([avatarPath]);

      if (deleteError) {
        throw deleteError;
      }

      // Update profile to remove avatar URL
      await updateProfile({ avatar_url: null });

      toast({
        title: 'Avatar removed',
        description: 'Your profile picture has been removed.',
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete avatar';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setState(prev => ({ ...prev, uploading: false }));
    }
  };

  return {
    ...state,
    uploadAvatar,
    deleteAvatar,
  };
};