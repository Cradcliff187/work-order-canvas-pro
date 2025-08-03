import React, { useState, useMemo } from 'react';
import { Upload, Search, X, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useViewMode, type ViewModeConfig } from '@/hooks/useViewMode';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AttachmentGrid, type AttachmentItem } from './AttachmentGrid';

// Export the AttachmentItem type for use in other components
export type { AttachmentItem };
import { AttachmentTable } from './AttachmentTable';
import { AttachmentList } from './AttachmentList';
import { AttachmentUpload } from './AttachmentUpload';
import { getFileExtension } from '@/utils/fileTypeUtils';

interface AttachmentSectionProps {
  attachments: AttachmentItem[];
  workOrderId: string;
  canUpload?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onView?: (attachment: AttachmentItem) => void;
  onDownload?: (attachment: AttachmentItem) => void;
  onDelete?: (attachment: AttachmentItem) => void;
  onBulkDelete?: (attachmentIds: string[]) => void;
  maxFileSize?: number;
  maxFiles?: number;
  isLoading?: boolean;
}

const viewConfig: ViewModeConfig = {
  desktop: ['table', 'card'],
  mobile: ['list']
};

// Build file type categories from actual attachments
function buildFileTypeOptions(attachments: AttachmentItem[]) {
  const typeMap = new Map<string, Set<string>>();
  
  attachments.forEach(attachment => {
    const extension = getFileExtension(attachment.file_name).toLowerCase();
    
    // Categorize by extension
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension)) {
      if (!typeMap.has('Images')) typeMap.set('Images', new Set());
      typeMap.get('Images')!.add(extension);
    } else if (['pdf'].includes(extension)) {
      if (!typeMap.has('PDFs')) typeMap.set('PDFs', new Set());
      typeMap.get('PDFs')!.add(extension);
    } else if (['doc', 'docx'].includes(extension)) {
      if (!typeMap.has('Documents')) typeMap.set('Documents', new Set());
      typeMap.get('Documents')!.add(extension);
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      if (!typeMap.has('Spreadsheets')) typeMap.set('Spreadsheets', new Set());
      typeMap.get('Spreadsheets')!.add(extension);
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
      if (!typeMap.has('Videos')) typeMap.set('Videos', new Set());
      typeMap.get('Videos')!.add(extension);
    } else if (['mp3', 'wav', 'flac', 'aac'].includes(extension)) {
      if (!typeMap.has('Audio')) typeMap.set('Audio', new Set());
      typeMap.get('Audio')!.add(extension);
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      if (!typeMap.has('Archives')) typeMap.set('Archives', new Set());
      typeMap.get('Archives')!.add(extension);
    } else {
      if (!typeMap.has('Other')) typeMap.set('Other', new Set());
      typeMap.get('Other')!.add(extension);
    }
  });

  return Array.from(typeMap.keys()).sort();
}

export function AttachmentSection({
  attachments,
  workOrderId,
  canUpload = false,
  onUpload,
  onView,
  onDownload,
  onDelete,
  onBulkDelete,
  maxFileSize,
  maxFiles,
  isLoading = false
}: AttachmentSectionProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { viewMode, setViewMode, allowedModes } = useViewMode({
    componentKey: 'attachment-section',
    config: viewConfig,
    defaultMode: 'table'
  });

  // Build filter options from actual attachments
  const fileTypeOptions = useMemo(() => buildFileTypeOptions(attachments), [attachments]);

  // Filter attachments based on search and type
  const filteredAttachments = useMemo(() => {
    return attachments.filter(attachment => {
      // Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        attachment.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (attachment.uploader_name && attachment.uploader_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Type filter
      if (selectedFileType === 'all') return matchesSearch;
      
      const extension = getFileExtension(attachment.file_name).toLowerCase();
      let matchesType = false;

      switch (selectedFileType) {
        case 'Images':
          matchesType = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension);
          break;
        case 'PDFs':
          matchesType = extension === 'pdf';
          break;
        case 'Documents':
          matchesType = ['doc', 'docx'].includes(extension);
          break;
        case 'Spreadsheets':
          matchesType = ['xls', 'xlsx', 'csv'].includes(extension);
          break;
        case 'Videos':
          matchesType = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension);
          break;
        case 'Audio':
          matchesType = ['mp3', 'wav', 'flac', 'aac'].includes(extension);
          break;
        case 'Archives':
          matchesType = ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
          break;
        case 'Other':
          matchesType = !['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'aac', 'zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
          break;
        default:
          matchesType = true;
      }

      return matchesSearch && matchesType;
    });
  }, [attachments, searchQuery, selectedFileType]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedFileType !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFileType('all');
  };

  const handleUpload = async (files: File[]) => {
    if (!onUpload) return;
    
    setIsUploading(true);
    try {
      await onUpload(files);
      setIsUploadSheetOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-4 mb-6">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Attachments</h3>
          {attachments.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {attachments.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop: View Switcher */}
          {!isMobile && (
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={setViewMode}
              allowedModes={allowedModes}
            />
          )}

          {/* Desktop: Upload Button */}
          {!isMobile && canUpload && (
            <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Files
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg">
                <div className="py-4">
                  <h4 className="text-lg font-semibold mb-4">Upload Files</h4>
                  <AttachmentUpload
                    onUpload={handleUpload}
                    maxFileSize={maxFileSize}
                    maxFiles={maxFiles}
                    isUploading={isUploading}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Search and Filter Row */}
      {attachments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files or uploaders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* File Type Filter */}
          {fileTypeOptions.length > 0 && (
            <Select value={selectedFileType} onValueChange={setSelectedFileType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {fileTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    // Empty state
    if (attachments.length === 0 && !isLoading) {
      return (
        <div className="text-center py-12">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No attachments yet</h4>
          <p className="text-muted-foreground mb-6">
            {canUpload ? 'Upload files to get started' : 'No files have been uploaded for this work order'}
          </p>
          {canUpload && (
            <AttachmentUpload
              onUpload={handleUpload}
              maxFileSize={maxFileSize}
              maxFiles={maxFiles}
              isUploading={isUploading}
            />
          )}
        </div>
      );
    }

    // No results from filtering
    if (filteredAttachments.length === 0 && attachments.length > 0) {
      return (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No matches found</h4>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filter criteria
          </p>
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      );
    }

    // Render appropriate view
    const commonProps = {
      attachments: filteredAttachments,
      onView,
      onDownload,
      onDelete,
      isLoading
    };

    switch (viewMode) {
      case 'card':
        return <AttachmentGrid {...commonProps} />;
      case 'list':
        return <AttachmentList {...commonProps} />;
      case 'table':
      default:
        return (
          <AttachmentTable 
            {...commonProps} 
            onBulkDelete={onBulkDelete}
            showBulkActions={!!onBulkDelete}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        {renderHeader()}
      </CardHeader>
      
      <CardContent>
        {renderContent()}
      </CardContent>

      {/* Mobile: Fixed Upload Button */}
      {isMobile && canUpload && attachments.length > 0 && (
        <div className="sticky bottom-4 left-0 right-0 px-6 pb-4">
          <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
            <SheetTrigger asChild>
              <Button className="w-full gap-2" size="lg">
                <Plus className="h-5 w-5" />
                Upload Files
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <div className="py-4">
                <h4 className="text-lg font-semibold mb-4">Upload Files</h4>
                <AttachmentUpload
                  onUpload={handleUpload}
                  maxFileSize={maxFileSize}
                  maxFiles={maxFiles}
                  isUploading={isUploading}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </Card>
  );
}