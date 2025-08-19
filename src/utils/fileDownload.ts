import { supabase } from '@/integrations/supabase/client';

export const downloadFile = async (filePath: string, fileName?: string): Promise<void> => {
  try {
    // First try to get the public URL
    const { data: urlData } = supabase.storage
      .from('work-order-attachments')
      .getPublicUrl(filePath);

    if (urlData.publicUrl) {
      // Try to fetch the file directly
      const response = await fetch(urlData.publicUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        downloadBlob(blob, fileName || extractFileNameFromPath(filePath));
        return;
      }
    }

    // Fallback: download through Supabase client
    const { data, error } = await supabase.storage
      .from('work-order-attachments')
      .download(filePath);

    if (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (data) {
      downloadBlob(data, fileName || extractFileNameFromPath(filePath));
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const extractFileNameFromPath = (filePath: string): string => {
  const segments = filePath.split('/');
  return segments[segments.length - 1] || 'download';
};

export const getFilePreviewUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('work-order-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};