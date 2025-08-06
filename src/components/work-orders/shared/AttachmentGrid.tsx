import React from 'react';
import { 
  Image as ImageIcon, 
  FileText, 
  Film, 
  Music, 
  Archive, 
  Code, 
  File,
  Download,
  Eye,
  Trash2,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyImage } from '@/components/LazyImage';
import { TableActionsDropdown, type TableAction } from '@/components/ui/table-actions-dropdown';
import { getFileIcon, getFileExtension, formatFileSize, getImageUrl, isImageFile } from '@/utils/fileUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AttachmentItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'photo' | 'document';
  file_size: number;
  uploaded_at: string;
  uploader_name?: string;
  uploader_email?: string;
  is_internal?: boolean;
  uploader_organization_type?: 'partner' | 'subcontractor' | 'internal';
}

interface AttachmentGridProps {
  attachments: AttachmentItem[];
  onView?: (attachment: AttachmentItem) => void;
  onDownload?: (attachment: AttachmentItem) => void;
  onDelete?: (attachment: AttachmentItem) => void;
  className?: string;
  isLoading?: boolean;
}

const FILE_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  'image': ImageIcon,
  'file-text': FileText,
  'film': Film,
  'music': Music,
  'archive': Archive,
  'code': Code,
  'file': File,
};

export function AttachmentGrid({
  attachments,
  onView,
  onDownload,
  onDelete,
  className,
  isLoading = false
}: AttachmentGridProps) {
  const getFileTypeIcon = (fileName: string, fileType: string) => {
    const iconName = getFileIcon(fileName, fileType);
    const IconComponent = FILE_TYPE_ICONS[iconName] || File;
    return IconComponent;
  };

  const isImage = (attachment: AttachmentItem) => {
    return isImageFile(attachment.file_name, attachment.file_type);
  };

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden animate-pulse">
            <div className="aspect-video bg-muted" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No attachments yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {attachments.map((attachment) => {
        const IconComponent = getFileTypeIcon(attachment.file_name, attachment.file_type);
        const isImageAttachment = isImage(attachment);
        const imageUrl = getImageUrl(attachment.file_url);

        const actions: TableAction[] = [
          {
            label: 'View',
            icon: Eye,
            onClick: () => onView?.(attachment),
            show: true
          },
          {
            label: 'Download',
            icon: Download,
            onClick: () => onDownload?.(attachment),
            show: true
          },
          {
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDelete?.(attachment),
            variant: 'destructive',
            show: !!onDelete
          }
        ];

        return (
          <Card 
            key={attachment.id} 
            className="group overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onView?.(attachment)}
          >
            <div className="aspect-video bg-muted relative">
              {isImageAttachment ? (
                <LazyImage
                  src={imageUrl}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                  fallback="/placeholder.svg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <IconComponent className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="secondary" className="text-xs">
                      {getFileExtension(attachment.file_name).toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Actions overlay */}
              <div 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <TableActionsDropdown 
                  actions={actions}
                  itemName={attachment.file_name}
                  align="end"
                />
              </div>

              {/* File type and internal badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <Badge variant={attachment.file_type === 'photo' ? 'default' : 'secondary'}>
                  {attachment.file_type === 'photo' ? 'Image' : 'Document'}
                </Badge>
                {attachment.is_internal && (
                  <Badge variant="outline" className="bg-muted/90 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Internal
                  </Badge>
                )}
                {attachment.uploader_organization_type && (
                  <Badge variant="outline" className="bg-muted/90 text-xs">
                    {attachment.uploader_organization_type === 'partner' ? 'Partner' : 
                     attachment.uploader_organization_type === 'subcontractor' ? 'Subcontractor' : 'Admin'}
                  </Badge>
                )}
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <IconComponent className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}
                </p>
                {attachment.uploader_name && (
                  <p className="text-xs text-muted-foreground">
                    By {attachment.uploader_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}