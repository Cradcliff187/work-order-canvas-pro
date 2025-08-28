import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { SmartSearchInput } from '@/components/ui/smart-search-input';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { EnhancedTableSkeleton } from '@/components/EnhancedTableSkeleton';
import { CompactLocationFilters } from './CompactLocationFilters';
import { ResponsiveTableContainer } from '@/components/ui/responsive-table-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileTableCard } from '@/components/admin/shared/MobileTableCard';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Phone, Mail, Edit, Trash2, Plus } from 'lucide-react';
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh';
import { LoadingCard } from '@/components/ui/loading-states';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type ViewMode } from '@/hooks/useViewMode';
import { type RowSelectionState } from '@tanstack/react-table';

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

interface LocationTableProps {
  data: PartnerLocation[];
  organizationMap: Record<string, any>;
  isLoading: boolean;
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  onClearFilters: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  allowedModes: ViewMode[];
  isMobile: boolean;
  bulkMode: boolean;
  rowSelection?: RowSelectionState;
  setRowSelection?: (selection: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  columnOptions: Array<{ id: string; label: string; visible: boolean; canHide: boolean }>;
  toggleColumn: (columnId: string) => void;
  resetToDefaults: () => void;
  onEdit: (location: PartnerLocation) => void;
  onDelete: (location: PartnerLocation) => void;
  onExport: (format: 'csv' | 'excel') => void;
  onRefresh?: () => Promise<void>;
  onAddLocation?: () => void;
}

export function LocationTable({
  data,
  organizationMap,
  isLoading,
  filters,
  onFiltersChange,
  onClearFilters,
  viewMode,
  setViewMode,
  allowedModes,
  isMobile,
  bulkMode,
  rowSelection = {},
  setRowSelection,
  columnOptions,
  toggleColumn,
  resetToDefaults,
  onEdit,
  onDelete,
  onExport,
  onRefresh,
  onAddLocation
}: LocationTableProps) {
  
  // Helper functions
  const formatAddress = (location: PartnerLocation): string => {
    return [location.street_address, location.city, location.state, location.zip_code]
      .filter(Boolean)
      .join(', ') || 'No address';
  };

  const handleLocationClick = (location: PartnerLocation) => {
    // Future: Navigate to location detail page
    console.log('Location clicked:', location);
  };

  const toggleRowSelection = (locationId: string) => {
    if (!setRowSelection) return;
    setRowSelection(prev => ({
      ...prev,
      [locationId]: !prev[locationId]
    }));
  };

  const allSelected = data.length > 0 && data.every(item => rowSelection[item.id]);

  const handleSelectAll = (checked: boolean) => {
    if (!setRowSelection) return;
    if (checked) {
      const newSelection: RowSelectionState = {};
      data.forEach(item => {
        newSelection[item.id] = true;
      });
      setRowSelection(newSelection);
    } else {
      setRowSelection({});
    }
  };
  
  // Generate location options for filters
  const locationOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Locations' }];
    const sortedLocations = [...data].sort((a, b) => {
      const orgA = organizationMap[a.organization_id]?.name || '';
      const orgB = organizationMap[b.organization_id]?.name || '';
      if (orgA !== orgB) return orgA.localeCompare(orgB);
      return a.location_name.localeCompare(b.location_name);
    });
    
    sortedLocations.forEach(location => {
      const org = organizationMap[location.organization_id];
      options.push({
        value: location.id,
        label: `${location.location_name} (${location.location_number}) - ${org?.name || 'Unknown Org'}`
      });
    });
    
    return options;
  }, [data, organizationMap]);

  const handleExport = (format: 'csv' | 'excel') => {
    onExport(format);
  };

  // Helper to check if filters are active
  const hasFilters = useMemo(() => {
    return !!(
      (filters.search && filters.search.trim()) ||
      (filters.organization_id && filters.organization_id !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      (filters.location_ids && filters.location_ids.length > 0)
    );
  }, [filters]);

  // Render table content
  const renderTableContent = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No locations</h3>
          <p className="mt-1 text-sm text-gray-500">
            No partner locations found matching your criteria.
          </p>
        </div>
      );
    }

    if (viewMode === 'card' || isMobile) {
      return (
        <div className={cn(
          "grid gap-4 p-4",
          !isMobile && "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
        )}>
          {data.map((location) => {
            const org = organizationMap[location.organization_id];
            
            return (
              <MobileTableCard
                key={location.id}
                title={location.location_name}
                subtitle={`#${location.location_number} - ${org?.name || 'Unknown Org'}`}
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
                onClick={() => !bulkMode && handleLocationClick(location)}
              />
            );
          })}
        </div>
      );
    }

    // Table view for desktop
    return (
      <ResponsiveTableContainer>
        <Table className="admin-table">
          <TableHeader>
            <TableRow>
              {bulkMode && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
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
                  onClick={() => !bulkMode && handleLocationClick(location)}
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
    );
  };

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
                  onClick={() => !bulkMode && handleLocationClick(location)}
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
      <div className="border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Locations</h2>
            <ViewModeSwitcher
              value={viewMode}
              onValueChange={setViewMode}
              allowedModes={allowedModes}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <SmartSearchInput
              placeholder="Search locations, addresses..."
              value={filters.search || ''}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              storageKey="admin-partner-locations-search"
              className="max-w-xs"
            />
            
            {/* Compact Filters */}
            <CompactLocationFilters
              value={filters}
              onChange={onFiltersChange}
              onClear={onClearFilters}
              locationOptions={locationOptions}
            />
            
            <ColumnVisibilityDropdown
              columns={columnOptions}
              onToggleColumn={toggleColumn}
              onResetToDefaults={resetToDefaults}
            />
            <ExportDropdown onExport={handleExport} />
          </div>
        </div>
      </div>

      {/* Desktop Content */}
      {isLoading ? (
        <EnhancedTableSkeleton rows={10} columns={8} />
      ) : (
        renderTableContent()
      )}
    </Card>
  );
}