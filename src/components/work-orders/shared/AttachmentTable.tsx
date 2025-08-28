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
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { TableActionsDropdown } from '@/components/ui/table-actions-dropdown';

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

      <ResponsiveTableContainer className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === attachments.length && attachments.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all attachments"
                />
              </TableHead>
              <TableHead>File Name</TableHead>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="w-24">Size</TableHead>
              <TableHead className="w-32 hidden sm:table-cell">Uploader</TableHead>
              <TableHead className="w-32 hidden md:table-cell">Date</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments.map((attachment) => {
              const isSelected = selectedItems.includes(attachment.id);
              const FileIcon = getFileTypeIcon(attachment.file_name, attachment.file_type);
              
              return (
                <TableRow 
                  key={attachment.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-muted"
                  )}
                  onClick={() => onView?.(attachment)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectItem(attachment.id, checked as boolean)}
                      aria-label={`Select ${attachment.file_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{attachment.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {attachment.file_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {attachment.uploader_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {attachment.uploaded_at ? format(new Date(attachment.uploaded_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={[
                        { label: 'View', icon: Eye, onClick: () => onView?.(attachment) },
                        { label: 'Download', icon: Download, onClick: () => onDownload?.(attachment) },
                        { label: 'Delete', icon: Trash2, onClick: () => onDelete?.(attachment), variant: 'destructive' }
                      ]}
                      itemName={attachment.file_name}
                      align="end"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ResponsiveTableContainer>
    </div>
  );
}