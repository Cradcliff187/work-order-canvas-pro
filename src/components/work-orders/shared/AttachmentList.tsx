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
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableActionsDropdown, type TableAction } from '@/components/ui/table-actions-dropdown';
import { getFileIcon, getFileExtension } from '@/utils/fileTypeUtils';
import { formatFileSize } from '@/utils/imageCompression';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttachmentItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'photo' | 'document';
  file_size: number;
  uploaded_at: string;
  uploader_name?: string;
  uploader_email?: string;
}

interface AttachmentListProps {
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

export function AttachmentList({
  attachments,
  onView,
  onDownload,
  onDelete,
  className,
  isLoading = false
}: AttachmentListProps) {
  const getFileTypeIcon = (fileName: string, fileType: string) => {
    const iconName = getFileIcon(fileName, fileType);
    const IconComponent = FILE_TYPE_ICONS[iconName] || File;
    return IconComponent;
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="w-6 h-6 bg-muted rounded" />
              </div>
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
    <div className={cn("space-y-2", className)}>
      {attachments.map((attachment) => {
        const IconComponent = getFileTypeIcon(attachment.file_name, attachment.file_type);

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
            className="hover:shadow-sm transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-h-[44px]">
                {/* File Icon */}
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-6 h-6 text-muted-foreground" />
                </div>
                
                {/* File Info */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onView?.(attachment)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate" title={attachment.file_name}>
                      {attachment.file_name}
                    </h4>
                    <Badge 
                      variant={attachment.file_type === 'photo' ? 'default' : 'secondary'}
                      className="text-xs flex-shrink-0"
                    >
                      {getFileExtension(attachment.file_name).toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}</span>
                    </div>
                    {attachment.uploader_name && (
                      <span className="truncate max-w-[120px]">
                        By {attachment.uploader_name}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Quick Action & Menu */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Quick view button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                    onClick={() => onView?.(attachment)}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="sr-only">View {attachment.file_name}</span>
                  </Button>
                  
                  {/* Actions dropdown */}
                  <TableActionsDropdown 
                    actions={actions}
                    itemName={attachment.file_name}
                    align="end"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}