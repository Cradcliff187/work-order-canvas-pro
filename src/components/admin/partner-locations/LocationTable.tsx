import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { CompactLocationFilters } from './CompactLocationFilters';
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit, Trash2, Plus } from 'lucide-react';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { LoadingCard } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useColumnVisibility } from '@/hooks/useColumnVisibility';
import { LOCATION_COLUMN_METADATA } from './PartnerLocationColumns';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/utils/export';
import { useToast } from '@/hooks/use-toast';
import { TableToolbar } from '@/components/admin/shared/TableToolbar';

interface LocationFilters {
  search?: string;
  organization_id?: string;
  status?: 'all' | 'active' | 'inactive';
  location_ids?: string[];
}

interface PartnerLocation {
  id: string;
  location_name: string;
  location_number: string;
  organization_id: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface LocationTableProps {
  data: PartnerLocation[];
  isLoading: boolean;
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  onClearFilters: () => void;
  locationOptions: { value: string; label: string }[];
  organizationMap: Record<string, any>;
  
  // View mode and mobile
  isMobile: boolean;
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  
  // Row selection for bulk operations  
  rowSelection?: Record<string, boolean>;
  setRowSelection?: (selection: Record<string, boolean>) => void;
  bulkMode?: boolean;
  
  // Actions
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
  onRefresh?: () => Promise<void>;
  onAddLocation?: () => void;
}

export function LocationTable({
  data,
  isLoading,
  filters,
  onFiltersChange,
  onClearFilters,
  locationOptions,
  organizationMap,
  isMobile,
  viewMode,
  onViewModeChange,
  rowSelection = {},
  setRowSelection,
  bulkMode = false,
  onEdit,
  onDelete,
  onRefresh,
  onAddLocation
}: LocationTableProps) {
  const { toast } = useToast();
  
  // Column visibility setup
  const { 
    columnVisibility, 
    toggleColumn, 
    resetToDefaults,
    getAllColumns,
    getVisibleColumnCount 
  } = useColumnVisibility({
    storageKey: 'admin-partner-locations-columns-v1',
    columnMetadata: LOCATION_COLUMN_METADATA,
  });

  const columnOptions = getAllColumns().map((c) => ({
    ...c,
    canHide: true, // All columns in this table can be hidden
  }));

  // Export functionality
  const handleExport = (format: 'csv' | 'excel') => {
    const exportData = data.map(location => ({
      'Organization': organizationMap[location.organization_id]?.name || '',
      'Location #': location.location_number,
      'Location Name': location.location_name,
      'Address': formatAddress(location),
      'City': location.city || '',
      'State': location.state || '',
      'ZIP': location.zip_code || '',
      'Contact': location.contact_name || '',
      'Email': location.contact_email || '',
      'Phone': location.contact_phone || '',
      'Status': location.is_active ? 'Active' : 'Inactive',
      'Created': new Date(location.created_at).toLocaleDateString(),
    }));

    const columns: ExportColumn[] = [
      { key: 'Organization', label: 'Organization', type: 'string' },
      { key: 'Location #', label: 'Location #', type: 'string' },
      { key: 'Location Name', label: 'Location Name', type: 'string' },
      { key: 'Address', label: 'Address', type: 'string' },
      { key: 'City', label: 'City', type: 'string' },
      { key: 'State', label: 'State', type: 'string' },
      { key: 'ZIP', label: 'ZIP', type: 'string' },
      { key: 'Contact', label: 'Contact', type: 'string' },
      { key: 'Email', label: 'Email', type: 'string' },
      { key: 'Phone', label: 'Phone', type: 'string' },
      { key: 'Status', label: 'Status', type: 'string' },
      { key: 'Created', label: 'Created', type: 'string' },
    ];
    
    const filename = `partner-locations-${Date.now()}`;
    if (format === 'csv') {
      exportToCSV(exportData, columns, filename);
    } else {
      exportToExcel(exportData, columns, filename);
    }
    
    toast({
      title: "Export Complete",
      description: `Exported ${exportData.length} locations`
    });
  };

  // Helper functions
  const formatAddress = (location: PartnerLocation) => {
    const parts = [location.street_address, location.city, location.state, location.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  const toggleRowSelection = (locationId: string) => {
    if (!setRowSelection) return;
    setRowSelection({
      ...rowSelection,
      [locationId]: !rowSelection[locationId]
    });
  };

  const hasFilters = useMemo(() => {
    return !!(
      (filters.search && filters.search.trim()) ||
      (filters.organization_id && filters.organization_id !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      (filters.location_ids && filters.location_ids.length > 0)
    );
  }, [filters]);

  // Mobile view with pull-to-refresh
  if (isMobile) {
    return (
      <MobilePullToRefresh onRefresh={onRefresh}>
        {/* Mobile toolbar */}
        <div className="bg-muted/30 border rounded-lg p-3 space-y-3 mx-4 mt-4">
          <SmartSearchInput
            placeholder="Search..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full min-h-[44px]"
          />
          <div className="flex items-center gap-2">
            <CompactLocationFilters
              value={filters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              locationOptions={locationOptions}
            />
            {bulkMode && rowSelection && Object.keys(rowSelection).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection && setRowSelection({})}
                className="shrink-0 min-h-[44px] px-4"
              >
                Clear ({Object.keys(rowSelection).length})
              </Button>
            )}
          </div>
        </div>
        
        {/* Mobile content area */}
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-4 mt-4">
              <LoadingCard count={5} showHeader={false} />
            </div>
          ) : data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={MapPin}
                title="No locations found"
                description={hasFilters 
                  ? "No locations match your filters. Try adjusting your search."
                  : "No partner locations have been added yet."
                }
                action={!hasFilters && onAddLocation ? {
                  label: "Add Location",
                  onClick: onAddLocation,
                  icon: Plus
                } : undefined}
                variant="full"
              />
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {data.map(location => (
                <MobileTableCard
                  key={location.id}
                  title={location.location_name}
                  subtitle={`#${location.location_number} - ${organizationMap[location.organization_id]?.name || 'Unknown Org'}`}
                  badge={
                    <Badge variant={location.is_active ? 'default' : 'secondary'}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  }
                  metadata={[
                    { 
                      label: 'Address', 
                      value: formatAddress(location)
                    },
                    { 
                      label: 'Contact', 
                      value: location.contact_name || 'No contact' 
                    }
                  ]}
                  actions={[
                    { 
                      label: 'Edit', 
                      icon: Edit,
                      onClick: () => onEdit(location) 
                    },
                    { 
                      label: 'Delete', 
                      icon: Trash2,
                      onClick: () => onDelete(location), 
                      variant: 'destructive' 
                    }
                  ]}
                  selected={bulkMode && !!rowSelection[location.id]}
                  onSelect={bulkMode ? () => toggleRowSelection(location.id) : undefined}
                  onClick={() => !bulkMode && console.log('Location clicked:', location)}
                />
              ))}
            </div>
          )}
        </div>
      </MobilePullToRefresh>
    );
  }

