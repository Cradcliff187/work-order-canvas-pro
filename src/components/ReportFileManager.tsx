import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Download, 
  Trash2, 
  Plus,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FileUpload } from '@/components/FileUpload';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ReportFileManagerProps {
  reportId: string;
  workOrderId: string;
  existingAttachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    uploaded_at: string;
    uploaded_by_user_id?: string;
  }>;
  canUpload?: boolean;
  canDelete?: boolean;
  className?: string;
}

export function ReportFileManager({
  reportId,
  workOrderId,
  existingAttachments = [],
  canUpload = false,
  canDelete = false,
  className
}: ReportFileManagerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const { toast } = useToast();
  const { 
    uploadFiles, 
    removeFile, 
    uploadProgress, 
    isUploading 
  } = useFileUpload({
    onProgress: (progress) => {
      // Handle progress updates
    },
    onComplete: (uploadedFiles) => {
      toast({
        title: "Files Uploaded",
        description: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      });
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setUploadNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: typeof error === 'string' ? error : (error?.message || 'Upload failed'),
        variant: "destructive",
      });
    }
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadFiles(selectedFiles, workOrderId, reportId);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await removeFile(fileId);
      toast({
        title: "File Deleted",
        description: "File has been successfully deleted",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType === 'photo' || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case 'photo':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'invoice':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPublicUrl = (filePath: string) => {
    try {
      const { data } = supabase.storage
        .from('work-order-attachments')
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error generating public URL:', error);
      return filePath; // Fallback to original path
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Attachments ({existingAttachments.length})
        </h3>
        {canUpload && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Additional Files</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Add notes about these files..."
                    rows={2}
                  />
                </div>
                
                <FileUpload
                  onFilesSelected={setSelectedFiles}
                  maxFiles={10}
                  acceptedTypes={['image/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']}
                  uploadProgress={uploadProgress}
                  disabled={isUploading}
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || selectedFiles.length === 0}
                  >
                    {isUploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-pulse" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Attachments Grid */}
      {existingAttachments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {existingAttachments.map((attachment) => (
            <Card key={attachment.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {attachment.file_type === 'photo' ? (
                  <img
                    src={getPublicUrl(attachment.file_url)}
                    alt={attachment.file_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <div className="text-sm font-medium text-muted-foreground">
                        {attachment.file_name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                )}
                <div className="hidden flex items-center justify-center w-full h-full">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(attachment.file_type, attachment.file_name)}
                        <span className="text-sm font-medium truncate">
                          {attachment.file_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getFileTypeColor(attachment.file_type))}
                        >
                          {attachment.file_type}
                        </Badge>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(attachment.uploaded_at), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(getPublicUrl(attachment.file_url), '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = getPublicUrl(attachment.file_url);
                        link.download = attachment.file_name;
                        link.click();
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteFile(attachment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No attachments</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {canUpload 
                ? "No files have been attached to this report yet. Use the Add Files button to upload documents or images."
                : "No files have been attached to this report."
              }
            </p>
            {canUpload && (
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Files
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}