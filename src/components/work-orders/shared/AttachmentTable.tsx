import React, { useState } from 'react';
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
  MoreHorizontal
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableActionsDropdown, type TableAction } from '@/components/ui/table-actions-dropdown';

import { getFileIcon, getFileExtension, formatFileSize } from '@/utils/fileUtils';
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
  is_internal?: boolean;
  uploader_organization_type?: 'partner' | 'subcontractor' | 'internal';
}

interface AttachmentTableProps {
  attachments: AttachmentItem[];
  onView?: (attachment: AttachmentItem) => void;
  onDownload?: (attachment: AttachmentItem) => void;
  onDelete?: (attachment: AttachmentItem) => void;
  onBulkDelete?: (attachmentIds: string[]) => void;
  className?: string;
  isLoading?: boolean;
  showBulkActions?: boolean;
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

export function AttachmentTable({
  attachments,
  onView,
  onDownload,
  onDelete,
  onBulkDelete,
  className,
  isLoading = false,
  showBulkActions = true
}: AttachmentTableProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const getFileTypeIcon = (fileName: string, fileType: string) => {
    const iconName = getFileIcon(fileName, fileType);
    const IconComponent = FILE_TYPE_ICONS[iconName] || File;
    return IconComponent;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(attachments.map(a => a.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length > 0 && onBulkDelete) {
      onBulkDelete(selectedItems);
      setSelectedItems([]);
    }
  };

  const isAllSelected = attachments.length > 0 && selectedItems.length === attachments.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < attachments.length;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className={cn("text-center py-12 border border-dashed rounded-lg", className)}>
        <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No attachments yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Bulk Actions Bar */}
      {showBulkActions && selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedItems([])}
            >
              Clear selection
            </Button>
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                {showBulkActions && (
                <TableHead className="w-12 min-w-[48px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all attachments"
                    className={cn(isIndeterminate && "data-[state=checked]:bg-primary/50")}
                  />
                </TableHead>
                )}
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="hidden md:table-cell min-w-[120px]">Type</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[80px]">Size</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[120px]">Uploaded By</TableHead>
                <TableHead className="hidden md:table-cell min-w-[100px]">Date</TableHead>
                <TableHead className="w-12 min-w-[48px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {attachments.map((attachment) => {
              const IconComponent = getFileTypeIcon(attachment.file_name, attachment.file_type);
              const isSelected = selectedItems.includes(attachment.id);

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
                <TableRow 
                  key={attachment.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted/30"
                  )}
                  onClick={() => onView?.(attachment)}
                >
                  {showBulkActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleSelectItem(attachment.id, checked as boolean)
                        }
                        aria-label={`Select ${attachment.file_name}`}
                      />
                    </TableCell>
                  )}
                  
                  <TableCell className="max-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" title={attachment.file_name}>
                          {attachment.file_name}
                        </p>
                        <p className="text-sm text-muted-foreground md:hidden">
                          {formatFileSize(attachment.file_size)} • {getFileExtension(attachment.file_name).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      <Badge variant={attachment.file_type === 'photo' ? 'default' : 'secondary'} className="text-xs">
                        {attachment.file_type === 'photo' ? 'Image' : 'Document'}
                      </Badge>
                      {attachment.is_internal && (
                        <Badge variant="outline" className="text-xs">
                          Internal
                        </Badge>
                      )}
                       {attachment.uploader_organization_type && (
                        <Badge 
                          variant={
                            attachment.uploader_organization_type === 'partner' ? 'default' :
                            attachment.uploader_organization_type === 'subcontractor' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {attachment.uploader_organization_type === 'partner' ? 'Partner' :
                           attachment.uploader_organization_type === 'subcontractor' ? 'Subcontractor' :
                           'AKC Staff'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden lg:table-cell">
                    {formatFileSize(attachment.file_size)}
                  </TableCell>
                  
                  <TableCell className="hidden lg:table-cell max-w-[120px]">
                    <span className="truncate block" title={attachment.uploader_name}>
                      {attachment.uploader_name || 'Unknown'}
                    </span>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground lg:hidden">
                        {attachment.uploader_name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown 
                      actions={actions}
                      itemName={attachment.file_name}
                      align="end"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}