  // Desktop view
  return (
    <Card className="overflow-hidden">
      {/* Desktop Toolbar */}
      <div className="border-b p-6">
        <TableToolbar
          title="Partner Locations"
          subtitle={`${data.length} locations`}
          searchValue={filters.search || ''}
          onSearchChange={(value) => onFiltersChange({ ...filters, search: value })}
          searchPlaceholder="Search locations..."
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          showViewModeSwitch={true}
          selectedCount={Object.keys(rowSelection).length}
          onClearSelection={() => setRowSelection?.({})}
          onExport={handleExport}
          columnOptions={columnOptions}
          onToggleColumn={toggleColumn}
          onResetColumns={resetToDefaults}
          visibleColumnCount={getVisibleColumnCount()}
        />
      </div>

      {/* Table content */}
      {isLoading ? (
        <div className="p-6">
          <EnhancedTableSkeleton rows={5} columns={7} />
        </div>
      ) : data.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={MapPin}
            title="No locations found"
            description={hasFilters 
              ? "No locations match your filters. Try adjusting your search."
              : "No partner locations have been added yet."
            }
            action={!hasFilters && onAddLocation ? {
              label: "Add Location",
              onClick: onAddLocation,
              icon: Plus
            } : undefined}
          />
        </div>
      ) : (
        <div className="p-0">
          <ResponsiveTableContainer>
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  {bulkMode && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={data.length > 0 && data.every(item => rowSelection[item.id])}
                        onCheckedChange={(checked) => {
                          if (!setRowSelection) return;
                          if (checked) {
                            const newSelection: Record<string, boolean> = {};
                            data.forEach(item => {
                              newSelection[item.id] = true;
                            });
                            setRowSelection(newSelection);
                          } else {
                            setRowSelection({});
                          }
                        }}
                        aria-label="Select all locations"
                      />
                    </TableHead>
                  )}
                  {columnOptions.find(col => col.id === 'organization')?.visible && <TableHead>Organization</TableHead>}
                  {columnOptions.find(col => col.id === 'location_number')?.visible && <TableHead>Location #</TableHead>}
                  {columnOptions.find(col => col.id === 'location_name')?.visible && <TableHead>Location Name</TableHead>}
                  {columnOptions.find(col => col.id === 'address')?.visible && <TableHead>Address</TableHead>}
                  {columnOptions.find(col => col.id === 'status')?.visible && <TableHead>Status</TableHead>}
                  {columnOptions.find(col => col.id === 'created_at')?.visible && <TableHead>Created</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((location) => {
                  const org = organizationMap[location.organization_id];
                  return (
                    <TableRow
                      key={location.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        rowSelection[location.id] && "bg-muted"
                      )}
                      onClick={() => !bulkMode && console.log('Location clicked:', location)}
                    >
                      {bulkMode && (
                        <TableCell>
                          <Checkbox
                            checked={!!rowSelection[location.id]}
                            onCheckedChange={() => toggleRowSelection(location.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'organization')?.visible && (
                        <TableCell>
                          {org?.name || 'Unknown'}
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'location_number')?.visible && (
                        <TableCell className="font-mono text-sm">
                          #{location.location_number}
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'location_name')?.visible && (
                        <TableCell className="font-medium">
                          {location.location_name}
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'address')?.visible && (
                        <TableCell>
                          {formatAddress(location)}
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'status')?.visible && (
                        <TableCell>
                          <Badge variant={location.is_active ? 'default' : 'secondary'}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      )}
                      {columnOptions.find(col => col.id === 'created_at')?.visible && (
                        <TableCell>
                          {new Date(location.created_at).toLocaleDateString()}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onEdit(location);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(location);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        </div>
      )}
    </Card>
  );
}